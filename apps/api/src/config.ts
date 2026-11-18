export interface EngineConfig {
  concurrency: number;
  pollMs: number;
  leaseMs: number;
  heartbeatMs: number;
  /** How long an aborted handler may take to settle before its outcome is written anyway. */
  graceMs: number;
  shutdownTimeoutMs: number;
  retryBaseMs: number;
}

export const DEFAULT_ENGINE_CONFIG: EngineConfig = {
  concurrency: 2,
  pollMs: 500,
  leaseMs: 30_000,
  heartbeatMs: 10_000,
  graceMs: 2000,
  shutdownTimeoutMs: 10_000,
  retryBaseMs: 1000,
};

function intInRange(raw: string | undefined, min: number, max: number, fallback: number): number {
  const n = Number(raw);
  return raw !== undefined && Number.isInteger(n) && n >= min && n <= max ? n : fallback;
}

/** Only concurrency and the shutdown timeout are configurable through the environment. */
export function engineConfigFromEnv(env: NodeJS.ProcessEnv = process.env): EngineConfig {
  return {
    ...DEFAULT_ENGINE_CONFIG,
    concurrency: intInRange(env.ENGINE_CONCURRENCY, 1, 8, DEFAULT_ENGINE_CONFIG.concurrency),
    shutdownTimeoutMs: intInRange(
      env.ENGINE_SHUTDOWN_TIMEOUT_MS,
      0,
      600_000,
      DEFAULT_ENGINE_CONFIG.shutdownTimeoutMs,
    ),
  };
}
