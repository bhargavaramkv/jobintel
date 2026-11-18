import { z } from 'zod';

export const TASK_STATUSES = [
  'PENDING',
  'BLOCKED',
  'QUEUED',
  'RUNNING',
  'RETRYING',
  'COMPLETED',
  'FAILED',
  'CANCELLED',
] as const;
export const taskStatusSchema = z.enum(TASK_STATUSES);
export type TaskStatus = z.infer<typeof taskStatusSchema>;

export const PLAN_STATUSES = ['ACTIVE', 'COMPLETED', 'FAILED', 'CANCELLED'] as const;
export const planStatusSchema = z.enum(PLAN_STATUSES);
export type PlanStatus = z.infer<typeof planStatusSchema>;

/** Input schema per handler type. All strict so unknown fields are rejected. */
export const taskInputSchemas = {
  'system.echo': z.strictObject({ message: z.string().min(1).max(1000) }),
  'system.delay': z.strictObject({ ms: z.int().min(0).max(60000) }),
  'system.health-check': z.strictObject({}),
} as const;

export const planSpecTaskSchema = z.strictObject({
  key: z.string().regex(/^[a-z0-9][a-z0-9-]{0,31}$/),
  type: z.string().min(1).max(100),
  input: z.unknown().default({}),
  dependsOn: z.array(z.string()).default([]),
  priority: z.int().min(0).max(9).default(5),
  maxAttempts: z.int().min(1).max(5).optional(),
  timeoutMs: z.int().min(100).max(300000).optional(),
});

export const planSpecSchema = z.strictObject({
  name: z.string().min(1).max(100).optional(),
  tasks: z.array(planSpecTaskSchema).min(1).max(50),
});
export type PlanSpec = z.infer<typeof planSpecSchema>;

export const commandRequestSchema = z.strictObject({ command: z.string().min(1).max(32768) });
export type CommandRequest = z.infer<typeof commandRequestSchema>;

export const commandResponseSchema = z.object({
  output: z.string(),
  data: z.unknown().optional(),
});
export type CommandResponse = z.infer<typeof commandResponseSchema>;

export const errorEnvelopeSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.unknown().optional(),
  }),
});
export type ErrorEnvelope = z.infer<typeof errorEnvelopeSchema>;

const dateString = z.string();

export const taskSchema = z.object({
  id: z.number().int(),
  planId: z.number().int(),
  key: z.string(),
  type: z.string(),
  status: taskStatusSchema,
  priority: z.number().int(),
  attempts: z.number().int(),
  maxAttempts: z.number().int(),
  timeoutMs: z.number().int(),
  input: z.unknown(),
  result: z.unknown().nullable(),
  error: z.object({ code: z.string(), message: z.string() }).nullable(),
  dependsOn: z.array(z.number().int()),
  cancelRequested: z.boolean(),
  createdAt: dateString,
  updatedAt: dateString,
  startedAt: dateString.nullable(),
  completedAt: dateString.nullable(),
});
export type Task = z.infer<typeof taskSchema>;

export const planSchema = z.object({
  id: z.number().int(),
  name: z.string().nullable(),
  status: planStatusSchema,
  createdAt: dateString,
  updatedAt: dateString,
  completedAt: dateString.nullable(),
});
export type Plan = z.infer<typeof planSchema>;

export const planSummarySchema = planSchema.extend({
  counts: z.record(taskStatusSchema, z.number().int()),
});
export type PlanSummary = z.infer<typeof planSummarySchema>;

export const EVENT_TYPES = [
  'plan.created',
  'plan.status',
  'task.status',
  'task.log',
  'system.status',
] as const;

export const executionEventSchema = z.object({
  id: z.number().int(),
  at: dateString,
  type: z.enum(EVENT_TYPES),
  planId: z.number().int().nullable(),
  taskId: z.number().int().nullable(),
  data: z.record(z.string(), z.unknown()),
});
export type ExecutionEvent = z.infer<typeof executionEventSchema>;

export const systemStatusSchema = z.object({
  paused: z.boolean(),
  concurrency: z.number().int(),
  active: z.number().int(),
  counts: z.record(taskStatusSchema, z.number().int()),
  lastEventId: z.number().int(),
});
export type SystemStatus = z.infer<typeof systemStatusSchema>;
