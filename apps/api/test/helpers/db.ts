import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { createRequire } from 'node:module';
import path from 'node:path';
import { createPrisma, type PrismaClient } from '../../src/db';

const apiDir = path.resolve(import.meta.dirname, '..', '..');

export interface TestDb {
  url: string;
  prisma: PrismaClient;
  cleanup(): Promise<void>;
}

/** Create an isolated temporary SQLite database with the committed migrations applied. */
export function createTestDb(): TestDb {
  const dir = mkdtempSync(path.join(tmpdir(), 'jobintel-test-'));
  const url = `file:${path.join(dir, 'test.db').replaceAll('\\', '/')}`;
  const prismaCli = path.join(
    path.dirname(
      createRequire(import.meta.url).resolve('prisma/package.json', { paths: [apiDir] }),
    ),
    'build',
    'index.js',
  );
  execFileSync(process.execPath, [prismaCli, 'migrate', 'deploy'], {
    cwd: apiDir,
    env: { ...process.env, DATABASE_URL: url },
    stdio: 'pipe',
  });
  const prisma = createPrisma(url);
  return {
    url,
    prisma,
    async cleanup() {
      await prisma.$disconnect();
      rmSync(dir, { recursive: true, force: true });
    },
  };
}
