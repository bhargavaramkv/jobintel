import type { FastifyInstance } from 'fastify';
import { sendError } from '../app';
import type { Engine } from '../engine/engine';

export interface EventRouteOptions {
  heartbeatMs?: number;
  maxStreams?: number;
}

const PAGE = 100;

export function registerEventRoutes(
  app: FastifyInstance,
  engine: Engine,
  { heartbeatMs = 15_000, maxStreams = 10 }: EventRouteOptions = {},
) {
  const streams = new Set<() => void>();

  // Hijacked connections never finish by themselves; end them so app.close() can return.
  app.addHook('preClose', async () => {
    for (const close of streams) close();
  });

  app.get('/api/events', async (request, reply) => {
    if (streams.size >= maxStreams) {
      return sendError(reply, 503, 'TOO_MANY_STREAMS', 'too many open event streams');
    }
    const header = request.headers['last-event-id'];
    let cursor =
      typeof header === 'string' && /^\d{1,15}$/.test(header)
        ? Number(header)
        : await engine.lastEventId();

    reply.hijack();
    const res = reply.raw;
    res.writeHead(200, {
      'content-type': 'text/event-stream',
      'cache-control': 'no-cache',
      connection: 'keep-alive',
      'x-accel-buffering': 'no',
    });
    res.write('retry: 2000\n\n');

    let closed = false;
    let pumping = false;
    let again = false;

    // The database is the source for replay and live delivery alike.
    const pump = async (): Promise<void> => {
      if (closed) return;
      if (pumping) {
        again = true;
        return;
      }
      pumping = true;
      try {
        do {
          again = false;
          for (;;) {
            const events = await engine.eventsAfter(cursor, PAGE);
            if (closed || events.length === 0) break;
            for (const e of events) {
              cursor = e.id;
              if (!res.write(`id: ${e.id}\ndata: ${JSON.stringify(e)}\n\n`)) {
                await new Promise<void>((resolve) => {
                  res.once('drain', resolve);
                  res.once('close', resolve);
                });
                if (closed) return;
              }
            }
          }
        } while (again && !closed);
      } catch (err) {
        console.error('event stream read failed', err);
        close();
      } finally {
        pumping = false;
      }
    };

    const unsubscribe = engine.bus.subscribe(() => void pump());
    const heartbeat = setInterval(() => {
      if (closed) return;
      res.write(': ping\n\n');
      void pump();
    }, heartbeatMs);

    function close() {
      if (closed) return;
      closed = true;
      clearInterval(heartbeat);
      unsubscribe();
      streams.delete(close);
      res.end();
    }

    streams.add(close);
    res.on('close', close);
    void pump();
  });
}
