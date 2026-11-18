import path from 'node:path';
import { fileURLToPath } from 'node:url';

const prismaDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'prisma');

/** Resolve DATABASE_URL; relative `file:` paths are relative to apps/api/prisma. */
export function resolveDatabaseUrl(raw = process.env.DATABASE_URL ?? 'file:./dev.db'): string {
  if (!raw.startsWith('file:')) return raw;
  const file = raw.slice('file:'.length);
  if (path.isAbsolute(file)) return raw;
  return `file:${path.resolve(prismaDir, file)}`;
}
