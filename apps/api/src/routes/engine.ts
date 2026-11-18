import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import {
  commandRequestSchema,
  commandResponseSchema,
  executionEventSchema,
  healthResponseSchema,
  planSchema,
  planSummarySchema,
  systemStatusSchema,
  taskSchema,
  taskStatusSchema,
} from '@jobintel/contracts';
import { sendError, VERSION } from '../app';
import type { PrismaClient } from '../db';
import { executeCommandText } from '../engine/commands';
import type { Engine } from '../engine/engine';

const idParams = z.strictObject({ id: z.string().regex(/^[1-9]\d{0,14}$/) });
const limit = z.coerce.number().int().min(1).max(200).optional();
const listPlansQuery = z.strictObject({ limit });
const listTasksQuery = z.strictObject({
  status: taskStatusSchema.optional(),
  planId: z.coerce.number().int().min(1).optional(),
  limit,
});
const idempotencyKeySchema = z.string().regex(/^[A-Za-z0-9_-]{1,100}$/);

const plansResponse = z.object({ plans: z.array(planSummarySchema) });
const planResponse = z.object({ plan: planSchema, tasks: z.array(taskSchema) });
const tasksResponse = z.object({ tasks: z.array(taskSchema) });
const taskDetailResponse = z.object({ task: taskSchema, events: z.array(executionEventSchema) });
const taskResponse = z.object({ task: taskSchema });
const statusResponse = z.object({ status: systemStatusSchema });

export function registerEngineRoutes(app: FastifyInstance, prisma: PrismaClient, engine: Engine) {
  const database = async (): Promise<'ok' | 'error'> => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      return 'ok';
    } catch {
      return 'error';
    }
  };

  app.get('/api/health', async () =>
    healthResponseSchema.parse({
      status: 'ok',
      database: await database(),
      version: VERSION,
      time: new Date().toISOString(),
    }),
  );

  app.post('/api/commands', async (request, reply) => {
    if (!(request.headers['content-type'] ?? '').toLowerCase().startsWith('application/json')) {
      return sendError(reply, 415, 'UNSUPPORTED_MEDIA_TYPE', 'send application/json');
    }
    const body = commandRequestSchema.safeParse(request.body);
    if (!body.success) {
      return sendError(reply, 400, 'VALIDATION_FAILED', 'invalid request body', body.error.issues);
    }
    const header = request.headers['idempotency-key'];
    let idempotencyKey: string | undefined;
    if (header !== undefined) {
      const key = idempotencyKeySchema.safeParse(header);
      if (!key.success) {
        return sendError(reply, 400, 'VALIDATION_FAILED', 'invalid Idempotency-Key header');
      }
      idempotencyKey = key.data;
    }
    const outcome = await executeCommandText(engine, body.data.command, {
      idempotencyKey,
      database,
    });
    if (!outcome.ok) {
      return sendError(reply, outcome.status, outcome.code, outcome.message, outcome.details);
    }
    return commandResponseSchema.parse({ output: outcome.output, data: outcome.data });
  });

  app.get('/api/plans', async (request, reply) => {
    const q = listPlansQuery.safeParse(request.query);
    if (!q.success) {
      return sendError(reply, 400, 'VALIDATION_FAILED', 'invalid query', q.error.issues);
    }
    return plansResponse.parse({ plans: await engine.listPlans(q.data.limit) });
  });

  app.get('/api/plans/:id', async (request, reply) => {
    const p = idParams.safeParse(request.params);
    if (!p.success) return sendError(reply, 400, 'VALIDATION_FAILED', 'invalid plan id');
    const found = await engine.getPlan(Number(p.data.id));
    if (!found) return sendError(reply, 404, 'NOT_FOUND', 'plan not found');
    return planResponse.parse(found);
  });

  app.get('/api/tasks', async (request, reply) => {
    const q = listTasksQuery.safeParse(request.query);
    if (!q.success) {
      return sendError(reply, 400, 'VALIDATION_FAILED', 'invalid query', q.error.issues);
    }
    return tasksResponse.parse({ tasks: await engine.listTasks(q.data) });
  });

  app.get('/api/tasks/:id', async (request, reply) => {
    const p = idParams.safeParse(request.params);
    if (!p.success) return sendError(reply, 400, 'VALIDATION_FAILED', 'invalid task id');
    const id = Number(p.data.id);
    const task = await engine.getTask(id);
    if (!task) return sendError(reply, 404, 'NOT_FOUND', 'task not found');
    return taskDetailResponse.parse({ task, events: await engine.taskEvents(id) });
  });

  app.post('/api/tasks/:id/cancel', async (request, reply) => {
    const p = idParams.safeParse(request.params);
    if (!p.success) return sendError(reply, 400, 'VALIDATION_FAILED', 'invalid task id');
    const r = await engine.cancelTask(Number(p.data.id));
    if (r.kind === 'not-found') return sendError(reply, 404, 'NOT_FOUND', 'task not found');
    if (r.kind === 'conflict') {
      return sendError(
        reply,
        409,
        'INVALID_TRANSITION',
        `task is ${r.task.status} and cannot be cancelled`,
      );
    }
    return reply
      .status(r.kind === 'requested' ? 202 : 200)
      .send(taskResponse.parse({ task: r.task }));
  });

  app.post('/api/system/pause', async () => {
    await engine.pause();
    return statusResponse.parse({ status: await engine.status() });
  });

  app.post('/api/system/resume', async () => {
    await engine.resume();
    return statusResponse.parse({ status: await engine.status() });
  });

  app.get('/api/system/status', async () => systemStatusSchema.parse(await engine.status()));
}
