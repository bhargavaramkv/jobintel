import { planSpecSchema } from '@jobintel/contracts';
import type { Registry } from './handlers';

export interface PlanError {
  path: string;
  message: string;
}

export interface NormalizedTask {
  key: string;
  type: string;
  input: unknown;
  dependsOn: string[];
  priority: number;
  maxAttempts: number;
  timeoutMs: number;
}

export interface NormalizedPlan {
  name?: string;
  tasks: NormalizedTask[];
}

export type PlanValidation =
  { ok: true; plan: NormalizedPlan } | { ok: false; errors: PlanError[] };

const MAX_INPUT_BYTES = 16 * 1024;

function pathOf(parts: readonly PropertyKey[]): string {
  return parts.map(String).join('.');
}

/** Validate a plan spec without touching the database. Collects all errors, not only the first. */
export function validatePlan(spec: unknown, registry: Registry): PlanValidation {
  const parsed = planSpecSchema.safeParse(spec);
  if (!parsed.success) {
    return {
      ok: false,
      errors: parsed.error.issues.map((i) => ({ path: pathOf(i.path), message: i.message })),
    };
  }

  const errors: PlanError[] = [];
  const tasks: NormalizedTask[] = [];
  const keys = new Set<string>();
  const duplicates = new Set<string>();
  for (const t of parsed.data.tasks) {
    if (keys.has(t.key)) duplicates.add(t.key);
    keys.add(t.key);
  }

  parsed.data.tasks.forEach((t, i) => {
    const at = `tasks.${i}`;
    if (duplicates.has(t.key))
      errors.push({ path: `${at}.key`, message: `duplicate key "${t.key}"` });

    const seen = new Set<string>();
    t.dependsOn.forEach((dep, j) => {
      const p = `${at}.dependsOn.${j}`;
      if (dep === t.key) errors.push({ path: p, message: `task "${t.key}" depends on itself` });
      else if (!keys.has(dep)) errors.push({ path: p, message: `unknown dependency "${dep}"` });
      if (seen.has(dep)) errors.push({ path: p, message: `duplicate dependency "${dep}"` });
      seen.add(dep);
    });

    const handler = registry.get(t.type);
    if (!handler) {
      errors.push({ path: `${at}.type`, message: `unknown task type "${t.type}"` });
      return;
    }
    const input = handler.input.safeParse(t.input);
    if (!input.success) {
      for (const issue of input.error.issues) {
        errors.push({
          path: pathOf([...at.split('.'), 'input', ...issue.path]),
          message: issue.message,
        });
      }
      return;
    }
    if (Buffer.byteLength(JSON.stringify(input.data)) > MAX_INPUT_BYTES) {
      errors.push({ path: `${at}.input`, message: 'input is larger than 16 KB' });
      return;
    }
    tasks.push({
      key: t.key,
      type: t.type,
      input: input.data,
      dependsOn: t.dependsOn,
      priority: t.priority,
      maxAttempts: t.maxAttempts ?? handler.defaults.maxAttempts,
      timeoutMs: t.timeoutMs ?? handler.defaults.timeoutMs,
    });
  });

  const cycle = findCycle(parsed.data.tasks.map((t) => ({ key: t.key, dependsOn: t.dependsOn })));
  if (cycle.length > 0) {
    errors.push({ path: 'tasks', message: `dependency cycle among: ${cycle.join(', ')}` });
  }

  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, plan: { name: parsed.data.name, tasks } };
}

/** Kahn's algorithm over valid edges; returns the keys left over (empty when acyclic). */
function findCycle(nodes: { key: string; dependsOn: string[] }[]): string[] {
  const keys = new Set(nodes.map((n) => n.key));
  const indegree = new Map<string, number>();
  const dependents = new Map<string, string[]>();
  for (const n of nodes) {
    const deps = [...new Set(n.dependsOn)].filter((d) => keys.has(d) && d !== n.key);
    indegree.set(n.key, deps.length);
    for (const d of deps) dependents.set(d, [...(dependents.get(d) ?? []), n.key]);
  }
  const ready = [...indegree].filter(([, d]) => d === 0).map(([k]) => k);
  const done = new Set<string>();
  while (ready.length > 0) {
    const k = ready.pop() as string;
    done.add(k);
    for (const next of dependents.get(k) ?? []) {
      const d = (indegree.get(next) ?? 0) - 1;
      indegree.set(next, d);
      if (d === 0) ready.push(next);
    }
  }
  return [...indegree.keys()].filter((k) => !done.has(k));
}
