// Child process used by claiming.test.ts: its own SQLite connection, so claims really race.
import { createPrisma } from '../../src/db';
import { createEventBus } from '../../src/engine/event-bus';
import { createRepository } from '../../src/engine/repository';

const [dbUrl, instanceId, startAt, mode] = process.argv.slice(2) as [
  string,
  string,
  string,
  string,
];

const prisma = createPrisma(dbUrl);
const repo = createRepository(prisma, createEventBus());
const claimed: number[] = [];

// Start together: wait for the shared start time.
while (Date.now() < Number(startAt)) await new Promise((r) => setTimeout(r, 1));

if (mode.startsWith('one:')) {
  const row = await repo.claimTask(Number(mode.slice(4)), instanceId, 30_000);
  if (row) claimed.push(row.id);
} else {
  for (;;) {
    const rows = await repo.claimQueued(instanceId, 30_000, 1);
    if (rows.length === 0) break;
    claimed.push(...rows.map((r) => r.id));
  }
}

await prisma.$disconnect();
process.stdout.write(`CLAIMED ${JSON.stringify(claimed)}\n`);
