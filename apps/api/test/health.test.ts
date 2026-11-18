import { afterAll, describe, expect, it } from 'vitest';
import { healthResponseSchema } from '@jobintel/contracts';
import { buildApp } from '../src/app';
import { createRegistry } from '../src/engine/handlers';
import { createTestDb } from './helpers/db';
import { createTestEngine } from './helpers/engine';

const db = createTestDb();
const app = buildApp(db.prisma, createTestEngine(db.prisma, createRegistry([])));

afterAll(async () => {
  await app.close();
  await db.cleanup();
});

describe('GET /api/health', () => {
  it('reports ok with a working database', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/health' });
    expect(res.statusCode).toBe(200);
    const body = healthResponseSchema.parse(res.json());
    expect(body.database).toBe('ok');
    expect(body.status).toBe('ok');
  });
});
