import { describe, expect, it } from 'vitest';
import { TASK_STATUSES, type TaskStatus } from '@jobintel/contracts';
import {
  InvalidTransitionError,
  assertTransition,
  backoffMs,
  canTransition,
  decideFailure,
  decideInterrupted,
  derivePlanStatus,
  isTerminal,
} from '../src/engine/state-machine';

const ALLOWED: Record<string, string[]> = {
  PENDING: ['BLOCKED', 'QUEUED', 'CANCELLED'],
  BLOCKED: ['QUEUED', 'CANCELLED'],
  QUEUED: ['RUNNING', 'CANCELLED'],
  RUNNING: ['RETRYING', 'COMPLETED', 'FAILED', 'CANCELLED'],
  RETRYING: ['QUEUED', 'CANCELLED'],
};

describe('transition matrix', () => {
  for (const from of TASK_STATUSES) {
    for (const to of TASK_STATUSES) {
      const expected = ALLOWED[from]?.includes(to) ?? false;
      it(`${from} -> ${to} is ${expected ? 'allowed' : 'forbidden'}`, () => {
        expect(canTransition(from, to)).toBe(expected);
        if (expected) expect(() => assertTransition(from, to)).not.toThrow();
        else expect(() => assertTransition(from, to)).toThrow(InvalidTransitionError);
      });
    }
  }

  it('terminal states have no exits', () => {
    for (const s of ['COMPLETED', 'FAILED', 'CANCELLED'] as TaskStatus[]) {
      expect(isTerminal(s)).toBe(true);
    }
    for (const s of ['PENDING', 'BLOCKED', 'QUEUED', 'RUNNING', 'RETRYING'] as TaskStatus[]) {
      expect(isTerminal(s)).toBe(false);
    }
  });
});

describe('derivePlanStatus', () => {
  it('derives the plan status', () => {
    expect(derivePlanStatus(['COMPLETED', 'RUNNING'])).toBe('ACTIVE');
    expect(derivePlanStatus(['COMPLETED', 'COMPLETED'])).toBe('COMPLETED');
    expect(derivePlanStatus(['COMPLETED', 'FAILED', 'CANCELLED'])).toBe('FAILED');
    expect(derivePlanStatus(['COMPLETED', 'CANCELLED'])).toBe('CANCELLED');
    expect(derivePlanStatus(['CANCELLED'])).toBe('CANCELLED');
  });
});

describe('decideFailure', () => {
  it('retries only when retryable and attempts remain', () => {
    expect(
      decideFailure({ retryable: true, attempts: 1, maxAttempts: 3, retryBaseMs: 10 }),
    ).toEqual({
      to: 'RETRYING',
      delayMs: 10,
    });
    expect(decideFailure({ retryable: true, attempts: 3, maxAttempts: 3 })).toEqual({
      to: 'FAILED',
    });
    expect(decideFailure({ retryable: false, attempts: 1, maxAttempts: 3 })).toEqual({
      to: 'FAILED',
    });
  });
});

describe('decideInterrupted', () => {
  const base = {
    cancelRequested: false,
    handlerRegistered: true,
    idempotent: true,
    attempts: 1,
    maxAttempts: 3,
  };
  it('applies the rules in order', () => {
    expect(decideInterrupted({ ...base, cancelRequested: true, handlerRegistered: false }).to).toBe(
      'CANCELLED',
    );
    const unknown = decideInterrupted({ ...base, handlerRegistered: false, idempotent: false });
    expect(unknown).toMatchObject({ to: 'FAILED', error: { code: 'UNKNOWN_HANDLER' } });
    const nonIdem = decideInterrupted({ ...base, idempotent: false });
    expect(nonIdem).toMatchObject({ to: 'FAILED', error: { code: 'INTERRUPTED' } });
    const exhausted = decideInterrupted({ ...base, attempts: 3 });
    expect(exhausted).toMatchObject({ to: 'FAILED', error: { code: 'INTERRUPTED' } });
    expect(decideInterrupted(base)).toEqual({ to: 'RETRYING' });
  });
});

describe('backoffMs', () => {
  it('doubles and caps at 60 s', () => {
    expect(backoffMs(1)).toBe(1000);
    expect(backoffMs(2)).toBe(2000);
    expect(backoffMs(3)).toBe(4000);
    expect(backoffMs(10)).toBe(60_000);
    expect(backoffMs(2, 10)).toBe(20);
  });
});
