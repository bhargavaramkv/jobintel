import {
  commandResponseSchema,
  errorEnvelopeSchema,
  executionEventSchema,
  planSummarySchema,
  systemStatusSchema,
  taskSchema,
  type ExecutionEvent,
  type PlanSummary,
  type SystemStatus,
  type Task,
} from '@jobintel/contracts';

export type CommandResult = { ok: true; output: string } | { ok: false; text: string };

/** Send one line to the server; the server decides what it means. */
export async function postCommand(command: string): Promise<CommandResult> {
  let res: Response;
  try {
    res = await fetch('/api/commands', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'idempotency-key': crypto.randomUUID() },
      body: JSON.stringify({ command }),
    });
  } catch {
    return { ok: false, text: 'API unreachable' };
  }
  try {
    const body: unknown = await res.json();
    if (res.ok) return { ok: true, output: commandResponseSchema.parse(body).output };
    const { error } = errorEnvelopeSchema.parse(body);
    const details = Array.isArray(error.details) ? error.details : [];
    const rows = details.map((d) => {
      const detail = d as { path?: unknown; message?: unknown };
      return typeof detail.message === 'string'
        ? `  ${typeof detail.path === 'string' && detail.path ? `${detail.path}: ` : ''}${detail.message}`
        : `  ${JSON.stringify(d)}`;
    });
    return { ok: false, text: [error.message, ...rows].join('\n') };
  } catch {
    return { ok: false, text: `unexpected response from the API (HTTP ${res.status})` };
  }
}

async function getJson(url: string, init?: RequestInit): Promise<unknown> {
  const res = await fetch(url, init);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function fetchStatus(): Promise<SystemStatus> {
  return systemStatusSchema.parse(await getJson('/api/system/status'));
}

export async function fetchTasks(limit = 30): Promise<Task[]> {
  const body = (await getJson(`/api/tasks?limit=${limit}`)) as { tasks: unknown };
  return taskSchema.array().parse(body.tasks);
}

export async function fetchPlans(limit = 8): Promise<PlanSummary[]> {
  const body = (await getJson(`/api/plans?limit=${limit}`)) as { plans: unknown };
  return planSummarySchema.array().parse(body.plans);
}

export async function fetchTaskDetail(
  id: number,
): Promise<{ task: Task; events: ExecutionEvent[] }> {
  const body = (await getJson(`/api/tasks/${id}`)) as { task: unknown; events: unknown };
  return {
    task: taskSchema.parse(body.task),
    events: executionEventSchema.array().parse(body.events),
  };
}

export async function cancelTask(id: number): Promise<void> {
  const res = await fetch(`/api/tasks/${id}/cancel`, { method: 'POST' });
  // 409: the task finished before the click landed; the refresh that follows shows the truth.
  if (!res.ok && res.status !== 409) throw new Error(`HTTP ${res.status}`);
}

export async function setPaused(paused: boolean): Promise<void> {
  await getJson(`/api/system/${paused ? 'pause' : 'resume'}`, { method: 'POST' });
}

/** One compact output line per execution event. */
export function formatEvent(e: ExecutionEvent): string {
  const d = e.data;
  switch (e.type) {
    case 'plan.created':
      return `plan ${e.planId} created (${String(d.taskCount)} tasks)`;
    case 'plan.status':
      return `plan ${e.planId} ${String(d.to)}`;
    case 'task.status': {
      const attempt = d.to === 'RUNNING' ? ` (attempt ${String(d.attempt)})` : '';
      return `task ${e.taskId} ${String(d.key)} ${String(d.from)} -> ${String(d.to)}${attempt}`;
    }
    case 'task.log':
      return `task ${e.taskId} log: ${String(d.message)}`;
    case 'system.status':
      return `engine ${d.paused ? 'paused' : 'running'}`;
  }
}
