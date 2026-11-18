import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import type { PrismaClient } from '../src/db';
import { DEFAULT_ENGINE_CONFIG } from '../src/config';
import { createEventBus } from '../src/engine/event-bus';
import { startExecution } from '../src/engine/executor';
import { TaskError, createRegistry, defineHandler } from '../src/engine/handlers';
import { createRepository } from '../src/engine/repository';
import { createTestDb } from './helpers/db';
import {
  clearTables,
  createTestEngine,
  makePlan,
  seedTask,
  taskByKey,
  until,
  waitForStatus,
} from './helpers/engine';
import { createTestHandlers } from './helpers/handlers';

const db = createTestDb();

beforeEach(async () => {
  await clearTables(db.prisma);
});
afterAll(() => db.cleanup());

describe('cancel accepted on a RUNNING task never ends in a re-run', () => {
  it('requeueRetrying cancels a RETRYING row that has cancelRequestedAt', async () => {
    const { taskId } = await seedTask(db.prisma, {
      type: 'system.echo',
      status: 'RETRYING',
      cancelRequestedAt: new Date(),
    });
    await db.prisma.task.update({ where: { id: taskId }, data: { availableAt: new Date() } });
    const repo = createRepository(db.prisma, createEventBus());
    await repo.requeueRetrying(new Date(Date.now() + 1000));
    const row = await db.prisma.task.findUniqueOrThrow({ where: { id: taskId } });
    expect(row.status).toBe('CANCELLED');
    expect(JSON.parse(row.error ?? '{}')).toMatchObject({ code: 'CANCELLED' });
  });

  it('a retryable failure after an accepted cancel ends CANCELLED, not RETRYING', async () => {
    let release!: () => void;
    const gate = new Promise<void>((r) => (release = r));
    const failLate = defineHandler({
      type: 'test.fail-late',
      input: z.strictObject({}),
      idempotent: true,
      defaults: { timeoutMs: 5000, maxAttempts: 3 },
      async run() {
        await gate;
        throw new TaskError('LATE', 'late retryable failure', true);
      },
    });
    const engine = createTestEngine(db.prisma, createRegistry([failLate]));
    await engine.start();
    try {
      const planId = await makePlan(engine, [{ key: 'f', type: 'test.fail-late' }]);
      const running = await waitForStatus(db.prisma, planId, 'f', 'RUNNING');
      // The cancel is recorded but the handler is not told (as if the abort raced past it).
      await db.prisma.task.update({
        where: { id: running.id },
        data: { cancelRequestedAt: new Date() },
      });
      release();
      const row = await waitForStatus(db.prisma, planId, 'f', 'CANCELLED');
      expect(row.attempts).toBe(1);
      await new Promise((r) => setTimeout(r, 100));
      expect((await taskByKey(db.prisma, planId, 'f')).status).toBe('CANCELLED');
    } finally {
      release();
      await engine.stop();
    }
  });
});

describe('abort reason is captured when the race settles', () => {
  it('a late abort does not reclassify a genuine FAILED', async () => {
    const calls: { to: string }[] = [];
    let finishLog!: () => void;
    const logGate = new Promise<void>((r) => (finishLog = r));
    const repo = {
      appendLog: vi.fn(() => logGate),
      transition: vi.fn(async (a: { to: string }) => {
        calls.push(a);
        return true;
      }),
      getTaskRow: vi.fn(async () => null),
      heartbeat: vi.fn(async () => ({ ok: true, cancelRequested: false })),
      interruptTask: vi.fn(async () => null),
    };
    const handler = defineHandler({
      type: 'x.fail',
      input: z.strictObject({}),
      idempotent: false,
      defaults: { timeoutMs: 5000, maxAttempts: 1 },
      async run(_input, ctx) {
        ctx.logger.info('about to fail');
        throw new TaskError('REAL', 'genuine failure', false);
      },
    });
    const row = {
      id: 1,
      planId: 1,
      type: 'x.fail',
      input: '{}',
      attempts: 1,
      maxAttempts: 1,
      timeoutMs: 5000,
      idempotencyKey: '1:x',
      cancelRequestedAt: null,
    };
    const execution = startExecution(
      {
        repo: repo as never,
        registry: createRegistry([handler]),
        config: DEFAULT_ENGINE_CONFIG,
        instanceId: 'me',
      },
      row as never,
    );
    await until(async () => repo.appendLog.mock.calls.length > 0);
    await new Promise((r) => setTimeout(r, 30)); // the race has settled; the log write is pending
    execution.abort('cancel');
    finishLog();
    await execution.done;
    expect(calls.map((c) => c.to)).toEqual(['FAILED']);
  });
});

describe('a task this instance owns cannot stay RUNNING forever', () => {
  it('recovers it on a later tick after a failed finish', async () => {
    let failNext = false;
    const flaky = new Proxy(db.prisma, {
      get(target, prop) {
        if (prop === '$transaction') {
          return async (...args: unknown[]) => {
            if (failNext) {
              failNext = false;
              throw new Error('simulated write failure');
            }
            return (target.$transaction as (...a: unknown[]) => unknown)(...args);
          };
        }
        const value = Reflect.get(target, prop) as unknown;
        return typeof value === 'function' ? value.bind(target) : value;
      },
    }) as PrismaClient;
    const handlers = createTestHandlers();
    const engine = createTestEngine(flaky, createRegistry(handlers.handlers));
    await engine.start();
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const planId = await makePlan(engine, [
        { key: 'w', type: 'test.wait', input: { name: 'finish-fails' } },
      ]);
      await waitForStatus(db.prisma, planId, 'w', 'RUNNING');
      failNext = true;
      handlers.release('finish-fails');
      const row = await waitForStatus(db.prisma, planId, 'w', 'COMPLETED');
      expect(row.attempts).toBe(2);
    } finally {
      errors.mockRestore();
      await engine.stop();
    }
  });
});
