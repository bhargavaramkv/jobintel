import type { PlanStatus, TaskStatus } from '@jobintel/contracts';

export const TRANSITIONS: Record<TaskStatus, readonly TaskStatus[]> = {
  PENDING: ['BLOCKED', 'QUEUED', 'CANCELLED'],
  BLOCKED: ['QUEUED', 'CANCELLED'],
  QUEUED: ['RUNNING', 'CANCELLED'],
  RUNNING: ['RETRYING', 'COMPLETED', 'FAILED', 'CANCELLED'],
  RETRYING: ['QUEUED', 'CANCELLED'],
  COMPLETED: [],
  FAILED: [],
  CANCELLED: [],
};

export class InvalidTransitionError extends Error {
  constructor(
    readonly from: TaskStatus,
    readonly to: TaskStatus,
  ) {
    super(`invalid task transition ${from} -> ${to}`);
    this.name = 'InvalidTransitionError';
  }
}

export function canTransition(from: TaskStatus, to: TaskStatus): boolean {
  return TRANSITIONS[from].includes(to);
}

export function assertTransition(from: TaskStatus, to: TaskStatus): void {
  if (!canTransition(from, to)) throw new InvalidTransitionError(from, to);
}

export function isTerminal(status: TaskStatus): boolean {
  return TRANSITIONS[status].length === 0;
}

export function derivePlanStatus(taskStatuses: readonly TaskStatus[]): PlanStatus {
  if (taskStatuses.some((s) => !isTerminal(s))) return 'ACTIVE';
  if (taskStatuses.every((s) => s === 'COMPLETED')) return 'COMPLETED';
  if (taskStatuses.some((s) => s === 'FAILED')) return 'FAILED';
  return 'CANCELLED';
}

/** `min(retryBaseMs * 2^(attempt-1), 60 000)`; no jitter. */
export function backoffMs(attempt: number, retryBaseMs = 1000): number {
  return Math.min(retryBaseMs * 2 ** (attempt - 1), 60_000);
}

export interface TaskErrorInfo {
  code: string;
  message: string;
}

export type FailureDecision = { to: 'RETRYING'; delayMs: number } | { to: 'FAILED' };

export function decideFailure(args: {
  retryable: boolean;
  attempts: number;
  maxAttempts: number;
  retryBaseMs?: number;
}): FailureDecision {
  if (args.retryable && args.attempts < args.maxAttempts) {
    return { to: 'RETRYING', delayMs: backoffMs(args.attempts, args.retryBaseMs) };
  }
  return { to: 'FAILED' };
}

export type InterruptedDecision =
  { to: 'RETRYING' } | { to: 'FAILED' | 'CANCELLED'; error: TaskErrorInfo };

/** What to do with an attempt that was interrupted (crash, lease loss at restart, shutdown). */
export function decideInterrupted(args: {
  cancelRequested: boolean;
  handlerRegistered: boolean;
  idempotent: boolean;
  attempts: number;
  maxAttempts: number;
}): InterruptedDecision {
  if (args.cancelRequested) {
    return { to: 'CANCELLED', error: { code: 'CANCELLED', message: 'cancelled' } };
  }
  if (!args.handlerRegistered) {
    return {
      to: 'FAILED',
      error: { code: 'UNKNOWN_HANDLER', message: 'handler type is not registered' },
    };
  }
  if (!args.idempotent) {
    return {
      to: 'FAILED',
      error: {
        code: 'INTERRUPTED',
        message: 'interrupted during execution; not re-run because the handler is not idempotent',
      },
    };
  }
  if (args.attempts >= args.maxAttempts) {
    return {
      to: 'FAILED',
      error: { code: 'INTERRUPTED', message: 'interrupted; retries exhausted' },
    };
  }
  return { to: 'RETRYING' };
}
