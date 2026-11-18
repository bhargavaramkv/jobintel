import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const srcDir = path.resolve(import.meta.dirname, '..', 'src');
const WRITE = /\.(task|plan)\.(update|updateMany|updateManyAndReturn|upsert)\(/;

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) return e.name === 'generated' ? [] : sourceFiles(full);
    return e.name.endsWith('.ts') ? [full] : [];
  });
}

describe('status write guard', () => {
  it('only engine/repository.ts writes Task or Plan rows', () => {
    const repository = path.join(srcDir, 'engine', 'repository.ts');
    const offenders = sourceFiles(srcDir)
      .filter((f) => f !== repository)
      .filter((f) => WRITE.test(readFileSync(f, 'utf8')))
      .map((f) => path.relative(srcDir, f));
    expect(offenders).toEqual([]);
  });

  it('the guard pattern matches what the repository does', () => {
    const repository = readFileSync(path.join(srcDir, 'engine', 'repository.ts'), 'utf8');
    expect(WRITE.test(repository)).toBe(true);
    expect(WRITE.test('await prisma.task.update({ where: { id } })')).toBe(true);
    expect(WRITE.test('await tx.plan.updateMany({})')).toBe(true);
  });
});
