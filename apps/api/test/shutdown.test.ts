import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { createTestDb } from './helpers/db';
import {
  clearTables,
  createFullRegistry,
  createTestEngine,
  makePlan,
  seedTask,
  waitForStatus,
} from './helpers/engine';

const db = createTestDb();
const { registry, test } = createFullRegistry(db.prisma);

beforeEach(async () => {
  await clearTables(db.prisma);
  test.state.sideEffectCalls = 0;
});
afterAll(() => db.cleanup());

describe('graceful shutdown', () => {
  it('lets a task finish within the timeout', async () => {
    const engine = createTestEngine(db.prisma, registry, { shutdownTimeoutMs: 1000 });
    await engine.start();
    const planId = await makePlan(engine, [{ key: 'w', type: 'test.wait', input: { name: 'g1' } }]);
    await waitForStatus(db.prisma, planId, 'w', 'RUNNING');
    setTimeout(() => test.release('g1'), 50);
    await engine.stop();
    expect((await waitForStatus(db.prisma, planId, 'w', 'COMPLETED')).attempts).toBe(1);
  });

  it('aborts an idempotent task after the timeout and leaves it RETRYING', async () => {
    const engine = createTestEngine(db.prisma, registry, { shutdownTimeoutMs: 100 });
    await engine.start();
    const planId = await makePlan(engine, [
      { key: 'd', type: 'system.delay', input: { ms: 5000 } },
    ]);
    await waitForStatus(db.prisma, planId, 'd', 'RUNNING');
    const started = Date.now();
    await engine.stop();
    expect(Date.now() - started).toBeLessThan(100 + 100 + 200 + 500);
    await waitForStatus(db.prisma, planId, 'd', 'RETRYING', 500);
  });

  it('fails a non-idempotent task as INTERRUPTED', async () => {
    const engine = createTestEngine(db.prisma, registry, { shutdownTimeoutMs: 100 });
    await engine.start();
    const planId = await makePlan(engine, [
      { key: 's', type: 'test.side-effect', input: { block: 'never' } },
    ]);
    await waitForStatus(db.prisma, planId, 's', 'RUNNING');
    await engine.stop();
    const row = await waitForStatus(db.prisma, planId, 's', 'FAILED', 500);
    expect(JSON.parse(row.error ?? '{}')).toMatchObject({ code: 'INTERRUPTED' });
  });

  it('settles a non-cooperative task that ignores the abort', async () => {
    const engine = createTestEngine(db.prisma, registry, { shutdownTimeoutMs: 50 });
    await engine.start();
    const planId = await makePlan(engine, [
      { key: 'w', type: 'test.wait', input: { name: 'g2', cooperative: false } },
    ]);
    await waitForStatus(db.prisma, planId, 'w', 'RUNNING');
    const started = Date.now();
    await engine.stop();
    expect(Date.now() - started).toBeLessThan(50 + 100 + 200 + 500);
    await waitForStatus(db.prisma, planId, 'w', 'RETRYING', 500);
    test.release('g2');
  });

  it('claims nothing once stop() has begun', async () => {
    const engine = createTestEngine(db.prisma, registry);
    await engine.start();
    await engine.stop();
    const { taskId } = await seedTask(db.prisma, { type: 'system.echo', status: 'QUEUED' });
    engine.wake();
    await new Promise((r) => setTimeout(r, 200));
    const row = await db.prisma.task.findUniqueOrThrow({ where: { id: taskId } });
    expect(row.status).toBe('QUEUED');
  });
});
