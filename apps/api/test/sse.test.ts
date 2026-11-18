import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app';
import { createTestDb } from './helpers/db';
import {
  clearTables,
  createFullRegistry,
  createTestEngine,
  makePlan,
  until,
} from './helpers/engine';

const db = createTestDb();
const { registry } = createFullRegistry(db.prisma);
const engine = createTestEngine(db.prisma, registry);
const apps: FastifyInstance[] = [];
const controllers: AbortController[] = [];

async function listen(options = {}) {
  const app = buildApp(db.prisma, engine, { events: options });
  apps.push(app);
  const base = await app.listen({ host: '127.0.0.1', port: 0 });
  return { app, base };
}

interface Frame {
  id?: number;
  data?: { id: number; type: string; planId: number | null; data: Record<string, unknown> };
  raw: string;
}

/** Open the stream and collect frames as they arrive. */
async function open(base: string, headers: Record<string, string> = {}) {
  const ctrl = new AbortController();
  controllers.push(ctrl);
  const res = await fetch(`${base}/api/events`, { headers, signal: ctrl.signal });
  const frames: Frame[] = [];
  let buffer = '';
  void (async () => {
    const decoder = new TextDecoder();
    try {
      for await (const chunk of res.body as unknown as AsyncIterable<Uint8Array>) {
        buffer += decoder.decode(chunk, { stream: true });
        let i: number;
        while ((i = buffer.indexOf('\n\n')) >= 0) {
          const raw = buffer.slice(0, i);
          buffer = buffer.slice(i + 2);
          const id = /^id: (\d+)$/m.exec(raw);
          const data = /^data: (.*)$/m.exec(raw);
          frames.push({
            raw,
            id: id ? Number(id[1]) : undefined,
            data: data ? (JSON.parse(data[1] as string) as Frame['data']) : undefined,
          });
        }
      }
    } catch {
      // aborted
    }
  })();
  return { res, frames, close: () => ctrl.abort() };
}

beforeAll(() => engine.start());
afterEach(async () => {
  controllers.splice(0).forEach((c) => c.abort());
  await clearTables(db.prisma);
});
afterAll(async () => {
  await engine.stop();
  await Promise.all(apps.map((a) => a.close()));
  await db.cleanup();
});

const echoPlan = () =>
  makePlan(engine, [{ key: 'e', type: 'system.echo', input: { message: 'hi' } }]);
const eventFrames = (f: Frame[]) => f.filter((x) => x.data);

describe('GET /api/events', () => {
  it('connects with SSE headers and a retry hint', async () => {
    const { base } = await listen();
    const s = await open(base);
    expect(s.res.status).toBe(200);
    expect(s.res.headers.get('content-type')).toContain('text/event-stream');
    await until(async () => s.frames.some((f) => f.raw.startsWith('retry: 2000')));
  });

  it('delivers live events, ordered and without duplicates', async () => {
    const { base } = await listen();
    const s = await open(base);
    await until(async () => s.frames.length > 0);
    const planId = await echoPlan();
    await until(async () =>
      eventFrames(s.frames).some(
        (f) => f.data?.type === 'plan.status' && f.data.data.to === 'COMPLETED',
      ),
    );
    const ids = eventFrames(s.frames).map((f) => f.id as number);
    expect(ids).toEqual([...ids].sort((a, b) => a - b));
    expect(new Set(ids).size).toBe(ids.length);
    expect(eventFrames(s.frames).some((f) => f.data?.type === 'plan.created')).toBe(true);
    expect(
      eventFrames(s.frames).every((f) => f.data?.planId === planId || f.data?.planId === null),
    ).toBe(true);
  });

  it('replays events after Last-Event-ID, and a reconnect resumes without gaps', async () => {
    const { base } = await listen();
    const planId = await echoPlan();
    await until(async () => (await engine.getPlan(planId))?.plan.status === 'COMPLETED');
    const all = await engine.eventsAfter(0, 1000);
    expect(all.length).toBeGreaterThan(3);
    const after = all[1]?.id as number;

    const first = await open(base, { 'last-event-id': String(after) });
    await until(async () => eventFrames(first.frames).length >= all.length - 2);
    expect(eventFrames(first.frames).map((f) => f.id)).toEqual(all.slice(2).map((e) => e.id));
    const seen = eventFrames(first.frames).at(-1)?.id as number;
    first.close();

    // Events written while disconnected arrive on reconnect.
    const planId2 = await echoPlan();
    await until(async () => (await engine.getPlan(planId2))?.plan.status === 'COMPLETED');
    const second = await open(base, { 'last-event-id': String(seen) });
    const expected = await engine.eventsAfter(seen, 1000);
    await until(async () => eventFrames(second.frames).length >= expected.length);
    expect(eventFrames(second.frames).map((f) => f.id)).toEqual(expected.map((e) => e.id));
  });

  it('sends a heartbeat comment', async () => {
    const { base } = await listen({ heartbeatMs: 40 });
    const s = await open(base);
    await until(async () => s.frames.some((f) => f.raw === ': ping'));
  });

  it('limits the number of streams', async () => {
    const { base } = await listen({ maxStreams: 2 });
    const a = await open(base);
    const b = await open(base);
    await until(async () => a.frames.length > 0 && b.frames.length > 0);
    const res = await fetch(`${base}/api/events`);
    expect(res.status).toBe(503);
    expect(((await res.json()) as { error: { code: string } }).error.code).toBe('TOO_MANY_STREAMS');
  });

  it('app.close() does not hang with open streams', async () => {
    const { app, base } = await listen();
    const s = await open(base);
    await until(async () => s.frames.length > 0);
    const started = Date.now();
    await app.close();
    expect(Date.now() - started).toBeLessThan(2000);
  });
});
