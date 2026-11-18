import { afterAll, afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { Engine } from '../src/engine/engine';
import { createTestDb } from './helpers/db';
import {
  clearTables,
  createFullRegistry,
  createTestEngine,
  makePlan,
  taskByKey,
  until,
  waitForStatus,
} from './helpers/engine';

const db = createTestDb();
const { registry, test } = createFullRegistry(db.prisma);
let engine: Engine;

beforeEach(async () => {
  await clearTables(db.prisma);
  test.state.flakyCalls.clear();
  test.state.sideEffectCalls = 0;
  engine = createTestEngine(db.prisma, registry);
  await engine.start();
});
afterEach(() => engine.stop());
afterAll(() => db.cleanup());

const planStatus = async (planId: number) =>
  (await db.prisma.plan.findUniqueOrThrow({ where: { id: planId } })).status;

describe('dependencies', () => {
  it('runs a diamond in dependency order and completes the plan', async () => {
    const planId = await makePlan(engine, [
      { key: 'hello', type: 'system.echo', input: { message: 'hello' } },
      { key: 'wait-a', type: 'system.delay', input: { ms: 100 }, dependsOn: ['hello'] },
      { key: 'wait-b', type: 'system.delay', input: { ms: 50 }, dependsOn: ['hello'] },
      {
        key: 'check',
        type: 'system.echo',
        input: { message: 'x' },
        dependsOn: ['wait-a', 'wait-b'],
      },
    ]);
    await until(async () => (await planStatus(planId)) === 'COMPLETED');
    const [a, b, check] = await Promise.all(
      ['wait-a', 'wait-b', 'check'].map((k) => taskByKey(db.prisma, planId, k)),
    );
    const checkStart = check?.startedAt?.getTime() ?? 0;
    expect(checkStart).toBeGreaterThanOrEqual(a?.completedAt?.getTime() ?? Infinity);
    expect(checkStart).toBeGreaterThanOrEqual(b?.completedAt?.getTime() ?? Infinity);
  });

  it('fails a task, cancels its transitive dependents, and keeps independent branches', async () => {
    const planId = await makePlan(engine, [
      { key: 'bad', type: 'test.fail' },
      { key: 'mid', type: 'system.echo', input: { message: 'm' }, dependsOn: ['bad'] },
      { key: 'end', type: 'system.echo', input: { message: 'e' }, dependsOn: ['mid'] },
      { key: 'other', type: 'system.echo', input: { message: 'o' } },
    ]);
    await until(async () => (await planStatus(planId)) === 'FAILED');
    expect((await taskByKey(db.prisma, planId, 'bad')).status).toBe('FAILED');
    expect((await taskByKey(db.prisma, planId, 'other')).status).toBe('COMPLETED');
    for (const key of ['mid', 'end']) {
      const row = await taskByKey(db.prisma, planId, key);
      expect(row.status).toBe('CANCELLED');
      expect(JSON.parse(row.error ?? '{}')).toMatchObject({ code: 'DEPENDENCY_FAILED' });
    }
  });

  it('fails invalid stored input with INVALID_INPUT and never retries it', async () => {
    const stopped = createTestEngine(db.prisma, registry);
    const planId = await makePlan(stopped, [
      { key: 'a', type: 'system.echo', input: { message: 'ok' } },
    ]);
    await db.prisma.task.updateMany({ where: { planId }, data: { input: '{"message":5}' } });
    await stopped.start();
    try {
      const row = await waitForStatus(db.prisma, planId, 'a', 'FAILED');
      expect(JSON.parse(row.error ?? '{}')).toMatchObject({ code: 'INVALID_INPUT' });
      expect(row.attempts).toBe(1);
    } finally {
      await stopped.stop();
    }
  });
});

describe('retries and timeouts', () => {
  it('retries a flaky task until it succeeds', async () => {
    const planId = await makePlan(engine, [
      { key: 'f', type: 'test.flaky', input: { failTimes: 2 }, maxAttempts: 3 },
    ]);
    const row = await waitForStatus(db.prisma, planId, 'f', 'COMPLETED');
    expect(row.attempts).toBe(3);
  });

  it('fails once attempts are exhausted', async () => {
    const planId = await makePlan(engine, [
      { key: 'f', type: 'test.flaky', input: { failTimes: 5 }, maxAttempts: 3 },
    ]);
    const row = await waitForStatus(db.prisma, planId, 'f', 'FAILED');
    expect(row.attempts).toBe(3);
  });

  it('does not retry a non-idempotent handler that throws a plain error', async () => {
    const planId = await makePlan(engine, [
      { key: 's', type: 'test.side-effect', input: { fail: true }, maxAttempts: 3 },
    ]);
    const row = await waitForStatus(db.prisma, planId, 's', 'FAILED');
    expect(row.attempts).toBe(1);
    expect(JSON.parse(row.error ?? '{}')).toMatchObject({ code: 'HANDLER_ERROR' });
  });

  it('times out a slow idempotent task, retries up to the maximum, then fails', async () => {
    const planId = await makePlan(engine, [
      { key: 'slow', type: 'system.delay', input: { ms: 1000 }, timeoutMs: 100, maxAttempts: 2 },
    ]);
    const row = await waitForStatus(db.prisma, planId, 'slow', 'FAILED');
    expect(row.attempts).toBe(2);
    expect(JSON.parse(row.error ?? '{}')).toMatchObject({ code: 'TIMEOUT' });
  });
});
