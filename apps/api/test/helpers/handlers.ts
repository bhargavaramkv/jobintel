import { z } from 'zod';
import {
  TaskError,
  createRegistry,
  defineHandler,
  type AnyTaskHandler,
  type Registry,
} from '../../src/engine/handlers';

const defaults = { timeoutMs: 5000, maxAttempts: 3 };

/** Test-only handlers. Never registered in production. */
export function createTestHandlers() {
  const state = {
    sideEffectCalls: 0,
    flakyCalls: new Map<string, number>(),
    aborted: new Set<string>(),
  };
  const released = new Set<string>();
  const waiters = new Map<string, Set<() => void>>();

  function release(name: string) {
    released.add(name);
    for (const w of waiters.get(name) ?? []) w();
  }

  function waitFor(name: string, signal: AbortSignal | undefined): Promise<void> {
    return new Promise((resolve, reject) => {
      const done = () => {
        waiters.get(name)?.delete(done);
        resolve();
      };
      if (released.has(name)) return resolve();
      if (!waiters.has(name)) waiters.set(name, new Set());
      waiters.get(name)?.add(done);
      signal?.addEventListener('abort', () => {
        state.aborted.add(name);
        waiters.get(name)?.delete(done);
        reject(new Error('aborted'));
      });
    });
  }

  const handlers: AnyTaskHandler[] = [
    defineHandler({
      type: 'test.fail',
      input: z.strictObject({ retryable: z.boolean().default(false) }),
      idempotent: true,
      defaults,
      async run(input) {
        throw new TaskError('TEST_FAIL', 'boom', input.retryable);
      },
    }),
    defineHandler({
      type: 'test.flaky',
      input: z.strictObject({ failTimes: z.int().min(0) }),
      idempotent: true,
      defaults,
      async run(input, ctx) {
        const calls = (state.flakyCalls.get(ctx.idempotencyKey) ?? 0) + 1;
        state.flakyCalls.set(ctx.idempotencyKey, calls);
        if (calls <= input.failTimes) throw new TaskError('FLAKY', `failure ${calls}`, true);
        return { calls };
      },
    }),
    defineHandler({
      type: 'test.side-effect',
      input: z.strictObject({ block: z.string().optional(), fail: z.boolean().optional() }),
      idempotent: false,
      defaults,
      async run(input, ctx) {
        state.sideEffectCalls += 1;
        if (input.fail) throw new Error('plain failure');
        if (input.block) await waitFor(input.block, ctx.signal);
        return { calls: state.sideEffectCalls };
      },
    }),
    defineHandler({
      type: 'test.wait',
      input: z.strictObject({ name: z.string(), cooperative: z.boolean().default(true) }),
      idempotent: true,
      defaults,
      async run(input, ctx) {
        await waitFor(input.name, input.cooperative ? ctx.signal : undefined);
        return { released: input.name };
      },
    }),
  ];

  return { state, release, handlers };
}

export function createTestRegistry(extra: AnyTaskHandler[] = []): Registry {
  return createRegistry([...createTestHandlers().handlers, ...extra]);
}
