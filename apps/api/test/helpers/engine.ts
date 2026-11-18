import type { TaskStatus } from '@jobintel/contracts';
import type { EngineConfig } from '../../src/config';
import type { PrismaClient } from '../../src/db';
import { createEngine, type Engine } from '../../src/engine/engine';
import { createDefaultRegistry, createRegistry, type Registry } from '../../src/engine/handlers';
import { createTestHandlers } from './handlers';

export const TEST_CONFIG: Partial<EngineConfig> = {
  concurrency: 2,
  pollMs: 20,
  leaseMs: 300,
  heartbeatMs: 50,
  graceMs: 100,
  retryBaseMs: 10,
  shutdownTimeoutMs: 1000,
};

/** Default demo handlers plus the test-only ones. */
export function createFullRegistry(prisma: PrismaClient) {
  const test = createTestHandlers();
  const defaults = createDefaultRegistry({ prisma, apiBaseUrl: 'http://127.0.0.1:1' });
  const registry: Registry = createRegistry([...defaults.values(), ...test.handlers]);
  return { registry, test };
}

export function createTestEngine(
  prisma: PrismaClient,
  registry: Registry,
  config: Partial<EngineConfig> = {},
  instanceId?: string,
): Engine {
  return createEngine({ prisma, registry, config: { ...TEST_CONFIG, ...config }, instanceId });
}

/** Poll until `fn` returns a truthy value. */
export async function until<T>(fn: () => Promise<T | false | null | undefined>, timeoutMs = 5000) {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const value = await fn();
    if (value) return value;
    if (Date.now() > deadline) throw new Error('until: timed out');
    await new Promise((r) => setTimeout(r, 10));
  }
}

export async function clearTables(prisma: PrismaClient): Promise<void> {
  await prisma.executionEvent.deleteMany();
  await prisma.taskDependency.deleteMany();
  await prisma.task.deleteMany();
  await prisma.plan.deleteMany();
  await prisma.systemState.deleteMany();
  await prisma.auditEvent.deleteMany();
}

export interface PlanTask {
  key: string;
  type: string;
  input?: unknown;
  dependsOn?: string[];
  maxAttempts?: number;
  timeoutMs?: number;
  priority?: number;
}

export async function makePlan(engine: Engine, tasks: PlanTask[]): Promise<number> {
  const result = await engine.createPlan({ tasks: tasks.map((t) => ({ input: {}, ...t })) });
  if (!result.ok) throw new Error(`plan invalid: ${JSON.stringify(result.errors)}`);
  if (result.outcome.kind !== 'created') throw new Error('plan not created');
  return result.outcome.planId;
}

export async function taskByKey(prisma: PrismaClient, planId: number, key: string) {
  return prisma.task.findFirstOrThrow({ where: { planId, key } });
}

export async function waitForStatus(
  prisma: PrismaClient,
  planId: number,
  key: string,
  status: TaskStatus,
  timeoutMs = 5000,
) {
  return until(async () => {
    const row = await taskByKey(prisma, planId, key);
    return row.status === status ? row : false;
  }, timeoutMs);
}

export async function seedTask(
  prisma: PrismaClient,
  data: {
    type: string;
    input?: unknown;
    status: TaskStatus;
    attempts?: number;
    maxAttempts?: number;
    leaseOwner?: string;
    cancelRequestedAt?: Date;
  },
): Promise<{ planId: number; taskId: number }> {
  const plan = await prisma.plan.create({ data: { status: 'ACTIVE' } });
  const task = await prisma.task.create({
    data: {
      planId: plan.id,
      key: 'seed',
      type: data.type,
      status: data.status,
      priority: 5,
      input: JSON.stringify(data.input ?? {}),
      attempts: data.attempts ?? 0,
      maxAttempts: data.maxAttempts ?? 3,
      timeoutMs: 5000,
      idempotencyKey: `${plan.id}:seed`,
      leaseOwner: data.leaseOwner ?? null,
      leaseExpiresAt: data.leaseOwner ? new Date(Date.now() + 60_000) : null,
      cancelRequestedAt: data.cancelRequestedAt ?? null,
      startedAt: data.status === 'RUNNING' ? new Date() : null,
    },
  });
  return { planId: plan.id, taskId: task.id };
}
