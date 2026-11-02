import { describe, expect, it } from 'vitest'
import { makeJob } from '../../test/feedFixture'
import { refOf, withApplied, withNote, withoutDecision, withRejected, type JobAction } from './actions'
import { assessJob, describeLearning, learnFromActions, seniorityOf, titleTokens } from './feedback'

const now = new Date('2026-11-02T10:00:00.000Z')
const job = (id: string, title: string, company = 'Acme Corp') => makeJob({ sourceId: id, title, company })
const applied = (title: string, company?: string) => withApplied(refOf(job(title, title, company)), undefined, now)
const rejected = (title: string, reasons: Parameters<typeof withRejected>[2], company?: string) =>
  withRejected(refOf(job(title, title, company)), undefined, reasons, now)

describe('seniorityOf', () => {
  it.each([
    ['Software Engineer Intern', 0],
    ['SDE-1', 1],
    ['Associate Software Engineer', 1],
    ['Software Engineer II', 2],
    ['SDE 2 - Backend', 2],
    ['Software Engineer 2', 2],
    ['Senior Software Engineer', 3],
    ['Software Engineer III', 3],
    ['Staff Engineer', 4],
    ['Senior Staff Software Engineer', 4],
    ['Principal Engineer', 5],
    ['Backend Engineer', null],
  ])('%s -> %s', (title, level) => expect(seniorityOf(title)).toBe(level))
})

describe('titleTokens', () => {
  it('keeps meaningful words and drops level/generic words', () => {
    expect(titleTokens('Senior Backend Engineer (Go, Kubernetes) - Bengaluru')).toEqual(['backend', 'go', 'kubernetes'])
    expect(titleTokens('Full-Stack Engineer, .NET / C#')).toEqual(['full', 'stack', '.net', 'c#'])
  })
})

describe('action helpers', () => {
  it('applies, rejects, keeps notes and undoes', () => {
    const ref = refOf(job('1', 'Backend Engineer'))
    const a = withApplied(ref, undefined, now)
    expect(a).toMatchObject({ decision: 'applied', appliedOn: '2026-11-02', rejectReasons: [] })
    const r = withRejected(ref, a, ['tech-stack', 'tech-stack'], now)
    expect(r.decision).toBe('rejected')
    expect(r.appliedOn).toBeUndefined()
    expect(r.rejectReasons).toEqual(['tech-stack'])
    const n = withNote(ref, r, 'Referral from a friend', now)
    expect(withoutDecision(n, now)).toMatchObject({ note: 'Referral from a friend', rejectReasons: [] })
    expect(withoutDecision(withApplied(ref, undefined, now), now)).toBeNull()
  })
})

describe('learning', () => {
  const actions: JobAction[] = [
    applied('Backend Engineer II (Kubernetes)'),
    applied('Full Stack Engineer - .NET', 'Kong'),
    rejected('Data Engineer', ['role-type']),
    rejected('Senior Staff Engineer', ['too-senior']),
    rejected('Platform Engineer', ['company'], 'Hidden Co'),
  ]
  const model = learnFromActions(actions)

  it('summarises what it learned', () => {
    expect(model).toMatchObject({ decisions: 5, applied: 2, rejected: 3, hiddenCompanies: ['Hidden Co'], tooSeniorFrom: 4 })
    expect(describeLearning(model).join('\n')).toMatch(/Hiding jobs from: Hidden Co/)
  })

  it('promotes roles like those applied to and explains why', () => {
    const a = assessJob({ title: 'Backend Engineer (Go)', company: 'Other' }, model)
    expect(a.score).toBeGreaterThan(0)
    expect(a.reasons[0]).toEqual({ text: 'Like roles you applied to: backend', tone: 'up' })
  })

  it('demotes rejected role types and too-senior levels', () => {
    expect(assessJob({ title: 'Data Engineer II', company: 'X' }, model).score).toBeLessThan(0)
    const staff = assessJob({ title: 'Staff Backend Engineer', company: 'X' }, model)
    expect(staff.reasons.some((r) => r.text.includes('too senior'))).toBe(true)
    expect(assessJob({ title: 'Staff Backend Engineer', company: 'X' }, model).score).toBeLessThan(
      assessJob({ title: 'Backend Engineer', company: 'X' }, model).score,
    )
  })

  it('hides companies the user is not interested in', () => {
    expect(assessJob({ title: 'Backend Engineer', company: 'Hidden Co' }, model).hidden).toBe(true)
  })

  it('boosts companies applied to before', () => {
    expect(assessJob({ title: 'Something', company: 'Kong' }, model).score).toBe(0.5)
  })

  it('is neutral with no feedback', () => {
    expect(assessJob({ title: 'Backend Engineer', company: 'X' }, learnFromActions([]))).toEqual({ score: 0, hidden: false, reasons: [] })
  })
})

describe('profile seniority prior', () => {
  const none = learnFromActions([])
  const targets = [2] // SDE-2 / Mid-level

  it('derives target levels from the profile', async () => {
    const { targetLevels } = await import('./feedback')
    expect(targetLevels(['SDE-2', 'Mid-level'])).toEqual([2])
    expect(targetLevels(['Whatever'])).toEqual([])
  })

  it('demotes roles two or more levels above or below the target, and promotes exact matches', () => {
    const staff = assessJob({ title: 'Staff Software Engineer', company: 'X' }, none, targets)
    expect(staff.score).toBeLessThan(0)
    expect(staff.reasons[0].text).toMatch(/above your target seniority/)
    expect(assessJob({ title: 'Software Engineer Intern', company: 'X' }, none, targets).score).toBeLessThan(0)
    expect(assessJob({ title: 'Senior Software Engineer', company: 'X' }, none, targets).score).toBe(0) // one level: neutral
    expect(assessJob({ title: 'Software Engineer II', company: 'X' }, none, targets).score).toBe(0.5)
    expect(assessJob({ title: 'Backend Engineer', company: 'X' }, none, targets).score).toBe(0) // level not stated
  })
})
