import { buildApp } from './app';
import { createPrisma } from './db';

const port = Number(process.env.API_PORT ?? 3000);
const app = buildApp(createPrisma());

await app.listen({ host: '127.0.0.1', port });
console.log(`JobIntel API listening on http://127.0.0.1:${port}`);
