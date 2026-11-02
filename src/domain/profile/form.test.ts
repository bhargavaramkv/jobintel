import { describe, expect, it } from 'vitest'
import { makeProfile } from '../../test/helpers'
import { draftFromProfile, draftsEqual, profileFromDraft } from './form'
import { candidateProfileSchema } from './schema'

const base = makeProfile()
const now = new Date('2026-02-02T10:00:00.000Z')

describe('profileFromDraft', () => {
  it('accepts an empty (partial) profile', () => {
    const r = profileFromDraft(draftFromProfile(base), base, now)
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.profile.updatedAt).toBe(now.toISOString())
      expect(r.profile.createdAt).toBe(base.createdAt)
      expect(r.profile.compensation).toBeUndefined()
      expect('currentTitle' in r.profile).toBe(false)
    }
  })

  it('trims text and converts numbers', () => {
    const d = { ...draftFromProfile(base), currentTitle: '  Engineer ', yearsExperience: '2.5', compensationMin: '1,200,000' }
    const r = profileFromDraft(d, base, now)
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.profile.currentTitle).toBe('Engineer')
      expect(r.profile.yearsExperience).toBe(2.5)
      expect(r.profile.compensation).toEqual({ currency: 'INR', minimum: 1200000 })
    }
  })

  it.each([
    ['-1', 'non-negative'],
    ['abc', 'non-negative'],
    ['61', 'at most'],
    ['2.55', 'one decimal'],
  ])('rejects years of experience %s', (value, msg) => {
    const r = profileFromDraft({ ...draftFromProfile(base), yearsExperience: value }, base, now)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.errors.yearsExperience).toContain(msg)
  })

  it('rejects min compensation above max', () => {
    const r = profileFromDraft(
      { ...draftFromProfile(base), compensationMin: '200', compensationMax: '100' },
      base,
      now,
    )
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.errors.compensationMax).toBeDefined()
  })

  it('rejects a skill listed as both primary and secondary', () => {
    const r = profileFromDraft(
      { ...draftFromProfile(base), primarySkills: [{ name: 'Go' }], secondarySkills: [{ name: 'go' }] },
      base,
      now,
    )
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.errors.secondarySkills).toContain('go')
  })

  it('rejects over-long text', () => {
    const r = profileFromDraft({ ...draftFromProfile(base), currentTitle: 'x'.repeat(200) }, base, now)
    expect(r.ok).toBe(false)
  })

  it('round-trips through the draft', () => {
    const p = makeProfile({
      currentTitle: 'SDE',
      yearsExperience: 4,
      compensation: { currency: 'USD', minimum: 10, maximum: 20 },
      workModes: ['hybrid'],
    })
    const r = profileFromDraft(draftFromProfile(p), p, new Date(p.updatedAt))
    expect(r.ok && r.profile).toEqual(p)
  })
})

describe('candidateProfileSchema', () => {
  it('rejects duplicate tags case-insensitively', () => {
    expect(candidateProfileSchema.safeParse(makeProfile({ targetRoles: ['SDE', 'sde'] })).success).toBe(false)
  })

  it('rejects unknown fields', () => {
    expect(candidateProfileSchema.safeParse({ ...makeProfile(), extra: 1 }).success).toBe(false)
  })

  it('rejects invalid work modes', () => {
    expect(candidateProfileSchema.safeParse({ ...makeProfile(), workModes: ['moon'] }).success).toBe(false)
  })
})

describe('draftsEqual', () => {
  it('detects changes', () => {
    const d = draftFromProfile(base)
    expect(draftsEqual(d, { ...d })).toBe(true)
    expect(draftsEqual(d, { ...d, currentTitle: 'x' })).toBe(false)
  })
})
