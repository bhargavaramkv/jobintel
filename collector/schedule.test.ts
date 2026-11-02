import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { nextScheduledScan, scheduleCron } from '../src/domain/jobs/schedule.ts'

describe('scan schedule', () => {
  it('matches the workflow cron', () => {
    const yml = readFileSync(resolve(process.cwd(), '.github/workflows/scan.yml'), 'utf8')
    expect(yml).toContain(`- cron: '${scheduleCron()}'`)
  })

  it('finds the next run, rolling over to tomorrow', () => {
    expect(nextScheduledScan(new Date('2026-11-02T03:00:00Z')).toISOString()).toBe('2026-11-02T08:13:00.000Z')
    expect(nextScheduledScan(new Date('2026-11-02T15:00:00Z')).toISOString()).toBe('2026-11-03T02:13:00.000Z')
  })
})
