import { describe, expect, it } from 'vitest';
import {
  TASK_STATUSES,
  commandRequestSchema,
  planSpecSchema,
  taskInputSchemas,
  taskStatusSchema,
} from './index';

const task = { key: 'a', type: 'system.echo', input: { message: 'hi' } };

describe('planSpecSchema', () => {
  it('applies defaults', () => {
    const plan = planSpecSchema.parse({ tasks: [task] });
    expect(plan.tasks[0]).toMatchObject({ dependsOn: [], priority: 5 });
  });

  it('rejects unknown fields at plan and task level', () => {
    expect(planSpecSchema.safeParse({ tasks: [task], extra: 1 }).success).toBe(false);
    expect(planSpecSchema.safeParse({ tasks: [{ ...task, extra: 1 }] }).success).toBe(false);
  });

  it('enforces bounds', () => {
    const bad = (patch: object) =>
      planSpecSchema.safeParse({ tasks: [{ ...task, ...patch }] }).success;
    expect(bad({ priority: -1 })).toBe(false);
    expect(bad({ priority: 10 })).toBe(false);
    expect(bad({ maxAttempts: 0 })).toBe(false);
    expect(bad({ maxAttempts: 6 })).toBe(false);
    expect(bad({ timeoutMs: 99 })).toBe(false);
    expect(bad({ timeoutMs: 300001 })).toBe(false);
    expect(bad({ key: 'Bad Key' })).toBe(false);
    expect(planSpecSchema.safeParse({ tasks: [] }).success).toBe(false);
  });
});

describe('taskInputSchemas', () => {
  it('is strict and bounded', () => {
    expect(taskInputSchemas['system.echo'].safeParse({ message: 'x', y: 1 }).success).toBe(false);
    expect(taskInputSchemas['system.delay'].safeParse({ ms: 60000 }).success).toBe(true);
    expect(taskInputSchemas['system.delay'].safeParse({ ms: 60001 }).success).toBe(false);
    expect(taskInputSchemas['system.health-check'].safeParse({ a: 1 }).success).toBe(false);
  });
});

describe('enums and requests', () => {
  it('has the eight task states', () => {
    expect(TASK_STATUSES).toHaveLength(8);
    expect(taskStatusSchema.safeParse('NOPE').success).toBe(false);
  });

  it('rejects unknown command request fields', () => {
    expect(commandRequestSchema.safeParse({ command: '/help', x: 1 }).success).toBe(false);
    expect(commandRequestSchema.safeParse({ command: '' }).success).toBe(false);
  });
});
