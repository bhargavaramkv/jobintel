import { test as base } from '@playwright/test';
import { execFileSync, spawn, type ChildProcess } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import path from 'node:path';

export const API_PORT = 3100;
const apiDir = path.resolve(import.meta.dirname, '..', 'apps', 'api');

/** The API as its own child process, so tests can kill it hard and start it again on the same DB. */
export class ApiProcess {
  readonly url = `http://127.0.0.1:${API_PORT}`;
  private readonly dir = mkdtempSync(path.join(tmpdir(), 'jobintel-e2e-'));
  private readonly databaseUrl = `file:${path.join(this.dir, 'e2e.db').replaceAll('\\', '/')}`;
  private child: ChildProcess | null = null;
  private output = '';

  private migrate() {
    const prismaCli = path.join(
      path.dirname(
        createRequire(import.meta.url).resolve('prisma/package.json', { paths: [apiDir] }),
      ),
      'build',
      'index.js',
    );
    execFileSync(process.execPath, [prismaCli, 'migrate', 'deploy'], {
      cwd: apiDir,
      env: { ...process.env, DATABASE_URL: this.databaseUrl },
      stdio: 'pipe',
    });
  }

  /** Spawn node directly (no npm or shell wrapper) so kill() reaches the real process. */
  async start() {
    if (this.child) throw new Error('API already running');
    const child = spawn(process.execPath, ['--import', 'tsx', 'src/server.ts'], {
      cwd: apiDir,
      env: {
        ...process.env,
        DATABASE_URL: this.databaseUrl,
        API_PORT: String(API_PORT),
        ENGINE_SHUTDOWN_TIMEOUT_MS: '2000',
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    this.child = child;
    const keep = (chunk: Buffer) => {
      this.output = (this.output + chunk.toString()).slice(-4000);
    };
    child.stdout?.on('data', keep);
    child.stderr?.on('data', keep);
    child.once('exit', () => {
      if (this.child === child) this.child = null;
    });

    const deadline = Date.now() + 30_000;
    while (Date.now() < deadline) {
      if (this.child !== child) throw new Error(`API exited during startup:\n${this.output}`);
      try {
        const res = await fetch(`${this.url}/api/health`);
        if (res.ok) return;
      } catch {
        // not listening yet
      }
      await new Promise((r) => setTimeout(r, 100));
    }
    throw new Error(`API did not become healthy:\n${this.output}`);
  }

  /** Hard kill (TerminateProcess on Windows): no shutdown handlers run. */
  async kill() {
    const child = this.child;
    if (!child) return;
    const exited = new Promise((resolve) => child.once('exit', resolve));
    child.kill('SIGKILL');
    await exited;
    this.child = null;
  }

  async restart() {
    await this.kill();
    await this.start();
  }

  async init() {
    this.migrate();
    await this.start();
  }

  async dispose() {
    await this.kill();
    rmSync(this.dir, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 });
  }
}

export const test = base.extend<object, { api: ApiProcess }>({
  api: [
    // oxlint-disable-next-line no-empty-pattern -- Playwright requires a destructured first argument
    async ({}, use) => {
      const api = new ApiProcess();
      await api.init();
      await use(api);
      await api.dispose();
    },
    { scope: 'worker', auto: true },
  ],
});

export { expect } from '@playwright/test';
