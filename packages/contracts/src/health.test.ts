import { describe, expect, it } from 'vitest';
import { healthResponseSchema } from './index';

describe('healthResponseSchema', () => {
  it('accepts a valid health response', () => {
    const valid = {
      status: 'ok',
      database: 'ok',
      version: '0.0.0',
      time: new Date().toISOString(),
    };
    expect(healthResponseSchema.safeParse(valid).success).toBe(true);
  });

  it('rejects an invalid health response', () => {
    expect(healthResponseSchema.safeParse({ status: 'ok', database: 'maybe' }).success).toBe(false);
  });
});
