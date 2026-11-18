import { setTimeout as sleep } from 'node:timers/promises';
import type { z } from 'zod';
import { taskInputSchemas } from '@jobintel/contracts';
import type { PrismaClient } from '../db';

export interface TaskLogger {
  info(msg: string): void;
  warn(msg: string): void;
  error(msg: string): void;
}

export interface TaskContext {
  taskId: number;
  planId: number;
  attempt: number;
  idempotencyKey: string;
  idempotent: boolean;
  signal: AbortSignal;
  logger: TaskLogger;
}

export interface TaskHandler<TInput, TResult> {
  type: string;
  input: z.ZodType<TInput>;
  idempotent: boolean;
  defaults: { timeoutMs: number; maxAttempts: number };
  run(input: TInput, ctx: TaskContext): Promise<TResult>;
}

export interface AnyTaskHandler {
  type: string;
  input: z.ZodType;
  idempotent: boolean;
  defaults: { timeoutMs: number; maxAttempts: number };
  run(input: unknown, ctx: TaskContext): Promise<unknown>;
}

/** Erase the generics so handlers of different input types fit in one map. */
export function defineHandler<I, R>(h: TaskHandler<I, R>): AnyTaskHandler {
  return h as unknown as AnyTaskHandler;
}

export type Registry = ReadonlyMap<string, AnyTaskHandler>;

export function createRegistry(handlers: AnyTaskHandler[]): Registry {
  const map = new Map<string, AnyTaskHandler>();
  for (const h of handlers) {
    if (map.has(h.type)) throw new Error(`duplicate handler type: ${h.type}`);
    map.set(h.type, h);
  }
  return map;
}

/** A handler failure with an explicit code. `retryable: true` asserts no side effect happened. */
export class TaskError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly retryable: boolean,
  ) {
    super(message);
    this.name = 'TaskError';
  }
}

export function createDefaultRegistry(deps: {
  prisma: PrismaClient;
  apiBaseUrl: string;
}): Registry {
  const echo = defineHandler({
    type: 'system.echo',
    input: taskInputSchemas['system.echo'],
    idempotent: true,
    defaults: { timeoutMs: 5000, maxAttempts: 3 },
    async run(input) {
      return { message: input.message };
    },
  });

  const delay = defineHandler({
    type: 'system.delay',
    input: taskInputSchemas['system.delay'],
    idempotent: true,
    defaults: { timeoutMs: 65_000, maxAttempts: 3 },
    async run(input, ctx) {
      await sleep(input.ms, undefined, { signal: ctx.signal });
      return { sleptMs: input.ms };
    },
  });

  const healthCheck = defineHandler({
    type: 'system.health-check',
    input: taskInputSchemas['system.health-check'],
    idempotent: true,
    defaults: { timeoutMs: 5000, maxAttempts: 2 },
    async run(_input, ctx) {
      const database = await deps.prisma.$queryRaw`SELECT 1`.then(
        () => 'ok' as const,
        () => 'error' as const,
      );
      const api = await fetch(`${deps.apiBaseUrl}/api/health`, { signal: ctx.signal }).then(
        (res) => (res.ok ? ('ok' as const) : ('error' as const)),
        () => 'error' as const,
      );
      if (database !== 'ok' || api !== 'ok') {
        throw new TaskError('HEALTH_CHECK_FAILED', `database: ${database}, api: ${api}`, true);
      }
      return { database, api };
    },
  });

  return createRegistry([echo, delay, healthCheck]);
}
