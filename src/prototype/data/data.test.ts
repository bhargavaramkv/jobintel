import { describe, expect, it } from 'vitest'
import { jobSchema } from '../../domain/jobs/feedSchema'
import { candidateProfileSchema } from '../../domain/profile/schema'
import { APP_STATUSES } from '../types'
import { EMPTY_SEED, SEED } from './index'

const unique = (ids: string[]) => new Set(ids).size === ids.length

describe('prototype seed data', () => {
  it('has a profile and jobs that satisfy the real schemas', () => {
    expect(candidateProfileSchema.safeParse(SEED.profile).success).toBe(true)
    expect(candidateProfileSchema.safeParse(EMPTY_SEED.profile).success).toBe(true)
    expect(SEED.jobs).toHaveLength(12)
    for (const job of SEED.jobs) expect(jobSchema.safeParse(job).success, job.id).toBe(true)
  })

  it('splits agent verdicts 5/3/4 with reasons', () => {
    const count = (v: string) => SEED.jobs.filter((j) => j.agentDecision.verdict === v).length
    expect([count('selected'), count('review'), count('rejected')]).toEqual([5, 3, 4])
    for (const j of SEED.jobs) expect(j.agentDecision.reasons.length).toBeGreaterThan(0)
  })

  it('uses only unique ids and valid references', () => {
    const jobIds = SEED.jobs.map((j) => j.id)
    const appIds = SEED.applications.map((a) => a.id)
    const eventIds = SEED.events.map((e) => e.id)
    expect(unique(jobIds) && unique(appIds) && unique(eventIds)).toBe(true)
    expect(unique(SEED.resumes.variants.map((v) => v.id))).toBe(true)
    const variants = new Map(SEED.resumes.variants.map((v) => [v.id, v]))
    for (const a of SEED.applications) {
      expect(jobIds).toContain(a.jobId)
      if (a.resumeId) expect(variants.get(a.resumeId)?.versions.some((v) => v.version === a.resumeVersion)).toBe(true)
    }
    for (const v of SEED.resumes.variants) if (v.jobId) expect(jobIds).toContain(v.jobId)
    for (const e of SEED.events) {
      if (e.applicationId) expect(appIds).toContain(e.applicationId)
      if (e.jobId) expect(jobIds).toContain(e.jobId)
    }
  })

  it('covers every status and mode, with the required special cases', () => {
    expect(SEED.applications).toHaveLength(10)
    expect(new Set(SEED.applications.map((a) => a.status))).toEqual(new Set(APP_STATUSES))
    expect(new Set(SEED.applications.map((a) => a.mode))).toEqual(new Set(['auto', 'approval', 'blocked']))
    expect(SEED.applications.filter((a) => a.status === 'awaiting-approval').length).toBeGreaterThanOrEqual(2)
    expect(SEED.applications.find((a) => a.status === 'blocked')?.blocker).toMatch(/CAPTCHA/)
    expect(SEED.applications.find((a) => a.status === 'failed')?.failure).toMatch(/retry/i)
    expect(SEED.resumes.variants.length).toBe(6)
    expect(SEED.resumes.master?.tex.split('\n').length).toBeGreaterThanOrEqual(60)
  })

  it('contains no external URLs except posting urls on .invalid', () => {
    const stripped = JSON.parse(JSON.stringify(SEED), (k, v) => (k === 'url' ? undefined : v))
    expect(JSON.stringify(stripped)).not.toContain('http')
    for (const j of SEED.jobs) expect(j.url).toMatch(/^https:\/\/jobs\.example\.invalid\//)
  })
})
