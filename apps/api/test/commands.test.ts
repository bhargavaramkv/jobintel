import { describe, expect, it } from 'vitest';
import { parseCommand } from '../src/engine/commands';

const error = (text: string) => {
  const r = parseCommand(text);
  return 'error' in r ? r.error.code : `parsed:${r.kind}`;
};

describe('parseCommand', () => {
  it('parses every grammar form', () => {
    expect(parseCommand('/help')).toEqual({ kind: 'help' });
    expect(parseCommand('/status')).toEqual({ kind: 'status' });
    expect(parseCommand('/pause')).toEqual({ kind: 'pause' });
    expect(parseCommand('/resume')).toEqual({ kind: 'resume' });
    expect(parseCommand('/tasks')).toEqual({ kind: 'tasks.list' });
    expect(parseCommand('/tasks list')).toEqual({ kind: 'tasks.list' });
    expect(parseCommand('/tasks list queued')).toEqual({ kind: 'tasks.list', status: 'QUEUED' });
    expect(parseCommand('/tasks show 7')).toEqual({ kind: 'tasks.show', id: 7 });
    expect(parseCommand('/tasks cancel 7')).toEqual({ kind: 'tasks.cancel', id: 7 });
    expect(parseCommand('/plans')).toEqual({ kind: 'plans.list' });
    expect(parseCommand('/plans list')).toEqual({ kind: 'plans.list' });
    expect(parseCommand('/plans show 3')).toEqual({ kind: 'plans.show', id: 3 });
    expect(parseCommand('/plans demo')).toEqual({ kind: 'plans.demo' });
    expect(parseCommand('/plans create {"tasks": [{"key": "a"}]}')).toEqual({
      kind: 'plans.create',
      spec: { tasks: [{ key: 'a' }] },
    });
  });

  it('is case-insensitive and trims', () => {
    expect(parseCommand('  /TASKS LIST Queued  ')).toEqual({
      kind: 'tasks.list',
      status: 'QUEUED',
    });
    expect(parseCommand('/Plans DEMO')).toEqual({ kind: 'plans.demo' });
  });

  it('accepts bare help and status', () => {
    expect(parseCommand('help')).toEqual({ kind: 'help' });
    expect(parseCommand(' Status ')).toEqual({ kind: 'status' });
  });

  it('rejects natural language', () => {
    expect(error('find me jobs')).toBe('NOT_A_COMMAND');
    expect(error('pause')).toBe('NOT_A_COMMAND');
  });

  it('rejects unknown commands', () => {
    expect(error('/foo')).toBe('UNKNOWN_COMMAND');
    expect(error('/')).toBe('UNKNOWN_COMMAND');
  });

  it('rejects bad arguments', () => {
    expect(error('/tasks show x')).toBe('INVALID_ARGUMENTS');
    expect(error('/tasks show 0')).toBe('INVALID_ARGUMENTS');
    expect(error('/tasks show 1.5')).toBe('INVALID_ARGUMENTS');
    expect(error('/tasks cancel')).toBe('INVALID_ARGUMENTS');
    expect(error('/tasks show 1 2')).toBe('INVALID_ARGUMENTS');
    expect(error('/tasks list nope')).toBe('INVALID_ARGUMENTS');
    expect(error('/tasks bogus')).toBe('INVALID_ARGUMENTS');
    expect(error('/plans show')).toBe('INVALID_ARGUMENTS');
    expect(error('/plans create')).toBe('INVALID_ARGUMENTS');
    expect(error('/plans create {bad json')).toBe('INVALID_ARGUMENTS');
    expect(error('/plans bogus')).toBe('INVALID_ARGUMENTS');
    expect(error('/pause now')).toBe('INVALID_ARGUMENTS');
  });
});
