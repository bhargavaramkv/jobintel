import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { createRequire } from 'node:module';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { healthResponseSchema } from '@jobintel/contracts';
import { buildApp } from '../src/app';
import { createPrisma } from '../src/db';

const apiDir = path.resolve(import.meta.dirname, '..');
const dir = mkdtempSync(path.join(tmpdir(), 'jobintel-test-'));
const dbUrl = `file:${path.join(dir, 'test.db').replace(/\\/g, '/')}`;
const prisma = createPrisma(dbUrl);
const app = buildApp(prisma);

beforeAll(() => {
  // Apply the committed migrations to an isolated, temporary database.
  const prismaCli = path.join(
    path.dirname(
      createRequire(import.meta.url).resolve('prisma/package.json', { paths: [apiDir] }),
    ),
    'build',
    'index.js',
  );
  execFileSync(process.execPath, [prismaCli, 'migrate', 'deploy'], {
    cwd: apiDir,
    env: { ...process.env, DATABASE_URL: dbUrl },
    stdio: 'pipe',
  });
});

afterAll(async () => {
  await app.close();
  await prisma.$disconnect();
  rmSync(dir, { recursive: true, force: true });
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
