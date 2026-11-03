import { describe, expect, it } from 'vitest'
import { makeJob } from '../../test/feedFixture'
import { jobActionSchema, refOf, stageOf, withApplied, withDetails, withoutStage, withRejected, withStage } from './actions'

const ref = refOf(makeJob({ sourceId: 's1' }))
const t = (h: number) => new Date(Date.UTC(2026, 10, 2, h))

describe('application stages', () => {
  it('records every stage change in order', () => {
    let a = withStage(ref, undefined, 'shortlisted', t(1))
    a = withStage(ref, a, 'referral-requested', t(2), 'Asked a former colleague')
    a = withStage(ref, a, 'applied', t(3))
    a = withStage(ref, a, 'interview', t(4))
    expect(a.history!.map((h) => h.stage)).toEqual(['shortlisted', 'referral-requested', 'applied', 'interview'])
    expect(a.history![1].note).toBe('Asked a former colleague')
    expect(a.decision).toBe('applied')
    expect(a.appliedOn).toBe('2026-11-02')
    expect(jobActionSchema.parse(a)).toEqual(a)
  })

  it('does not duplicate history when the stage is unchanged', () => {
    const a = withStage(ref, undefined, 'shortlisted', t(1))
    expect(withStage(ref, a, 'shortlisted', t(2)).history).toHaveLength(1)
  })

  it('treats legacy applied records as Applied and never moves a later stage back', () => {
    const legacy = { ...withApplied(ref, undefined, t(1)) }
    delete legacy.stage
    delete legacy.history
    expect(stageOf(legacy)).toBe('applied')
    const interviewing = withStage(ref, legacy, 'interview', t(2))
    expect(withApplied(ref, interviewing, t(3)).stage).toBe('interview')
  })

  it('un-shortlisting removes the stage, and "not interested" clears it', () => {
    const a = withStage(ref, undefined, 'shortlisted', t(1))
    expect(withoutStage(a, t(2))).toBeNull()
    expect(withRejected(ref, a, [], t(2)).stage).toBeUndefined()
  })

  it('shortlisting a job previously marked not interested reverses that decision', () => {
    const r = withRejected(ref, undefined, ['other'], t(1))
    expect(withStage(ref, r, 'shortlisted', t(2)).decision).toBeUndefined()
  })

  it('sets and clears details', () => {
    const a = withStage(ref, undefined, 'applied', t(1))
    const d = withDetails(a, { nextAction: ' Send thank-you ', followUpOn: '2026-11-09' }, t(2))
    expect(d).toMatchObject({ nextAction: 'Send thank-you', followUpOn: '2026-11-09' })
    expect(withDetails(d, { nextAction: '' }, t(3)).nextAction).toBeUndefined()
  })
})
