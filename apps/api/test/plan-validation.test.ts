import { describe, expect, it } from 'vitest';
import { DEMO_PLAN } from '../src/engine/commands';
import { createRegistry } from '../src/engine/handlers';
import { validatePlan } from '../src/engine/plan-validation';
import { createTestHandlers } from './helpers/handlers';

const registry = createRegistry(createTestHandlers().handlers);
const echo = (key: string, extra: object = {}) => ({
  key,
  type: 'test.wait',
  input: { name: 'x' },
  ...extra,
});

function errorsOf(spec: unknown) {
  const r = validatePlan(spec, registry);
  if (r.ok) throw new Error('expected plan to be invalid');
  return r.errors;
}

describe('validatePlan', () => {
  it('normalizes defaults from the handler', () => {
    const r = validatePlan({ name: 'p', tasks: [echo('a')] }, registry);
    expect(r.ok && r.plan.tasks[0]).toMatchObject({
      key: 'a',
      priority: 5,
      maxAttempts: 3,
      timeoutMs: 5000,
      dependsOn: [],
    });
  });

  it('rejects duplicate keys', () => {
    expect(errorsOf({ tasks: [echo('a'), echo('a')] }).map((e) => e.message)).toContain(
      'duplicate key "a"',
    );
  });

  it('rejects missing and self dependencies and duplicate entries', () => {
    const msgs = errorsOf({
      tasks: [echo('a', { dependsOn: ['a', 'zzz'] }), echo('b', { dependsOn: ['a', 'a'] })],
    }).map((e) => e.message);
    expect(msgs).toContain('task "a" depends on itself');
    expect(msgs).toContain('unknown dependency "zzz"');
    expect(msgs).toContain('duplicate dependency "a"');
  });

  it('detects 2-node and 3-node cycles and lists the keys', () => {
    const two = errorsOf({
      tasks: [echo('a', { dependsOn: ['b'] }), echo('b', { dependsOn: ['a'] }), echo('c')],
    });
    expect(two.find((e) => e.message.includes('cycle'))?.message).toBe(
      'dependency cycle among: a, b',
    );
    const three = errorsOf({
      tasks: [
        echo('a', { dependsOn: ['c'] }),
        echo('b', { dependsOn: ['a'] }),
        echo('c', { dependsOn: ['b'] }),
      ],
    });
    expect(three.find((e) => e.message.includes('cycle'))?.message).toBe(
      'dependency cycle among: a, b, c',
    );
  });

  it('rejects unknown types and invalid input', () => {
    const errors = errorsOf({
      tasks: [{ key: 'a', type: 'nope', input: {} }, echo('b', { input: { name: 5 } })],
    });
    expect(errors.some((e) => e.path === 'tasks.0.type')).toBe(true);
    expect(errors.some((e) => e.path === 'tasks.1.input.name')).toBe(true);
  });

  it('rejects unknown fields at plan, task and input level', () => {
    expect(errorsOf({ tasks: [echo('a')], extra: 1 })).not.toHaveLength(0);
    expect(errorsOf({ tasks: [echo('a', { extra: 1 })] })).not.toHaveLength(0);
    expect(errorsOf({ tasks: [echo('a', { input: { name: 'x', extra: 1 } })] })).not.toHaveLength(
      0,
    );
  });

  it('accepts 50 tasks and rejects 51', () => {
    const make = (n: number) => ({ tasks: Array.from({ length: n }, (_, i) => echo(`t${i}`)) });
    expect(validatePlan(make(50), registry).ok).toBe(true);
    expect(validatePlan(make(51), registry).ok).toBe(false);
  });

  it('enforces priority, attempts and timeout bounds', () => {
    for (const patch of [
      { priority: -1 },
      { priority: 10 },
      { maxAttempts: 0 },
      { maxAttempts: 6 },
      { timeoutMs: 99 },
      { timeoutMs: 300001 },
    ]) {
      expect(validatePlan({ tasks: [echo('a', patch)] }, registry).ok).toBe(false);
    }
    expect(
      validatePlan(
        { tasks: [echo('a', { priority: 0, maxAttempts: 5, timeoutMs: 300000 })] },
        registry,
      ).ok,
    ).toBe(true);
  });

  it('rejects an input larger than 16 KB', () => {
    const big = { tasks: [echo('a', { input: { name: 'x'.repeat(17 * 1024) } })] };
    expect(errorsOf(big).some((e) => e.message.includes('16 KB'))).toBe(true);
  });

  it('reports several errors together', () => {
    const errors = errorsOf({
      tasks: [echo('a', { dependsOn: ['nope'] }), { key: 'b', type: 'nope', input: {} }],
    });
    expect(errors.length).toBeGreaterThanOrEqual(2);
  });

  it('accepts the demo plan with the default handler schemas', async () => {
    const { createDefaultRegistry } = await import('../src/engine/handlers');
    const defaults = createDefaultRegistry({
      prisma: undefined as never,
      apiBaseUrl: 'http://127.0.0.1:1',
    });
    expect(validatePlan(DEMO_PLAN, defaults).ok).toBe(true);
  });
});
