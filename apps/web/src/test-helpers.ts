import { vi } from 'vitest';

/** Minimal EventSource stand-in (jsdom has none). Tests drive it through `emit`/`open`/`fail`. */
export class FakeEventSource {
  static instances: FakeEventSource[] = [];
  onopen: (() => void) | null = null;
  onerror: (() => void) | null = null;
  onmessage: ((e: MessageEvent<string>) => void) | null = null;
  closed = false;

  constructor(readonly url: string) {
    FakeEventSource.instances.push(this);
  }

  close() {
    this.closed = true;
  }

  open() {
    this.onopen?.();
  }

  fail() {
    this.onerror?.();
  }

  emit(event: object) {
    this.onmessage?.({ data: JSON.stringify(event) } as MessageEvent<string>);
  }
}

export const latestSource = () => FakeEventSource.instances[FakeEventSource.instances.length - 1]!;

export const task = (over: Record<string, unknown> = {}) => ({
  id: 1,
  planId: 1,
  key: 'a',
  type: 'system.echo',
  status: 'QUEUED',
  priority: 5,
  attempts: 0,
  maxAttempts: 3,
  timeoutMs: 5000,
  input: {},
  result: null,
  error: null,
  dependsOn: [],
  cancelRequested: false,
  createdAt: '2026-11-18T10:00:00.000Z',
  updatedAt: '2026-11-18T10:00:00.000Z',
  startedAt: null,
  completedAt: null,
  ...over,
});

export const emptyStatus = {
  paused: false,
  concurrency: 2,
  active: 0,
  counts: {
    PENDING: 0,
    BLOCKED: 0,
    QUEUED: 0,
    RUNNING: 0,
    RETRYING: 0,
    COMPLETED: 0,
    FAILED: 0,
    CANCELLED: 0,
  },
  lastEventId: 0,
};

type Handler = (init?: RequestInit) => { status?: number; body: unknown };

/** Stub fetch with a route table keyed by "METHOD path"; unknown routes return an empty list. */
export function stubFetch(routes: Record<string, Handler> = {}) {
  const calls: { key: string; init?: RequestInit }[] = [];
  const fn = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input).replace(/\?.*$/, '');
    const key = `${init?.method ?? 'GET'} ${url}`;
    calls.push({ key, init });
    const defaults: Record<string, Handler> = {
      'GET /api/system/status': () => ({ body: emptyStatus }),
      'GET /api/plans': () => ({ body: { plans: [] } }),
      'GET /api/tasks': () => ({ body: { tasks: [] } }),
    };
    const route = routes[key] ?? defaults[key];
    if (!route) throw new Error(`unrouted ${key}`);
    const { status = 200, body } = route(init);
    return new Response(JSON.stringify(body), {
      status,
      headers: { 'content-type': 'application/json' },
    });
  });
  vi.stubGlobal('fetch', fn);
  return { calls, fn };
}
