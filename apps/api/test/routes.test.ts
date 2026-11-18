import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
  commandResponseSchema,
  errorEnvelopeSchema,
  systemStatusSchema,
  taskSchema,
} from '@jobintel/contracts';
import { buildApp } from '../src/app';
import { createTestDb } from './helpers/db';
import {
  clearTables,
  createFullRegistry,
  createTestEngine,
  seedTask,
  waitForStatus,
} from './helpers/engine';

const db = createTestDb();
const { registry, test } = createFullRegistry(db.prisma);
const engine = createTestEngine(db.prisma, registry);
const app = buildApp(db.prisma, engine);

beforeAll(() => engine.start());
beforeEach(async () => {
  await engine.resume();
});
afterAll(async () => {
  await engine.stop();
  await app.close();
  await db.cleanup();
});

const command = (text: string, headers: Record<string, string> = {}) =>
  app.inject({
    method: 'POST',
    url: '/api/commands',
    headers: { 'content-type': 'application/json', ...headers },
    payload: { command: text },
  });

function expectError(res: { statusCode: number; json(): unknown }, status: number, code: string) {
  expect(res.statusCode).toBe(status);
  expect(errorEnvelopeSchema.parse(res.json()).error.code).toBe(code);
}

describe('commands', () => {
  it('runs /help and /status', async () => {
    const help = commandResponseSchema.parse((await command('/help')).json());
    expect(help.output).toContain('/plans demo');
    const status = commandResponseSchema.parse((await command('/status')).json());
    expect(status.output).toContain('database: ok');
  });

  it('rejects natural language, unknown commands and bad arguments', async () => {
    expectError(await command('find me a job'), 400, 'NOT_A_COMMAND');
    expectError(await command('/frobnicate'), 400, 'UNKNOWN_COMMAND');
    expectError(await command('/tasks show abc'), 400, 'INVALID_ARGUMENTS');
  });

  it('validates the body and rejects unknown fields', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/commands',
      payload: { command: '/help', extra: 1 },
    });
    expectError(res, 400, 'VALIDATION_FAILED');
  });

  it('creates the demo plan, lists and shows it', async () => {
    const created = commandResponseSchema.parse((await command('/plans demo')).json());
    const { planId } = created.data as { planId: number };
    expect(created.output).toContain(String(planId));
    const list = await command('/plans list');
    expect(commandResponseSchema.parse(list.json()).output).toContain(`#${planId}`);
    const show = await command(`/plans show ${planId}`);
    expect(commandResponseSchema.parse(show.json()).output).toContain('wait-a');
    const res = await app.inject({ method: 'GET', url: `/api/plans/${planId}` });
    expect(res.statusCode).toBe(200);
    expect(res.json().tasks).toHaveLength(4);
    // The demo's health-check cannot reach this test's API URL, so only the first task is awaited.
    await waitForStatus(db.prisma, planId, 'hello', 'COMPLETED');
  });

  it('reports an invalid plan with details', async () => {
    const res = await command('/plans create {"tasks":[{"key":"a","type":"nope"}]}');
    expectError(res, 400, 'PLAN_INVALID');
    expect(res.json().error.details.length).toBeGreaterThan(0);
  });

  it('replays an Idempotency-Key and conflicts on a different command', async () => {
    const headers = { 'idempotency-key': 'key-1' };
    const first = (await command('/plans demo', headers)).json().data;
    const second = (await command('/plans demo', headers)).json().data;
    expect(second.planId).toBe(first.planId);
    expect(second.replayed).toBe(true);
    expectError(
      await command(
        '/plans create {"tasks":[{"key":"a","type":"system.echo","input":{"message":"x"}}]}',
        headers,
      ),
      409,
      'IDEMPOTENCY_CONFLICT',
    );
    expectError(
      await command('/plans demo', { 'idempotency-key': 'bad key!' }),
      400,
      'VALIDATION_FAILED',
    );
  });

  it('cancels a task through /tasks cancel and shows it', async () => {
    const created = (
      await command(
        '/plans create {"tasks":[{"key":"d","type":"system.delay","input":{"ms":30000}}]}',
      )
    ).json();
    const plan = (await app.inject({ url: `/api/plans/${created.data.planId}` })).json();
    const id = plan.tasks[0].id as number;
    await waitForStatus(db.prisma, created.data.planId, 'd', 'RUNNING');
    const cancel = await command(`/tasks cancel ${id}`);
    expect(cancel.statusCode).toBe(200);
    expect(cancel.json().output).toContain('cancellation requested');
    await waitForStatus(db.prisma, created.data.planId, 'd', 'CANCELLED');
    expect((await command(`/tasks show ${id}`)).json().output).toContain('CANCELLED');
    expectError(await command('/tasks show 99999'), 404, 'NOT_FOUND');
  });

  it('pauses and resumes through commands', async () => {
    expect((await command('/pause')).json().output).toBe('paused');
    expect((await command('/pause')).json().output).toBe('already paused');
    expect((await command('/resume')).json().output).toBe('resumed');
  });
});

describe('REST routes', () => {
  it('lists plans and tasks with validated queries', async () => {
    await command('/plans demo');
    const plans = await app.inject({ url: '/api/plans?limit=1' });
    expect(plans.statusCode).toBe(200);
    expect(plans.json().plans).toHaveLength(1);
    const tasks = await app.inject({ url: '/api/tasks?status=COMPLETED' });
    expect(tasks.statusCode).toBe(200);
    expectError(await app.inject({ url: '/api/plans?limit=500' }), 400, 'VALIDATION_FAILED');
    expectError(await app.inject({ url: '/api/tasks?status=NOPE' }), 400, 'VALIDATION_FAILED');
    expectError(await app.inject({ url: '/api/plans/abc' }), 400, 'VALIDATION_FAILED');
    expectError(await app.inject({ url: '/api/plans/99999' }), 404, 'NOT_FOUND');
  });

  it('returns a task with its events', async () => {
    const { taskId } = await seedTask(db.prisma, { type: 'system.echo', status: 'COMPLETED' });
    const res = await app.inject({ url: `/api/tasks/${taskId}` });
    expect(res.statusCode).toBe(200);
    expect(taskSchema.parse(res.json().task).id).toBe(taskId);
    expect(Array.isArray(res.json().events)).toBe(true);
    expectError(await app.inject({ url: '/api/tasks/99999' }), 404, 'NOT_FOUND');
  });

  it('cancel: 200 for queued, 202 for running, 409 for finished, 404 unknown', async () => {
    await engine.pause();
    const { taskId: queued } = await seedTask(db.prisma, { type: 'system.echo', status: 'QUEUED' });
    const a = await app.inject({ method: 'POST', url: `/api/tasks/${queued}/cancel` });
    expect(a.statusCode).toBe(200);
    expect(a.json().task.status).toBe('CANCELLED');
    expect(
      (await app.inject({ method: 'POST', url: `/api/tasks/${queued}/cancel` })).statusCode,
    ).toBe(200);
    await engine.resume();

    const { taskId: done } = await seedTask(db.prisma, {
      type: 'system.echo',
      status: 'COMPLETED',
    });
    expectError(
      await app.inject({ method: 'POST', url: `/api/tasks/${done}/cancel` }),
      409,
      'INVALID_TRANSITION',
    );
    expectError(
      await app.inject({ method: 'POST', url: '/api/tasks/99999/cancel' }),
      404,
      'NOT_FOUND',
    );

    const planCreated = (
      await command(
        '/plans create {"tasks":[{"key":"w","type":"test.wait","input":{"name":"route-cancel"}}]}',
      )
    ).json();
    const row = await waitForStatus(db.prisma, planCreated.data.planId, 'w', 'RUNNING');
    const running = await app.inject({ method: 'POST', url: `/api/tasks/${row.id}/cancel` });
    expect(running.statusCode).toBe(202);
    expect(running.json().task.cancelRequested).toBe(true);
    test.release('route-cancel');
    await waitForStatus(db.prisma, planCreated.data.planId, 'w', 'CANCELLED');
  });

  it('pause, resume and status', async () => {
    const paused = await app.inject({ method: 'POST', url: '/api/system/pause' });
    expect(paused.statusCode).toBe(200);
    expect(paused.json().status.paused).toBe(true);
    const status = await app.inject({ url: '/api/system/status' });
    expect(systemStatusSchema.parse(status.json()).paused).toBe(true);
    const resumed = await app.inject({ method: 'POST', url: '/api/system/resume' });
    expect(resumed.json().status.paused).toBe(false);
  });

  it('health still works', async () => {
    const res = await app.inject({ url: '/api/health' });
    expect(res.statusCode).toBe(200);
    expect(res.json().database).toBe('ok');
  });
});

describe('guards and envelope', () => {
  it('rejects foreign Host headers, allows localhost and 127.0.0.1', async () => {
    expectError(
      await app.inject({ url: '/api/health', headers: { host: 'evil.example' } }),
      403,
      'FORBIDDEN_HOST',
    );
    expectError(
      await app.inject({ url: '/api/health', headers: { host: 'evil.example:3000' } }),
      403,
      'FORBIDDEN_HOST',
    );
    expect(
      (await app.inject({ url: '/api/health', headers: { host: '127.0.0.1:5173' } })).statusCode,
    ).toBe(200);
    expect(
      (await app.inject({ url: '/api/health', headers: { host: 'localhost:3000' } })).statusCode,
    ).toBe(200);
  });

  it('uses the envelope for 404, 413, 415 and bad JSON', async () => {
    expectError(await app.inject({ url: '/api/nope' }), 404, 'NOT_FOUND');
    const big = await app.inject({
      method: 'POST',
      url: '/api/commands',
      headers: { 'content-type': 'application/json' },
      payload: JSON.stringify({ command: 'x'.repeat(70_000) }),
    });
    expectError(big, 413, 'PAYLOAD_TOO_LARGE');
    const text = await app.inject({
      method: 'POST',
      url: '/api/commands',
      headers: { 'content-type': 'text/plain' },
      payload: '/help',
    });
    expectError(text, 415, 'UNSUPPORTED_MEDIA_TYPE');
    const bad = await app.inject({
      method: 'POST',
      url: '/api/commands',
      headers: { 'content-type': 'application/json' },
      payload: '{not json',
    });
    expectError(bad, 400, 'VALIDATION_FAILED');
  });

  it('clears tables helper stays usable', async () => {
    await clearTables(db.prisma);
    expect((await app.inject({ url: '/api/plans' })).json().plans).toEqual([]);
  });
});
