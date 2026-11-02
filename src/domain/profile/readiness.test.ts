import { describe, expect, it } from 'vitest'
import { completeProfile, makeProfile } from '../../test/helpers'
import { calculateReadiness, READINESS_RULES } from './readiness'

describe('calculateReadiness', () => {
  it('rule weights sum to 100', () => {
    expect(READINESS_RULES.reduce((s, r) => s + r.weight, 0)).toBe(100)
  })

  it('scores 0 with no profile and with an empty profile', () => {
    expect(calculateReadiness(null).score).toBe(0)
    expect(calculateReadiness(makeProfile()).score).toBe(0)
  })

  it('scores 100 for a complete profile', () => {
    const r = calculateReadiness(completeProfile())
    expect(r.score).toBe(100)
    expect(r.complete).toBe(true)
    expect(r.groups.every((g) => g.complete)).toBe(true)
  })

  it('awards partial primary-skill credit proportionally', () => {
    const one = calculateReadiness(makeProfile({ primarySkills: [{ name: 'Go' }] }))
    expect(one.rules.find((r) => r.id === 'primarySkills')?.earned).toBeCloseTo(20 / 3)
    expect(one.score).toBe(7)
    expect(one.rules.find((r) => r.id === 'primarySkills')?.complete).toBe(false)
  })

  it('treats whitespace-only text as missing', () => {
    const r = calculateReadiness(makeProfile({ currentTitle: '   ' }))
    expect(r.rules.find((x) => x.id === 'title')?.complete).toBe(false)
  })

  it('counts 0 years of experience as provided', () => {
    const r = calculateReadiness(makeProfile({ yearsExperience: 0 }))
    expect(r.rules.find((x) => x.id === 'experience')?.complete).toBe(true)
  })

  it('ignores optional preferences', () => {
    const r = calculateReadiness(
      makeProfile({ targetCompanies: ['Acme'], noticePeriod: '30 days', compensation: { currency: 'INR', minimum: 1 } }),
    )
    expect(r.score).toBe(0)
  })

  it('is deterministic', () => {
    const p = completeProfile()
    expect(calculateReadiness(p)).toEqual(calculateReadiness(p))
  })
})
