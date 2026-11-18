import Fastify, { type FastifyInstance } from 'fastify';
import { healthResponseSchema } from '@jobintel/contracts';
import type { PrismaClient } from './db';

export const VERSION = '0.0.0';

export function buildApp(prisma: PrismaClient): FastifyInstance {
  const app = Fastify({ logger: false });

  app.get('/api/health', async () => {
    let database: 'ok' | 'error' = 'ok';
    try {
      await prisma.$queryRaw`SELECT 1`;
    } catch {
      database = 'error';
    }
    return healthResponseSchema.parse({
      status: 'ok',
      database,
      version: VERSION,
      time: new Date().toISOString(),
    });
  });

  return app;
}
