import { execFile } from 'node:child_process';
import path from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { createEventBus } from '../src/engine/event-bus';
import type { NormalizedPlan } from '../src/engine/plan-validation';
import { createRepository } from '../src/engine/repository';
import { createTestDb } from './helpers/db';

const db = createTestDb();
const repo = createRepository(db.prisma, createEventBus());
const apiDir = path.resolve(import.meta.dirname, '..');
const workerFile = path.join(apiDir, 'test', 'helpers', 'claim-worker.ts');

afterAll(() => db.cleanup());

const task = (key: string, dependsOn: string[] = []) => ({
  key,
  type: 'system.echo',
  input: { message: key },
  dependsOn,
  priority: 5,
  maxAttempts: 3,
  timeoutMs: 5000,
});

async function seedQueued(count: number): Promise<number[]> {
  const tasks = Array.from({ length: count }, (_, i) => task(`t${i}`));
  const out = await repo.createPlan({ tasks } satisfies NormalizedPlan);
  if (out.kind !== 'created') throw new Error('plan not created');
  const rows = await db.prisma.task.findMany({ where: { planId: out.planId } });
  for (const r of rows) {
    expect(await repo.transition({ taskId: r.id, from: 'PENDING', to: 'QUEUED' })).toBe(true);
  }
  return rows.map((r) => r.id);
}

/** Run claimers as separate processes so each has its own SQLite connection and they truly race. */
async function race(modes: string[]): Promise<number[][]> {
  const startAt = Date.now() + 2500;
  return Promise.all(
    modes.map(
      (mode, i) =>
        new Promise<number[]>((resolve, reject) => {
          execFile(
            process.execPath,
            ['--import', 'tsx', workerFile, db.url, `worker-${i}`, String(startAt), mode],
            { cwd: apiDir },
            (err, stdout, stderr) => {
              if (err) return reject(new Error(`${err.message}\n${stderr}`));
              const line = stdout.split('\n').find((l) => l.startsWith('CLAIMED '));
              resolve(JSON.parse(line?.slice('CLAIMED '.length) ?? '[]') as number[]);
            },
          );
        }),
    ),
  );
}

describe('claiming', () => {
  it('two processes racing for one QUEUED task: exactly one wins', async () => {
    const [id] = await seedQueued(1);
    const results = await race([`one:${id}`, `one:${id}`]);
    expect(results.flat()).toEqual([id]);
    const row = await db.prisma.task.findUniqueOrThrow({ where: { id: id as number } });
    expect(row.status).toBe('RUNNING');
    expect(row.attempts).toBe(1);
  });

  it('two processes claiming 50 tasks split them with no overlap', async () => {
    const ids = await seedQueued(50);
    const [a, b] = await race(['all', 'all']);
    const union = new Set([...(a ?? []), ...(b ?? [])]);
    expect(union.size).toBe(ids.length);
    expect((a ?? []).filter((id) => b?.includes(id))).toEqual([]);
    const rows = await db.prisma.task.findMany({ where: { id: { in: ids } } });
    expect(rows.every((r) => r.attempts === 1 && r.status === 'RUNNING')).toBe(true);
  });

  it('rejects a completion whose fence is stale', async () => {
    const [id] = await seedQueued(1);
    const claimed = await repo.claimTask(id as number, 'me', 30_000);
    expect(claimed?.attempts).toBe(1);
    const stale = await repo.transition({
      taskId: id as number,
      from: 'RUNNING',
      to: 'COMPLETED',
      fence: { leaseOwner: 'me', attempts: 9 },
    });
    expect(stale).toBe(false);
    expect((await repo.getTaskRow(id as number))?.status).toBe('RUNNING');
    const fresh = await repo.transition({
      taskId: id as number,
      from: 'RUNNING',
      to: 'COMPLETED',
      fence: { leaseOwner: 'me', attempts: 1 },
      result: { ok: true },
    });
    expect(fresh).toBe(true);
  });

  it('never claims a COMPLETED task', async () => {
    const [id] = await seedQueued(1);
    await repo.claimTask(id as number, 'me', 30_000);
    await repo.transition({ taskId: id as number, from: 'RUNNING', to: 'COMPLETED' });
    expect(await repo.claimTask(id as number, 'other', 30_000)).toBeNull();
    expect((await repo.getTaskRow(id as number))?.attempts).toBe(1);
  });

  it('replays plan creation with the same key and hash, conflicts on a different hash', async () => {
    const plan = { tasks: [task('a')] } satisfies NormalizedPlan;
    const first = await repo.createPlan(plan, 'key-1', 'hash-1');
    const again = await repo.createPlan(plan, 'key-1', 'hash-1');
    expect(first.kind).toBe('created');
    expect(again).toEqual({
      kind: 'replayed',
      planId: first.kind === 'created' ? first.planId : -1,
    });
    expect(await repo.createPlan(plan, 'key-1', 'hash-2')).toEqual({ kind: 'conflict' });
    expect(await db.prisma.plan.count({ where: { idempotencyKey: 'key-1' } })).toBe(1);
  });

  it('cascades a failure to transitive dependents and derives the plan status', async () => {
    const out = await repo.createPlan({
      tasks: [task('a'), task('b', ['a']), task('c', ['b']), task('d')],
    });
    if (out.kind !== 'created') throw new Error('plan not created');
    await repo.resolveDependencies();
    const byKey = async (key: string) =>
      db.prisma.task.findFirstOrThrow({ where: { planId: out.planId, key } });
    expect((await byKey('b')).status).toBe('BLOCKED');
    for (const key of ['a', 'd']) {
      const row = await byKey(key);
      await repo.claimTask(row.id, 'me', 30_000);
    }
    const a = await byKey('a');
    await repo.transition({
      taskId: a.id,
      from: 'RUNNING',
      to: 'FAILED',
      error: { code: 'X', message: 'x' },
    });
    const d = await byKey('d');
    await repo.transition({ taskId: d.id, from: 'RUNNING', to: 'COMPLETED' });
    const b = await byKey('b');
    const c = await byKey('c');
    expect([b.status, c.status]).toEqual(['CANCELLED', 'CANCELLED']);
    expect(JSON.parse(c.error ?? '{}')).toMatchObject({ code: 'DEPENDENCY_FAILED' });
    expect((await repo.getPlan(out.planId))?.plan.status).toBe('FAILED');
  });
});
