import type { EngineConfig } from '../config';
import { startExecution, type AbortReason, type Execution } from './executor';
import type { Registry } from './handlers';
import type { Repository } from './repository';

export interface SchedulerDeps {
  repo: Repository;
  registry: Registry;
  config: EngineConfig;
  instanceId: string;
}

/** Resolve when `p` settles or after `ms`, without leaving a timer behind. */
async function within(p: Promise<unknown>, ms: number): Promise<void> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  await Promise.race([
    p,
    new Promise((resolve) => {
      timer = setTimeout(resolve, ms);
    }),
  ]);
  clearTimeout(timer);
}

export function createScheduler(deps: SchedulerDeps) {
  const { repo, registry, config, instanceId } = deps;
  const active = new Map<number, Execution>();
  let timer: ReturnType<typeof setTimeout> | undefined;
  let inflight: Promise<void> | undefined;
  let rerun = false;
  let started = false;
  let stopping = false;

  async function tick(): Promise<void> {
    try {
      // Bookkeeping runs even while paused; only claiming is gated.
      await repo.requeueRetrying(new Date());
      await repo.resolveDependencies();
      await repo.recoverAbandoned({
        instanceId,
        atStartup: false,
        registry,
        activeIds: [...active.keys()],
      });
      if (stopping || (await repo.isPaused())) return;
      const rows = await repo.claimQueued(
        instanceId,
        config.leaseMs,
        config.concurrency - active.size,
      );
      for (const row of rows) {
        const execution = startExecution({ repo, registry, config, instanceId }, row);
        active.set(row.id, execution);
        void execution.done.finally(() => {
          active.delete(row.id);
          wake();
        });
      }
    } catch (err) {
      console.error('scheduler tick failed', err);
    }
  }

  function schedule(delayMs: number) {
    clearTimeout(timer);
    if (!started || stopping) return;
    timer = setTimeout(() => {
      inflight = tick().finally(() => {
        inflight = undefined;
        const again = rerun;
        rerun = false;
        schedule(again ? 0 : config.pollMs);
      });
    }, delayMs);
  }

  /** Run a tick now; at most one tick is pending. */
  function wake() {
    if (!started || stopping) return;
    if (inflight) rerun = true;
    else schedule(0);
  }

  return {
    start() {
      started = true;
      schedule(0);
    },

    wake,

    activeCount: () => active.size,

    abortTask(taskId: number, reason: AbortReason): boolean {
      const execution = active.get(taskId);
      execution?.abort(reason);
      return execution !== undefined;
    },

    /** Graceful shutdown: drain, then abort, then settle whatever this instance still owns. */
    async stop(): Promise<void> {
      stopping = true;
      clearTimeout(timer);
      await inflight;
      const allDone = () => Promise.all([...active.values()].map((e) => e.done));
      await within(allDone(), config.shutdownTimeoutMs);
      if (active.size > 0) {
        for (const e of active.values()) e.abort('shutdown');
        await within(allDone(), config.graceMs + 200);
      }
      for (const row of await repo.runningOwnedBy(instanceId)) {
        await repo.interruptTask(row, registry);
      }
    },
  };
}
