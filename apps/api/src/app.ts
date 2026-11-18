import Fastify, { type FastifyError, type FastifyInstance, type FastifyReply } from 'fastify';
import type { ErrorEnvelope } from '@jobintel/contracts';
import type { PrismaClient } from './db';
import type { Engine } from './engine/engine';
import { registerEngineRoutes } from './routes/engine';
import { registerEventRoutes, type EventRouteOptions } from './routes/events';

export const VERSION = '0.0.0';

const ALLOWED_HOSTS = new Set(['127.0.0.1', 'localhost']);

export function sendError(
  reply: FastifyReply,
  status: number,
  code: string,
  message: string,
  details?: unknown,
): FastifyReply {
  const body: ErrorEnvelope = {
    error: { code, message, ...(details === undefined ? {} : { details }) },
  };
  return reply.status(status).send(body);
}

function hostnameOf(host: string | undefined): string {
  return (host ?? '').replace(/:\d*$/, '').toLowerCase();
}

export interface AppOptions {
  events?: EventRouteOptions;
}

export function buildApp(
  prisma: PrismaClient,
  engine: Engine,
  options: AppOptions = {},
): FastifyInstance {
  const app = Fastify({ logger: false, bodyLimit: 64 * 1024 });

  // Blocks DNS rebinding: only loopback host names are served.
  app.addHook('onRequest', async (request, reply) => {
    if (!ALLOWED_HOSTS.has(hostnameOf(request.headers.host))) {
      return sendError(reply, 403, 'FORBIDDEN_HOST', 'requests must use 127.0.0.1 or localhost');
    }
  });

  app.setErrorHandler((err: FastifyError, _request, reply) => {
    switch (err.code) {
      case 'FST_ERR_CTP_BODY_TOO_LARGE':
        return sendError(reply, 413, 'PAYLOAD_TOO_LARGE', 'request body is too large');
      case 'FST_ERR_CTP_INVALID_MEDIA_TYPE':
        return sendError(reply, 415, 'UNSUPPORTED_MEDIA_TYPE', 'send application/json');
    }
    const status = err.statusCode ?? 500;
    if (status >= 400 && status < 500) {
      return sendError(reply, status, 'VALIDATION_FAILED', 'the request could not be parsed');
    }
    console.error('unhandled request error', err);
    return sendError(reply, 500, 'INTERNAL', 'internal error');
  });

  app.setNotFoundHandler((_request, reply) => sendError(reply, 404, 'NOT_FOUND', 'not found'));

  registerEngineRoutes(app, prisma, engine);
  registerEventRoutes(app, engine, options.events);

  return app;
}
