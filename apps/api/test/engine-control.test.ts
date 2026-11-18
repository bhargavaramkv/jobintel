import { afterAll, afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { Engine } from '../src/engine/engine';
import { createTestDb } from './helpers/db';
import {
  clearTables,
  createFullRegistry,
  createTestEngine,
  makePlan,
  seedTask,
  until,
  waitForStatus,
} from './helpers/engine';

const db = createTestDb();
const { registry, test } = createFullRegistry(db.prisma);
let engine: Engine;

beforeEach(async () => {
  await clearTables(db.prisma);
  test.state.aborted.clear();
  engine = createTestEngine(db.prisma, registry);
  await engine.start();
});
afterEach(() => engine.stop());
afterAll(() => db.cleanup());

const statusOf = async (id: number) =>
  (await db.prisma.task.findUniqueOrThrow({ where: { id } })).status;

describe('cancellation', () => {
  it('cancels BLOCKED and QUEUED tasks at once and cascades to dependents', async () => {
    await engine.pause();
    const planId = await makePlan(engine, [
      { key: 'a', type: 'system.echo', input: { message: 'a' } },
      { key: 'b', type: 'system.echo', input: { message: 'b' }, dependsOn: ['a'] },
      { key: 'c', type: 'system.echo', input: { message: 'c' }, dependsOn: ['b'] },
    ]);
    const a = await waitForStatus(db.prisma, planId, 'a', 'QUEUED');
    const b = await waitForStatus(db.prisma, planId, 'b', 'BLOCKED');
    const res = await engine.cancelTask(a.id);
    expect(res.kind).toBe('cancelled');
    expect(await statusOf(b.id)).toBe('CANCELLED');
    const plan = await db.prisma.plan.findUniqueOrThrow({ where: { id: planId } });
    expect(plan.status).toBe('CANCELLED');
  });

  it('cancels a RETRYING task at once', async () => {
    const { taskId } = await seedTask(db.prisma, { type: 'system.echo', status: 'RETRYING' });
    await db.prisma.task.update({
      where: { id: taskId },
      data: { availableAt: new Date(Date.now() + 60_000) },
    });
    expect((await engine.cancelTask(taskId)).kind).toBe('cancelled');
    expect(await statusOf(taskId)).toBe('CANCELLED');
  });

  it('cancels a RUNNING cooperative task: requested first, then CANCELLED', async () => {
    const planId = await makePlan(engine, [
      { key: 'd', type: 'system.delay', input: { ms: 5000 } },
    ]);
    const running = await waitForStatus(db.prisma, planId, 'd', 'RUNNING');
    const started = Date.now();
    const res = await engine.cancelTask(running.id);
    expect(res.kind).toBe('requested');
    await until(async () => (await statusOf(running.id)) === 'CANCELLED', 2000);
    expect(Date.now() - started).toBeLessThan(1000);
  });

  it('cancels a non-cooperative RUNNING task after the grace period', async () => {
    const planId = await makePlan(engine, [
      { key: 'w', type: 'test.wait', input: { name: 'stuck', cooperative: false } },
    ]);
    const running = await waitForStatus(db.prisma, planId, 'w', 'RUNNING');
    await engine.cancelTask(running.id);
    await until(async () => (await statusOf(running.id)) === 'CANCELLED', 2000);
    test.release('stuck');
  });

  it('refuses COMPLETED tasks and treats CANCELLED as a no-op', async () => {
    const planId = await makePlan(engine, [
      { key: 'a', type: 'system.echo', input: { message: 'a' } },
    ]);
    const done = await waitForStatus(db.prisma, planId, 'a', 'COMPLETED');
    expect((await engine.cancelTask(done.id)).kind).toBe('conflict');
    const { taskId } = await seedTask(db.prisma, { type: 'system.echo', status: 'CANCELLED' });
    expect((await engine.cancelTask(taskId)).kind).toBe('already-cancelled');
    expect((await engine.cancelTask(999999)).kind).toBe('not-found');
  });
});

describe('pause and resume', () => {
  it('keeps QUEUED tasks queued while paused, lets RUNNING finish, and resumes', async () => {
    const first = await makePlan(engine, [
      { key: 'run', type: 'test.wait', input: { name: 'pause-test' } },
    ]);
    await waitForStatus(db.prisma, first, 'run', 'RUNNING');
    expect(await engine.pause()).toBe(true);
    expect(await engine.pause()).toBe(false);
    const second = await makePlan(engine, [
      { key: 'q', type: 'system.echo', input: { message: 'q' } },
    ]);
    await new Promise((r) => setTimeout(r, 300));
    expect((await waitForStatus(db.prisma, second, 'q', 'QUEUED')).attempts).toBe(0);
    test.release('pause-test');
    await waitForStatus(db.prisma, first, 'run', 'COMPLETED');
    await new Promise((r) => setTimeout(r, 100));
    expect((await waitForStatus(db.prisma, second, 'q', 'QUEUED')).attempts).toBe(0);
    await engine.resume();
    await waitForStatus(db.prisma, second, 'q', 'COMPLETED');
  });

  it('a new engine on the same database starts paused', async () => {
    await engine.pause();
    const next = createTestEngine(db.prisma, registry);
    await next.start();
    try {
      expect((await next.status()).paused).toBe(true);
    } finally {
      await next.stop();
    }
  });
});

describe('audit', () => {
  it('records plan.create, task.cancel, system.pause and system.resume without input', async () => {
    await engine.pause();
    const planId = await makePlan(engine, [
      { key: 'a', type: 'system.echo', input: { message: 'secret-input' } },
    ]);
    const task = await waitForStatus(db.prisma, planId, 'a', 'QUEUED');
    await engine.cancelTask(task.id);
    await engine.resume();
    const rows = await db.prisma.auditEvent.findMany({ orderBy: { id: 'asc' } });
    expect(rows.map((r) => r.action)).toEqual([
      'system.pause',
      'plan.create',
      'task.cancel',
      'system.resume',
    ]);
    expect(rows.map((r) => r.target)).toEqual([
      'system',
      `plan:${planId}`,
      `task:${task.id}`,
      'system',
    ]);
    expect(rows.every((r) => r.outcome === 'ok')).toBe(true);
    expect(JSON.stringify(rows)).not.toContain('secret-input');
  });
});
