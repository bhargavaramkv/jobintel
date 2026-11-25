import { createHash } from 'node:crypto';
import {
  TASK_STATUSES,
  type Plan,
  type PlanSpec,
  type PlanSummary,
  type Task,
  type TaskStatus,
} from '@jobintel/contracts';
import type { Engine } from './engine';

export type Command =
  | { kind: 'help' }
  | { kind: 'status' }
  | { kind: 'pause' }
  | { kind: 'resume' }
  | { kind: 'tasks.list'; status?: TaskStatus }
  | { kind: 'tasks.show'; id: number }
  | { kind: 'tasks.cancel'; id: number }
  | { kind: 'plans.list' }
  | { kind: 'plans.show'; id: number }
  | { kind: 'plans.create'; spec: unknown }
  | { kind: 'plans.demo' };

export interface CommandError {
  error: { code: 'NOT_A_COMMAND' | 'UNKNOWN_COMMAND' | 'INVALID_ARGUMENTS'; message: string };
}

export const NOT_A_COMMAND_MESSAGE =
  "JobIntel only understands commands, and they start with '/'. Natural-language requests are not supported. Type /help.";

const USAGE = {
  tasks: '/tasks [list [<status>] | show <id> | cancel <id>]',
  plans: '/plans [list | show <id> | create <json> | demo]',
  tasksList: '/tasks list [<status>]',
  tasksShow: '/tasks show <id>',
  tasksCancel: '/tasks cancel <id>',
  plansShow: '/plans show <id>',
  plansCreate: '/plans create <json>',
} as const;

/** The fixed plan created by `/plans demo`: a diamond. */
export const DEMO_PLAN: PlanSpec = {
  name: 'demo',
  tasks: [
    { key: 'hello', type: 'system.echo', input: { message: 'hello' }, dependsOn: [], priority: 5 },
    { key: 'wait-a', type: 'system.delay', input: { ms: 2000 }, dependsOn: ['hello'], priority: 5 },
    { key: 'wait-b', type: 'system.delay', input: { ms: 1000 }, dependsOn: ['hello'], priority: 5 },
    {
      key: 'check',
      type: 'system.health-check',
      input: {},
      dependsOn: ['wait-a', 'wait-b'],
      priority: 5,
    },
  ],
};

function invalid(usage: string): CommandError {
  return { error: { code: 'INVALID_ARGUMENTS', message: `usage: ${usage}` } };
}

function parseId(token: string | undefined): number | undefined {
  return token !== undefined && /^[1-9]\d{0,14}$/.test(token) ? Number(token) : undefined;
}

/** Pure command parser. No I/O, no LLM. */
export function parseCommand(text: string): Command | CommandError {
  const input = text.trim();
  if (!input.startsWith('/')) {
    const bare = input.toLowerCase();
    if (bare === 'help') return { kind: 'help' };
    if (bare === 'status') return { kind: 'status' };
    return { error: { code: 'NOT_A_COMMAND', message: NOT_A_COMMAND_MESSAGE } };
  }

  const head = /^\/(\S*)(?:\s+([\s\S]*))?$/.exec(input);
  const word = (head?.[1] ?? '').toLowerCase();
  const rest = (head?.[2] ?? '').trim();
  const args = rest === '' ? [] : rest.split(/\s+/);

  switch (word) {
    case 'help':
    case 'status':
    case 'pause':
    case 'resume':
      return args.length === 0 ? { kind: word } : invalid(`/${word}`);
    case 'tasks':
      return parseTasks(args);
    case 'plans':
      return parsePlans(args, rest);
    default:
      return {
        error: { code: 'UNKNOWN_COMMAND', message: `unknown command "/${word}". Type /help.` },
      };
  }
}

function parseTasks(args: string[]): Command | CommandError {
  const sub = (args[0] ?? 'list').toLowerCase();
  if (sub === 'list') {
    if (args.length > 2) return invalid(USAGE.tasksList);
    if (args[1] === undefined) return { kind: 'tasks.list' };
    const status = args[1].toUpperCase();
    const known = TASK_STATUSES.find((s) => s === status);
    return known ? { kind: 'tasks.list', status: known } : invalid(USAGE.tasksList);
  }
  if (sub === 'show' || sub === 'cancel') {
    const id = parseId(args[1]);
    const usage = sub === 'show' ? USAGE.tasksShow : USAGE.tasksCancel;
    if (args.length !== 2 || id === undefined) return invalid(usage);
    return { kind: sub === 'show' ? 'tasks.show' : 'tasks.cancel', id };
  }
  return invalid(USAGE.tasks);
}

function parsePlans(args: string[], rest: string): Command | CommandError {
  const sub = (args[0] ?? 'list').toLowerCase();
  if (sub === 'list' || sub === 'demo') {
    if (args.length > 1) return invalid(`/plans ${sub}`);
    return { kind: sub === 'list' ? 'plans.list' : 'plans.demo' };
  }
  if (sub === 'show') {
    const id = parseId(args[1]);
    if (args.length !== 2 || id === undefined) return invalid(USAGE.plansShow);
    return { kind: 'plans.show', id };
  }
  if (sub === 'create') {
    // Everything after the subcommand is JSON, so it is not split on whitespace.
    const json = rest.slice(args[0]?.length ?? 0).trim();
    if (json === '') return invalid(USAGE.plansCreate);
    try {
      return { kind: 'plans.create', spec: JSON.parse(json) };
    } catch {
      return invalid(`${USAGE.plansCreate} (the JSON could not be parsed)`);
    }
  }
  return invalid(USAGE.plans);
}

export type CommandOutcome =
  | { ok: true; output: string; data?: unknown }
  | { ok: false; status: number; code: string; message: string; details?: unknown };

export interface CommandContext {
  /** The raw command text; only its hash is used (idempotency). */
  text: string;
  idempotencyKey?: string;
  database: () => Promise<'ok' | 'error'>;
}

const HELP = [
  'Commands:',
  '  /help                         show this list',
  '  /status                       engine and database status',
  '  /tasks [list [<status>]]      list tasks, newest first',
  '  /tasks show <id>              one task with its recent events',
  '  /tasks cancel <id>            cancel a task',
  '  /plans [list]                 list plans',
  '  /plans show <id>              one plan with its tasks',
  '  /plans create <json>          create a plan from a PlanSpec JSON object',
  '  /plans demo                   create a small demo plan',
  '  /pause                        stop starting new tasks',
  '  /resume                       start tasks again',
].join('\n');

const fail = (
  status: number,
  code: string,
  message: string,
  details?: unknown,
): CommandOutcome => ({
  ok: false,
  status,
  code,
  message,
  ...(details === undefined ? {} : { details }),
});

const counts = (c: Record<string, number>) =>
  Object.entries(c)
    .filter(([, n]) => n > 0)
    .map(([k, n]) => `${k}=${n}`)
    .join(' ') || 'none';

const taskLine = (t: Task) =>
  `#${t.id} plan ${t.planId} ${t.key} (${t.type}) ${t.status} attempt ${t.attempts}/${t.maxAttempts}`;
const planLine = (p: Plan | PlanSummary) => `#${p.id} ${p.name ?? '(unnamed)'} ${p.status}`;

/** Execute a parsed command against the engine. No I/O besides the engine and `ctx.database`. */
export async function runCommand(
  engine: Engine,
  cmd: Command,
  ctx: CommandContext,
): Promise<CommandOutcome> {
  switch (cmd.kind) {
    case 'help':
      return { ok: true, output: HELP };
    case 'status': {
      const [status, database] = await Promise.all([engine.status(), ctx.database()]);
      const output = [
        `database: ${database}`,
        `engine: ${status.paused ? 'paused' : 'running'}`,
        `active: ${status.active}/${status.concurrency}`,
        `tasks: ${counts(status.counts)}`,
      ].join('\n');
      return { ok: true, output, data: { ...status, database } };
    }
    case 'pause': {
      const changed = await engine.pause();
      return { ok: true, output: changed ? 'paused' : 'already paused' };
    }
    case 'resume': {
      const changed = await engine.resume();
      return { ok: true, output: changed ? 'resumed' : 'already running' };
    }
    case 'tasks.list': {
      const tasks = await engine.listTasks({ status: cmd.status });
      return {
        ok: true,
        output: tasks.length === 0 ? 'no tasks' : tasks.map(taskLine).join('\n'),
        data: { tasks },
      };
    }
    case 'tasks.show': {
      const task = await engine.getTask(cmd.id);
      if (!task) return fail(404, 'NOT_FOUND', `task ${cmd.id} not found`);
      const events = await engine.taskEvents(cmd.id);
      const lines = [taskLine(task)];
      if (task.dependsOn.length > 0) lines.push(`depends on: ${task.dependsOn.join(', ')}`);
      if (task.error) lines.push(`error: ${task.error.code}: ${task.error.message}`);
      if (task.cancelRequested) lines.push('cancel requested');
      for (const e of events) {
        const d = e.data as Record<string, unknown>;
        lines.push(
          e.type === 'task.log'
            ? `  ${e.at} log ${String(d.level)}: ${String(d.message)}`
            : `  ${e.at} ${String(d.from)} -> ${String(d.to)}`,
        );
      }
      return { ok: true, output: lines.join('\n'), data: { task, events } };
    }
    case 'tasks.cancel': {
      const r = await engine.cancelTask(cmd.id);
      if (r.kind === 'not-found') return fail(404, 'NOT_FOUND', `task ${cmd.id} not found`);
      if (r.kind === 'conflict') {
        return fail(
          409,
          'INVALID_TRANSITION',
          `task ${cmd.id} is ${r.task.status} and cannot be cancelled`,
        );
      }
      const output = {
        cancelled: `task ${cmd.id} cancelled`,
        'already-cancelled': `task ${cmd.id} was already cancelled`,
        requested: `cancellation requested for running task ${cmd.id}`,
      }[r.kind];
      return { ok: true, output, data: { task: r.task } };
    }
    case 'plans.list': {
      const plans = await engine.listPlans();
      const rows = plans.map((p) => `${planLine(p)} [${counts(p.counts)}]`);
      return {
        ok: true,
        output: rows.length === 0 ? 'no plans' : rows.join('\n'),
        data: { plans },
      };
    }
    case 'plans.show': {
      const found = await engine.getPlan(cmd.id);
      if (!found) return fail(404, 'NOT_FOUND', `plan ${cmd.id} not found`);
      const output = [planLine(found.plan), ...found.tasks.map((t) => `  ${taskLine(t)}`)].join(
        '\n',
      );
      return { ok: true, output, data: found };
    }
    case 'plans.create':
    case 'plans.demo': {
      const spec = cmd.kind === 'plans.demo' ? DEMO_PLAN : cmd.spec;
      const hash = createHash('sha256').update(ctx.text).digest('hex');
      const result = await engine.createPlan(spec, ctx.idempotencyKey, hash);
      if (!result.ok) return fail(400, 'PLAN_INVALID', 'the plan is not valid', result.errors);
      const { outcome } = result;
      if (outcome.kind === 'conflict') {
        return fail(
          409,
          'IDEMPOTENCY_CONFLICT',
          'that Idempotency-Key was used for a different command',
        );
      }
      const replayed = outcome.kind === 'replayed';
      return {
        ok: true,
        output: `${replayed ? 'plan already created' : 'created plan'} ${outcome.planId}`,
        data: { planId: outcome.planId, ...(replayed ? { replayed: true } : {}) },
      };
    }
  }
}

/** Parse and run one line of input. */
export async function executeCommandText(
  engine: Engine,
  text: string,
  ctx: Omit<CommandContext, 'text'>,
): Promise<CommandOutcome> {
  const parsed = parseCommand(text);
  if ('error' in parsed) return fail(400, parsed.error.code, parsed.error.message);
  return runCommand(engine, parsed, { ...ctx, text });
}
