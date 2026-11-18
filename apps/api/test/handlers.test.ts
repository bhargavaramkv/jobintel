import { afterAll, describe, expect, it } from 'vitest';
import { taskInputSchemas } from '@jobintel/contracts';
import { buildApp } from '../src/app';
import {
  TaskError,
  createDefaultRegistry,
  createRegistry,
  type TaskContext,
} from '../src/engine/handlers';
import { createTestDb } from './helpers/db';
import { createTestEngine } from './helpers/engine';

const db = createTestDb();
const app = buildApp(db.prisma, createTestEngine(db.prisma, createRegistry([])));

afterAll(async () => {
  await app.close();
  await db.cleanup();
});

function ctx(signal = new AbortController().signal): TaskContext {
  const noop = () => {};
  return {
    taskId: 1,
    planId: 1,
    attempt: 1,
    idempotencyKey: '1:a',
    idempotent: true,
    signal,
    logger: { info: noop, warn: noop, error: noop },
  };
}

const registry = createDefaultRegistry({ prisma: db.prisma, apiBaseUrl: 'http://127.0.0.1:1' });
const get = (type: string) => {
  const h = registry.get(type);
  if (!h) throw new Error(`missing ${type}`);
  return h;
};

describe('default handlers', () => {
  it('echo returns its message', async () => {
    expect(await get('system.echo').run({ message: 'hi' }, ctx())).toEqual({ message: 'hi' });
  });

  it('delay rejects within 50 ms of an abort', async () => {
    const ac = new AbortController();
    const p = get('system.delay').run({ ms: 5000 }, ctx(ac.signal));
    const caught = p.catch((e: unknown) => e);
    await new Promise((r) => setTimeout(r, 10));
    const abortedAt = performance.now();
    ac.abort();
    expect(await caught).toBeInstanceOf(Error);
    expect(performance.now() - abortedAt).toBeLessThan(50);
  });

  it('delay schema rejects 60001', () => {
    expect(taskInputSchemas['system.delay'].safeParse({ ms: 60001 }).success).toBe(false);
  });

  it('health-check throws a retryable TaskError when the api is down', async () => {
    const err = await get('system.health-check')
      .run({}, ctx())
      .catch((e: unknown) => e);
    expect(err).toBeInstanceOf(TaskError);
    expect((err as TaskError).retryable).toBe(true);
  });

  it('health-check is ok against a listening app', async () => {
    await app.listen({ host: '127.0.0.1', port: 0 });
    const { port } = app.server.address() as { port: number };
    const live = createDefaultRegistry({
      prisma: db.prisma,
      apiBaseUrl: `http://127.0.0.1:${port}`,
    });
    expect(await live.get('system.health-check')?.run({}, ctx())).toEqual({
      database: 'ok',
      api: 'ok',
    });
  });

  it('registry rejects duplicate types', () => {
    const echo = get('system.echo');
    expect(() => createRegistry([echo, echo])).toThrow(/duplicate/);
  });
});
