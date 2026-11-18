import { afterAll, afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createTestDb } from './helpers/db';
import {
  clearTables,
  createFullRegistry,
  createTestEngine,
  seedTask,
  until,
} from './helpers/engine';

const db = createTestDb();
const { registry, test } = createFullRegistry(db.prisma);
const engines: { stop(): Promise<void> }[] = [];

beforeEach(async () => {
  await clearTables(db.prisma);
  test.state.sideEffectCalls = 0;
});
afterEach(async () => {
  await Promise.all(engines.splice(0).map((e) => e.stop()));
});
afterAll(() => db.cleanup());

const row = (id: number) => db.prisma.task.findUniqueOrThrow({ where: { id } });

async function startEngine() {
  const engine = createTestEngine(db.prisma, registry);
  engines.push(engine);
  await engine.start();
  return engine;
}

describe('restart recovery', () => {
  it('re-runs an interrupted idempotent task', async () => {
    const { taskId } = await seedTask(db.prisma, {
      type: 'system.echo',
      input: { message: 'hi' },
      status: 'RUNNING',
      attempts: 1,
      leaseOwner: 'dead',
    });
    await startEngine();
    const done = await until(async () => {
      const r = await row(taskId);
      return r.status === 'COMPLETED' ? r : false;
    });
    expect(done.attempts).toBe(2);
  });

  it('fails an interrupted non-idempotent task without calling the handler', async () => {
    const { taskId } = await seedTask(db.prisma, {
      type: 'test.side-effect',
      status: 'RUNNING',
      attempts: 1,
      leaseOwner: 'dead',
    });
    await startEngine();
    const r = await row(taskId);
    expect(r.status).toBe('FAILED');
    expect(JSON.parse(r.error ?? '{}')).toMatchObject({ code: 'INTERRUPTED' });
    expect(test.state.sideEffectCalls).toBe(0);
  });

  it('fails an interrupted task whose attempts are exhausted', async () => {
    const { taskId } = await seedTask(db.prisma, {
      type: 'system.echo',
      input: { message: 'hi' },
      status: 'RUNNING',
      attempts: 3,
      maxAttempts: 3,
      leaseOwner: 'dead',
    });
    await startEngine();
    expect((await row(taskId)).status).toBe('FAILED');
  });

  it('cancels an interrupted task that had a cancel request', async () => {
    const { taskId } = await seedTask(db.prisma, {
      type: 'system.echo',
      input: { message: 'hi' },
      status: 'RUNNING',
      attempts: 1,
      leaseOwner: 'dead',
      cancelRequestedAt: new Date(),
    });
    await startEngine();
    expect((await row(taskId)).status).toBe('CANCELLED');
  });

  it('leaves COMPLETED tasks alone and writes one engine.recover audit event', async () => {
    const done = await seedTask(db.prisma, {
      type: 'test.side-effect',
      status: 'COMPLETED',
      attempts: 1,
    });
    await seedTask(db.prisma, {
      type: 'test.side-effect',
      status: 'RUNNING',
      attempts: 1,
      leaseOwner: 'dead',
    });
    await startEngine();
    expect((await row(done.taskId)).status).toBe('COMPLETED');
    expect(test.state.sideEffectCalls).toBe(0);
    const audits = await db.prisma.auditEvent.findMany({ where: { action: 'engine.recover' } });
    expect(audits).toHaveLength(1);
    expect(JSON.parse(audits[0]?.detail ?? '{}')).toMatchObject({ recovered: 1, failed: 1 });
  });
});
