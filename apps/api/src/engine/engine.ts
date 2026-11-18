import { randomUUID } from 'node:crypto';
import type { SystemStatus, Task } from '@jobintel/contracts';
import { DEFAULT_ENGINE_CONFIG, type EngineConfig } from '../config';
import type { PrismaClient } from '../db';
import { createEventBus, type EventBus } from './event-bus';
import type { Registry } from './handlers';
import { validatePlan, type PlanError } from './plan-validation';
import { createRepository, type CreatePlanOutcome } from './repository';
import { createScheduler } from './scheduler';

export type CancelResult =
  | { kind: 'not-found' }
  | { kind: 'cancelled' | 'already-cancelled' | 'requested' | 'conflict'; task: Task };

export type CreatePlanResult =
  { ok: false; errors: PlanError[] } | { ok: true; outcome: CreatePlanOutcome };

export interface EngineDeps {
  prisma: PrismaClient;
  registry: Registry;
  config?: Partial<EngineConfig>;
  instanceId?: string;
  bus?: EventBus;
}

export function createEngine(deps: EngineDeps) {
  const config: EngineConfig = { ...DEFAULT_ENGINE_CONFIG, ...deps.config };
  const instanceId = deps.instanceId ?? randomUUID();
  const bus = deps.bus ?? createEventBus();
  const repo = createRepository(deps.prisma, bus);
  const { registry } = deps;
  const scheduler = createScheduler({ repo, registry, config, instanceId });

  async function cancelTask(id: number): Promise<CancelResult> {
    for (let attempt = 0; attempt < 3; attempt++) {
      const row = await repo.getTaskRow(id);
      if (!row) return { kind: 'not-found' };
      const dto = async () => (await repo.getTask(id)) as Task;
      switch (row.status) {
        case 'CANCELLED':
          return { kind: 'already-cancelled', task: await dto() };
        case 'COMPLETED':
        case 'FAILED':
          return { kind: 'conflict', task: await dto() };
        case 'RUNNING':
          if (await repo.requestCancel(id)) {
            scheduler.abortTask(id, 'cancel');
            await repo.audit({ actor: 'user', action: 'task.cancel', target: `task:${id}` });
            return { kind: 'requested', task: await dto() };
          }
          break;
        default:
          if (
            await repo.transition({
              taskId: id,
              from: row.status as 'PENDING' | 'BLOCKED' | 'QUEUED' | 'RETRYING',
              to: 'CANCELLED',
              error: { code: 'CANCELLED', message: 'cancelled' },
            })
          ) {
            await repo.audit({ actor: 'user', action: 'task.cancel', target: `task:${id}` });
            scheduler.wake();
            return { kind: 'cancelled', task: await dto() };
          }
      }
    }
    const task = await repo.getTask(id);
    return task ? { kind: 'conflict', task } : { kind: 'not-found' };
  }

  async function status(): Promise<SystemStatus> {
    return {
      paused: await repo.isPaused(),
      concurrency: config.concurrency,
      active: scheduler.activeCount(),
      counts: await repo.statusCounts(),
      lastEventId: await repo.lastEventId(),
    };
  }

  return {
    bus,
    instanceId,
    config,

    /** Recover tasks abandoned by a previous process, then start the scheduler loop. */
    async start(): Promise<void> {
      await repo.ensureSystemState();
      const recovered = await repo.recoverAbandoned({ instanceId, atStartup: true, registry });
      if (recovered.recovered > 0) {
        await repo.audit({ actor: 'system', action: 'engine.recover', detail: recovered });
      }
      scheduler.start();
    },

    stop: () => scheduler.stop(),
    wake: () => scheduler.wake(),

    async pause(): Promise<boolean> {
      return repo.setPaused(true);
    },

    async resume(): Promise<boolean> {
      const changed = await repo.setPaused(false);
      scheduler.wake();
      return changed;
    },

    cancelTask,
    status,

    async createPlan(
      spec: unknown,
      idempotencyKey?: string,
      requestHash?: string,
    ): Promise<CreatePlanResult> {
      const validated = validatePlan(spec, registry);
      if (!validated.ok) return validated;
      const outcome = await repo.createPlan(validated.plan, idempotencyKey, requestHash);
      if (outcome.kind === 'created') scheduler.wake();
      return { ok: true, outcome };
    },

    getTask: repo.getTask,
    listTasks: repo.listTasks,
    getPlan: repo.getPlan,
    listPlans: repo.listPlans,
    taskEvents: repo.taskEvents,
    eventsAfter: repo.eventsAfter,
    lastEventId: repo.lastEventId,
  };
}

export type Engine = ReturnType<typeof createEngine>;
