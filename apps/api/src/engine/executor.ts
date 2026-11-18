import type { Task as TaskRow } from '../generated/prisma/client';
import type { EngineConfig } from '../config';
import { TaskError, type TaskLogger } from './handlers';
import type { Registry } from './handlers';
import type { Fence, Repository } from './repository';
import { decideFailure, type TaskErrorInfo } from './state-machine';

export type AbortReason = 'timeout' | 'cancel' | 'lease-lost' | 'shutdown';

export interface Execution {
  taskId: number;
  abort(reason: AbortReason): void;
  done: Promise<void>;
}

export interface ExecutorDeps {
  repo: Repository;
  registry: Registry;
  config: EngineConfig;
  instanceId: string;
}

const MAX_RESULT_BYTES = 64 * 1024;
const MAX_MESSAGE = 1000;
const MAX_LOG_MESSAGE = 500;
const MAX_LOGS_PER_ATTEMPT = 100;

type Settled = { ok: true; value: unknown } | { ok: false; error: unknown };

/** Run one claimed (RUNNING) task and write its outcome through the fenced transition. */
export function startExecution(deps: ExecutorDeps, row: TaskRow): Execution {
  const { repo, registry, config, instanceId } = deps;
  const fence: Fence = { leaseOwner: instanceId, attempts: row.attempts };
  const controller = new AbortController();
  let reason: AbortReason | undefined;

  function abort(r: AbortReason) {
    if (reason) return;
    reason = r;
    controller.abort(r);
  }

  async function finish(
    to: 'COMPLETED' | 'RETRYING' | 'FAILED' | 'CANCELLED',
    extra: { result?: unknown; error?: TaskErrorInfo; delayMs?: number } = {},
  ) {
    const ok = await repo.transition({
      taskId: row.id,
      from: 'RUNNING',
      to,
      fence,
      result: extra.result,
      error: extra.error && { ...extra.error, message: extra.error.message.slice(0, MAX_MESSAGE) },
      patch:
        extra.delayMs === undefined
          ? undefined
          : { availableAt: new Date(Date.now() + extra.delayMs) },
    });
    if (!ok) console.warn(`stale result discarded for task ${row.id}`);
  }

  async function fail(retryable: boolean, error: TaskErrorInfo) {
    const d = decideFailure({
      retryable,
      attempts: row.attempts,
      maxAttempts: row.maxAttempts,
      retryBaseMs: config.retryBaseMs,
    });
    if (d.to === 'RETRYING' && (await cancelRequested())) {
      await finish('CANCELLED', { error: { code: 'CANCELLED', message: 'cancelled' } });
      return;
    }
    await finish(d.to, { error, delayMs: d.to === 'RETRYING' ? d.delayMs : undefined });
  }

  async function cancelRequested(): Promise<boolean> {
    const fresh = await repo.getTaskRow(row.id);
    return (fresh?.cancelRequestedAt ?? row.cancelRequestedAt) != null;
  }

  async function run(): Promise<void> {
    const handler = registry.get(row.type);
    if (handler && row.cancelRequestedAt) {
      await finish('CANCELLED', { error: { code: 'CANCELLED', message: 'cancelled' } });
      return;
    }
    if (!handler) {
      await repo.interruptTask(row, registry);
      return;
    }
    const parsed = handler.input.safeParse(JSON.parse(row.input));
    if (!parsed.success) {
      await finish('FAILED', {
        error: { code: 'INVALID_INPUT', message: 'stored input does not match the handler schema' },
      });
      return;
    }

    const pendingLogs = new Set<Promise<void>>();
    let logCount = 0;
    const log = (level: 'info' | 'warn' | 'error') => (message: string) => {
      logCount++;
      if (logCount > MAX_LOGS_PER_ATTEMPT + 1) return;
      const text =
        logCount === MAX_LOGS_PER_ATTEMPT + 1
          ? 'further log messages dropped'
          : message.slice(0, MAX_LOG_MESSAGE);
      const p = repo
        .appendLog(row.id, row.planId, logCount > MAX_LOGS_PER_ATTEMPT ? 'warn' : level, text)
        .catch(() => {})
        .finally(() => pendingLogs.delete(p));
      pendingLogs.add(p);
    };
    const logger: TaskLogger = { info: log('info'), warn: log('warn'), error: log('error') };

    const timeout = setTimeout(() => abort('timeout'), row.timeoutMs);
    let beating = false;
    const heartbeat = setInterval(() => {
      if (beating) return;
      beating = true;
      repo
        .heartbeat(row.id, fence, config.leaseMs)
        .then((hb) => {
          if (!hb.ok) abort('lease-lost');
          else if (hb.cancelRequested) abort('cancel');
        })
        .catch(() => {})
        .finally(() => {
          beating = false;
        });
    }, config.heartbeatMs);

    let graceTimer: ReturnType<typeof setTimeout> | undefined;
    let raceSettled = false;
    const graceExpired = new Promise<'grace'>((resolve) => {
      controller.signal.addEventListener('abort', () => {
        if (raceSettled) return;
        graceTimer = setTimeout(() => resolve('grace'), config.graceMs);
        graceTimer.unref();
      });
    });
    const settled: Promise<Settled> = Promise.resolve()
      .then(() =>
        handler.run(parsed.data, {
          taskId: row.id,
          planId: row.planId,
          attempt: row.attempts,
          idempotencyKey: row.idempotencyKey,
          idempotent: handler.idempotent,
          signal: controller.signal,
          logger,
        }),
      )
      .then(
        (value) => ({ ok: true, value }),
        (error: unknown) => ({ ok: false, error }),
      );

    const outcome = await Promise.race([settled, graceExpired]);
    raceSettled = true;
    // Read the reason now: later awaits must not let a late abort reclassify this outcome.
    const finalReason = reason;
    clearTimeout(timeout);
    clearInterval(heartbeat);
    clearTimeout(graceTimer);
    await Promise.allSettled(pendingLogs);

    if (outcome !== 'grace' && outcome.ok) {
      const json = JSON.stringify(outcome.value ?? null);
      if (Buffer.byteLength(json) > MAX_RESULT_BYTES) {
        await finish('FAILED', {
          error: { code: 'RESULT_TOO_LARGE', message: 'result exceeds 64 KB' },
        });
      } else {
        await finish('COMPLETED', { result: outcome.value ?? null });
      }
      return;
    }

    switch (finalReason) {
      case 'cancel':
        await finish('CANCELLED', { error: { code: 'CANCELLED', message: 'cancelled' } });
        return;
      case 'lease-lost':
        return;
      case 'shutdown': {
        const fresh = await repo.getTaskRow(row.id);
        await repo.interruptTask(
          { ...row, cancelRequestedAt: fresh?.cancelRequestedAt ?? null },
          registry,
        );
        return;
      }
      case 'timeout':
        await fail(handler.idempotent, {
          code: 'TIMEOUT',
          message: `timed out after ${row.timeoutMs} ms`,
        });
        return;
      default: {
        const err = outcome === 'grace' ? undefined : outcome.error;
        if (err instanceof TaskError) {
          await fail(err.retryable, { code: err.code, message: err.message });
        } else {
          console.error(`task ${row.id} (${row.type}) handler error`, err);
          await fail(handler.idempotent, { code: 'HANDLER_ERROR', message: 'handler failed' });
        }
      }
    }
  }

  const done = run().catch((err: unknown) => {
    console.error(`executor failed for task ${row.id}`, err);
  });
  return { taskId: row.id, abort, done };
}
