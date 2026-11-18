import { buildApp } from './app';
import { engineConfigFromEnv } from './config';
import { createPrisma } from './db';
import { createEngine } from './engine/engine';
import { createDefaultRegistry } from './engine/handlers';

const port = Number(process.env.API_PORT ?? 3000);
const prisma = createPrisma();
const registry = createDefaultRegistry({ prisma, apiBaseUrl: `http://127.0.0.1:${port}` });
const engine = createEngine({ prisma, registry, config: engineConfigFromEnv() });
const app = buildApp(prisma, engine);

await app.listen({ host: '127.0.0.1', port });
// The engine starts only once the port is ours, so a second instance never recovers our tasks.
await engine.start();
console.log(`JobIntel API listening on http://127.0.0.1:${port}`);

let shuttingDown = false;
async function shutdown(signal: string) {
  if (shuttingDown) process.exit(1);
  shuttingDown = true;
  console.log(`${signal} received, shutting down`);
  try {
    await engine.stop();
    await app.close();
    await prisma.$disconnect();
    process.exit(0);
  } catch (err) {
    console.error('shutdown failed', err);
    process.exit(1);
  }
}
process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));
