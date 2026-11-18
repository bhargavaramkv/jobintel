import {
  TASK_STATUSES,
  taskStatusSchema,
  type ExecutionEvent,
  type Plan,
  type PlanStatus,
  type PlanSummary,
  type Task,
  type TaskStatus,
} from '@jobintel/contracts';
import type { PrismaClient } from '../db';
import type {
  ExecutionEvent as EventRow,
  Plan as PlanRow,
  Prisma,
  Task as TaskRow,
} from '../generated/prisma/client';
import type { EventBus } from './event-bus';
import type { Registry } from './handlers';
import type { NormalizedPlan } from './plan-validation';
import {
  assertTransition,
  decideInterrupted,
  derivePlanStatus,
  isTerminal,
  type TaskErrorInfo,
} from './state-machine';

type Tx = Prisma.TransactionClient;

export interface Fence {
  leaseOwner: string;
  attempts: number;
}

export interface TransitionArgs {
  taskId: number;
  from: TaskStatus;
  to: TaskStatus;
  fence?: Fence;
  patch?: Omit<Prisma.TaskUpdateManyMutationInput, 'status'>;
  result?: unknown;
  error?: TaskErrorInfo;
}

export type CreatePlanOutcome =
  { kind: 'created'; planId: number } | { kind: 'replayed'; planId: number } | { kind: 'conflict' };

export type TaskWithDeps = TaskRow & { dependsOn: { dependsOnId: number }[] };

const withDeps = { dependsOn: { select: { dependsOnId: true } } } as const;

const taskStatus = (s: string): TaskStatus => taskStatusSchema.parse(s);

function emptyCounts(): Record<TaskStatus, number> {
  return Object.fromEntries(TASK_STATUSES.map((s) => [s, 0])) as Record<TaskStatus, number>;
}

async function appendEvent(
  tx: Tx,
  e: { type: string; planId?: number; taskId?: number; data: Record<string, unknown> },
): Promise<void> {
  await tx.executionEvent.create({
    data: {
      type: e.type,
      planId: e.planId ?? null,
      taskId: e.taskId ?? null,
      data: JSON.stringify(e.data),
    },
  });
}

async function audit(
  tx: Tx,
  e: { actor: string; action: string; target?: string; detail?: Record<string, unknown> },
): Promise<void> {
  await tx.auditEvent.create({
    data: {
      actor: e.actor,
      action: e.action,
      target: e.target ?? null,
      outcome: 'ok',
      detail: e.detail ? JSON.stringify(e.detail) : null,
    },
  });
}

/**
 * The single place that writes Task.status and Plan.status (besides creation in createPlan).
 * Returns false when the task is no longer in `from` (or the fence no longer matches).
 */
export async function transitionTask(tx: Tx, args: TransitionArgs): Promise<boolean> {
  const { taskId, from, to, fence } = args;
  assertTransition(from, to);
  const res = await tx.task.updateMany({
    where: { id: taskId, status: from, ...fence },
    data: {
      ...(to === 'RUNNING' ? {} : { leaseOwner: null, leaseExpiresAt: null }),
      ...(isTerminal(to) ? { completedAt: new Date() } : {}),
      ...(to === 'COMPLETED' ? { error: null } : {}),
      ...args.patch,
      ...(args.error ? { error: JSON.stringify(args.error) } : {}),
      ...(args.result !== undefined ? { result: JSON.stringify(args.result) } : {}),
      status: to,
    },
  });
  if (res.count !== 1) return false;

  const task = await tx.task.findUniqueOrThrow({ where: { id: taskId } });
  await appendEvent(tx, {
    type: 'task.status',
    planId: task.planId,
    taskId,
    data: {
      key: task.key,
      from,
      to,
      attempt: task.attempts,
      ...(task.error ? { error: JSON.parse(task.error) as unknown } : {}),
    },
  });
  if (to === 'FAILED' || to === 'CANCELLED') await cascade(tx, task);
  await refreshPlan(tx, task.planId);
  return true;
}

/** Every non-terminal dependent of a failed or cancelled task becomes CANCELLED (recursively). */
async function cascade(tx: Tx, task: TaskRow): Promise<void> {
  const dependents = await tx.taskDependency.findMany({
    where: { dependsOnId: task.id },
    select: { task: { select: { id: true, status: true } } },
  });
  for (const { task: dep } of dependents) {
    const status = taskStatus(dep.status);
    if (status !== 'PENDING' && status !== 'BLOCKED') continue;
    await transitionTask(tx, {
      taskId: dep.id,
      from: status,
      to: 'CANCELLED',
      error: {
        code: 'DEPENDENCY_FAILED',
        message: `dependency ${task.key} (#${task.id}) ended ${task.status}`,
      },
    });
  }
}

async function refreshPlan(tx: Tx, planId: number): Promise<void> {
  const tasks = await tx.task.findMany({ where: { planId }, select: { status: true } });
  const derived = derivePlanStatus(tasks.map((t) => taskStatus(t.status)));
  const plan = await tx.plan.findUniqueOrThrow({ where: { id: planId } });
  if (plan.status === derived) return;
  await tx.plan.update({
    where: { id: planId },
    data: { status: derived, completedAt: derived === 'ACTIVE' ? null : new Date() },
  });
  await appendEvent(tx, {
    type: 'plan.status',
    planId,
    data: { from: plan.status, to: derived },
  });
}

export function toTaskDto(row: TaskWithDeps): Task {
  return {
    id: row.id,
    planId: row.planId,
    key: row.key,
    type: row.type,
    status: taskStatus(row.status),
    priority: row.priority,
    attempts: row.attempts,
    maxAttempts: row.maxAttempts,
    timeoutMs: row.timeoutMs,
    input: JSON.parse(row.input) as unknown,
    result: row.result === null ? null : (JSON.parse(row.result) as unknown),
    error: row.error === null ? null : (JSON.parse(row.error) as TaskErrorInfo),
    dependsOn: row.dependsOn.map((d) => d.dependsOnId),
    cancelRequested: row.cancelRequestedAt !== null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    startedAt: row.startedAt?.toISOString() ?? null,
    completedAt: row.completedAt?.toISOString() ?? null,
  };
}

export function toPlanDto(row: PlanRow): Plan {
  return {
    id: row.id,
    name: row.name,
    status: row.status as PlanStatus,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    completedAt: row.completedAt?.toISOString() ?? null,
  };
}

export function toEventDto(row: EventRow): ExecutionEvent {
  return {
    id: row.id,
    at: row.createdAt.toISOString(),
    type: row.type as ExecutionEvent['type'],
    planId: row.planId,
    taskId: row.taskId,
    data: JSON.parse(row.data) as Record<string, unknown>,
  };
}

export function createRepository(prisma: PrismaClient, bus: EventBus) {
  async function write<T>(fn: (tx: Tx) => Promise<T>): Promise<T> {
    const result = await prisma.$transaction(fn);
    bus.notify();
    return result;
  }

  async function transition(args: TransitionArgs): Promise<boolean> {
    return write((tx) => transitionTask(tx, args));
  }

  async function createPlanOnce(
    plan: NormalizedPlan,
    idempotencyKey: string | undefined,
    requestHash: string | undefined,
  ): Promise<number> {
    return write(async (tx) => {
      const created = await tx.plan.create({
        data: {
          name: plan.name ?? null,
          status: 'ACTIVE',
          idempotencyKey: idempotencyKey ?? null,
          requestHash: requestHash ?? null,
        },
      });
      const ids = new Map<string, number>();
      for (const t of plan.tasks) {
        const row = await tx.task.create({
          data: {
            planId: created.id,
            key: t.key,
            type: t.type,
            status: 'PENDING',
            priority: t.priority,
            input: JSON.stringify(t.input),
            maxAttempts: t.maxAttempts,
            timeoutMs: t.timeoutMs,
            idempotencyKey: `${created.id}:${t.key}`,
          },
        });
        ids.set(t.key, row.id);
      }
      const edges = plan.tasks.flatMap((t) =>
        t.dependsOn.map((dep) => ({
          taskId: ids.get(t.key) as number,
          dependsOnId: ids.get(dep) as number,
        })),
      );
      if (edges.length > 0) await tx.taskDependency.createMany({ data: edges });
      await appendEvent(tx, {
        type: 'plan.created',
        planId: created.id,
        data: { name: plan.name ?? null, taskCount: plan.tasks.length },
      });
      await audit(tx, {
        actor: 'user',
        action: 'plan.create',
        target: `plan:${created.id}`,
        detail: { taskCount: plan.tasks.length },
      });
      return created.id;
    });
  }

  /** Atomically claim one QUEUED task. Returns null when someone else won or it is not QUEUED. */
  async function claimTask(
    taskId: number,
    instanceId: string,
    leaseMs: number,
  ): Promise<TaskRow | null> {
    return write(async (tx) => {
      const now = new Date();
      // The first statement is a write, so the SQLite write lock is taken at once.
      const ok = await transitionTask(tx, {
        taskId,
        from: 'QUEUED',
        to: 'RUNNING',
        patch: {
          leaseOwner: instanceId,
          leaseExpiresAt: new Date(now.getTime() + leaseMs),
          attempts: { increment: 1 },
          startedAt: now,
        },
      });
      return ok ? tx.task.findUniqueOrThrow({ where: { id: taskId } }) : null;
    });
  }

  /** Apply `decideInterrupted` to a RUNNING row, fenced against its current owner. */
  async function interruptTask(
    row: TaskRow,
    registry: Registry,
  ): Promise<'retried' | 'failed' | 'cancelled' | null> {
    const handler = registry.get(row.type);
    const d = decideInterrupted({
      cancelRequested: row.cancelRequestedAt !== null,
      handlerRegistered: handler !== undefined,
      idempotent: handler?.idempotent ?? false,
      attempts: row.attempts,
      maxAttempts: row.maxAttempts,
    });
    const ok = await transition({
      taskId: row.id,
      from: 'RUNNING',
      to: d.to,
      fence: { leaseOwner: row.leaseOwner ?? '', attempts: row.attempts },
      ...('error' in d ? { error: d.error } : { patch: { availableAt: new Date() } }),
    });
    if (!ok) return null;
    return d.to === 'RETRYING' ? 'retried' : d.to === 'FAILED' ? 'failed' : 'cancelled';
  }

  return {
    transition,
    claimTask,
    interruptTask,

    async ensureSystemState(): Promise<boolean> {
      const row = await prisma.systemState.upsert({
        where: { id: 1 },
        create: { id: 1 },
        update: {},
      });
      return row.paused;
    },

    async audit(e: Parameters<typeof audit>[1]): Promise<void> {
      await prisma.$transaction((tx) => audit(tx, e));
    },

    /** Idempotent on `idempotencyKey`: same hash replays the original plan, another hash conflicts. */
    async createPlan(
      plan: NormalizedPlan,
      idempotencyKey?: string,
      requestHash?: string,
    ): Promise<CreatePlanOutcome> {
      const existing = async (): Promise<CreatePlanOutcome | null> => {
        if (!idempotencyKey) return null;
        const row = await prisma.plan.findUnique({ where: { idempotencyKey } });
        if (!row) return null;
        return row.requestHash === (requestHash ?? null)
          ? { kind: 'replayed', planId: row.id }
          : { kind: 'conflict' };
      };
      const before = await existing();
      if (before) return before;
      try {
        return { kind: 'created', planId: await createPlanOnce(plan, idempotencyKey, requestHash) };
      } catch (err) {
        if ((err as { code?: string }).code === 'P2002') {
          const after = await existing();
          if (after) return after;
        }
        throw err;
      }
    },

    async claimQueued(instanceId: string, leaseMs: number, slots: number): Promise<TaskRow[]> {
      if (slots <= 0) return [];
      const candidates = await prisma.task.findMany({
        where: { status: 'QUEUED' },
        orderBy: [{ priority: 'desc' }, { id: 'asc' }],
        take: slots,
        select: { id: true },
      });
      const claimed: TaskRow[] = [];
      for (const { id } of candidates) {
        const row = await claimTask(id, instanceId, leaseMs);
        if (row) claimed.push(row);
      }
      return claimed;
    },

    /** Extend the lease. `ok` is false when the fence no longer matches (lease lost). */
    async heartbeat(
      taskId: number,
      fence: Fence,
      leaseMs: number,
    ): Promise<{ ok: boolean; cancelRequested: boolean }> {
      const res = await prisma.task.updateMany({
        where: { id: taskId, status: 'RUNNING', ...fence },
        data: { leaseExpiresAt: new Date(Date.now() + leaseMs) },
      });
      if (res.count !== 1) return { ok: false, cancelRequested: false };
      const row = await prisma.task.findUnique({
        where: { id: taskId },
        select: { cancelRequestedAt: true },
      });
      return { ok: true, cancelRequested: row?.cancelRequestedAt != null };
    },

    /** Flag a RUNNING task for cancellation without changing its status. */
    async requestCancel(taskId: number): Promise<boolean> {
      const res = await prisma.task.updateMany({
        where: { id: taskId, status: 'RUNNING' },
        data: { cancelRequestedAt: new Date() },
      });
      return res.count === 1;
    },

    /** Returns true when the state changed. Idempotent. */
    async setPaused(paused: boolean): Promise<boolean> {
      return write(async (tx) => {
        const current = await tx.systemState.findUnique({ where: { id: 1 } });
        if (current?.paused === paused) return false;
        await tx.systemState.upsert({
          where: { id: 1 },
          create: { id: 1, paused },
          update: { paused },
        });
        await appendEvent(tx, { type: 'system.status', data: { paused } });
        await audit(tx, {
          actor: 'user',
          action: paused ? 'system.pause' : 'system.resume',
          target: 'system',
        });
        return true;
      });
    },

    async requeueRetrying(now: Date): Promise<number> {
      const due = await prisma.task.findMany({
        where: { status: 'RETRYING', availableAt: { lte: now } },
        select: { id: true, cancelRequestedAt: true },
      });
      let n = 0;
      for (const { id, cancelRequestedAt } of due) {
        // A cancel accepted while the attempt was RUNNING must not be undone by a retry.
        const args: TransitionArgs = cancelRequestedAt
          ? {
              taskId: id,
              from: 'RETRYING',
              to: 'CANCELLED',
              error: { code: 'CANCELLED', message: 'cancelled' },
            }
          : { taskId: id, from: 'RETRYING', to: 'QUEUED' };
        if (await transition(args)) n++;
      }
      return n;
    },

    /** PENDING/BLOCKED tasks become QUEUED, BLOCKED, or CANCELLED depending on their dependencies. */
    async resolveDependencies(): Promise<number> {
      const rows = await prisma.task.findMany({
        where: { status: { in: ['PENDING', 'BLOCKED'] } },
        select: {
          id: true,
          status: true,
          dependsOn: { select: { dependsOn: { select: { key: true, id: true, status: true } } } },
        },
      });
      let n = 0;
      for (const row of rows) {
        const from = taskStatus(row.status);
        const deps = row.dependsOn.map((d) => d.dependsOn);
        const dead = deps.find((d) => d.status === 'FAILED' || d.status === 'CANCELLED');
        if (dead) {
          const error = {
            code: 'DEPENDENCY_FAILED',
            message: `dependency ${dead.key} (#${dead.id}) ended ${dead.status}`,
          };
          if (await transition({ taskId: row.id, from, to: 'CANCELLED', error })) n++;
        } else if (deps.every((d) => d.status === 'COMPLETED')) {
          if (await transition({ taskId: row.id, from, to: 'QUEUED' })) n++;
        } else if (from === 'PENDING') {
          if (await transition({ taskId: row.id, from, to: 'BLOCKED' })) n++;
        }
      }
      return n;
    },

    /** RUNNING tasks owned by another instance: all of them at startup, else those past their lease. */
    async recoverAbandoned(args: {
      instanceId: string;
      atStartup: boolean;
      registry: Registry;
      now?: Date;
      /** Ids this instance is executing; its other expired RUNNING rows are recovered too. */
      activeIds?: number[];
    }): Promise<{ recovered: number; retried: number; failed: number; cancelled: number }> {
      const rows = await prisma.task.findMany({
        where: {
          status: 'RUNNING',
          ...(args.atStartup || !args.activeIds
            ? { leaseOwner: { not: args.instanceId } }
            : {
                OR: [
                  { leaseOwner: { not: args.instanceId } },
                  { leaseOwner: args.instanceId, id: { notIn: args.activeIds } },
                ],
              }),
          ...(args.atStartup ? {} : { leaseExpiresAt: { lt: args.now ?? new Date() } }),
        },
      });
      const out = { recovered: 0, retried: 0, failed: 0, cancelled: 0 };
      for (const row of rows) {
        const result = await interruptTask(row, args.registry);
        if (!result) continue;
        out.recovered++;
        out[result]++;
      }
      return out;
    },

    async appendLog(
      taskId: number,
      planId: number,
      level: 'info' | 'warn' | 'error',
      message: string,
    ): Promise<void> {
      await write((tx) =>
        appendEvent(tx, { type: 'task.log', planId, taskId, data: { level, message } }),
      );
    },

    async getTaskRow(id: number): Promise<TaskRow | null> {
      return prisma.task.findUnique({ where: { id } });
    },

    async runningOwnedBy(instanceId: string): Promise<TaskRow[]> {
      return prisma.task.findMany({ where: { status: 'RUNNING', leaseOwner: instanceId } });
    },

    async getTask(id: number): Promise<Task | null> {
      const row = await prisma.task.findUnique({ where: { id }, include: withDeps });
      return row ? toTaskDto(row) : null;
    },

    async listTasks(
      f: { status?: TaskStatus; planId?: number; limit?: number } = {},
    ): Promise<Task[]> {
      const rows = await prisma.task.findMany({
        where: { status: f.status, planId: f.planId },
        orderBy: { id: 'desc' },
        take: f.limit ?? 50,
        include: withDeps,
      });
      return rows.map(toTaskDto);
    },

    async getPlan(id: number): Promise<{ plan: Plan; tasks: Task[] } | null> {
      const row = await prisma.plan.findUnique({
        where: { id },
        include: { tasks: { orderBy: { id: 'asc' }, include: withDeps } },
      });
      return row ? { plan: toPlanDto(row), tasks: row.tasks.map(toTaskDto) } : null;
    },

    async listPlans(limit = 50): Promise<PlanSummary[]> {
      const plans = await prisma.plan.findMany({
        orderBy: { id: 'desc' },
        take: limit,
        include: { tasks: { select: { status: true } } },
      });
      return plans.map((p) => {
        const counts = emptyCounts();
        for (const t of p.tasks) counts[taskStatus(t.status)]++;
        return { ...toPlanDto(p), counts };
      });
    },

    async statusCounts(): Promise<Record<TaskStatus, number>> {
      const counts = emptyCounts();
      const groups = await prisma.task.groupBy({ by: ['status'], _count: { _all: true } });
      for (const g of groups) counts[taskStatus(g.status)] = g._count._all;
      return counts;
    },

    async isPaused(): Promise<boolean> {
      const row = await prisma.systemState.findUnique({ where: { id: 1 } });
      return row?.paused ?? false;
    },

    async lastEventId(): Promise<number> {
      const row = await prisma.executionEvent.findFirst({ orderBy: { id: 'desc' } });
      return row?.id ?? 0;
    },

    async eventsAfter(afterId: number, limit = 100): Promise<ExecutionEvent[]> {
      const rows = await prisma.executionEvent.findMany({
        where: { id: { gt: afterId } },
        orderBy: { id: 'asc' },
        take: limit,
      });
      return rows.map(toEventDto);
    },

    async taskEvents(taskId: number, limit = 50): Promise<ExecutionEvent[]> {
      const rows = await prisma.executionEvent.findMany({
        where: { taskId },
        orderBy: { id: 'desc' },
        take: limit,
      });
      return rows.reverse().map(toEventDto);
    },
  };
}

export type Repository = ReturnType<typeof createRepository>;
