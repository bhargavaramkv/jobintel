import { describe, expect, it } from 'vitest'
import { refOf, withApplied, withNote, withRejected, withStage, type JobAction } from '../jobs/actions'
import { makeJob } from '../../test/feedFixture'
import { storedRec } from '../../test/aiFixture'
import { planApply, type ApplyContext } from './apply'
import type { ProposedAction } from './schema'

const now = new Date('2026-11-03T08:00:00.000Z')
const job = makeJob({ sourceId: '1', company: 'Acme', title: 'Backend Engineer' })
const JOB_ID = job.id

const ctx = (actions: JobAction[] = [], jobs = [job]): ApplyContext => ({
  actions: new Map(actions.map((a) => [a.jobId, a])),
  jobs: new Map(jobs.map((j) => [j.id, j])),
  now,
})
const rec = (action: ProposedAction, over = {}) => storedRec({ jobId: JOB_ID, action, ...over })
const plan = (action: ProposedAction, actions: JobAction[] = [], jobs = [job]) => planApply(rec(action), ctx(actions, jobs))

function okPlan(p: ReturnType<typeof planApply>) {
  if (!p.ok) throw new Error(`expected ok, refused: ${p.reason}`)
  return p
}
const refusal = (p: ReturnType<typeof planApply>) => (p.ok ? null : p.reason)

describe('applying an accepted recommendation', () => {
  it('"none" changes nothing', () => {
    const p = okPlan(planApply(storedRec({ kind: 'insight', jobId: undefined, action: { type: 'none' } }), ctx()))
    expect(p.next).toBeNull()
  })

  describe('shortlist', () => {
    it('shortlists a job with provenance in the history', () => {
      const p = okPlan(plan({ type: 'shortlist' }))
      expect(p.next).toMatchObject({ jobId: JOB_ID, stage: 'shortlisted' })
      expect(p.next!.history![0].note).toMatch(/AI recommendation/)
    })
    it('refuses a closed posting', () => {
      expect(refusal(plan({ type: 'shortlist' }, [], [{ ...job, status: 'closed' }]))).toMatch(/closed/)
    })
    it('refuses when already in the pipeline, and never moves a later stage backwards', () => {
      const applied = withApplied(refOf(job), undefined, now)
      expect(refusal(plan({ type: 'shortlist' }, [applied]))).toMatch(/Already in your pipeline \(Applied\)/)
    })
    it('refuses to override a Not interested decision', () => {
      const rejected = withRejected(refOf(job), undefined, ['company'], now)
      expect(refusal(plan({ type: 'shortlist' }, [rejected]))).toMatch(/Not interested/)
    })
  })

  describe('not-interested', () => {
    it('marks the job with the stated reasons', () => {
      const p = okPlan(plan({ type: 'not-interested', reasons: ['tech-stack', 'location'] }))
      expect(p.next).toMatchObject({ decision: 'rejected', rejectReasons: ['tech-stack', 'location'] })
    })
    it('refuses to drop a job that is in the pipeline', () => {
      const shortlisted = withStage(refOf(job), undefined, 'shortlisted', now)
      expect(refusal(plan({ type: 'not-interested', reasons: ['other'] }, [shortlisted]))).toMatch(/in your pipeline/)
    })
    it('refuses when it is already marked Not interested', () => {
      const rejected = withRejected(refOf(job), undefined, ['company'], now)
      expect(refusal(plan({ type: 'not-interested', reasons: ['other'] }, [rejected]))).toMatch(/Already/)
    })
  })

  describe('add-note', () => {
    it('adds a clearly labelled AI note to an empty note', () => {
      const p = okPlan(plan({ type: 'add-note', note: 'Ask about team size' }))
      expect(p.next!.note).toBe('AI suggestion (2026-11-03): Ask about team size')
    })
    it('appends to the existing note instead of replacing it', () => {
      const mine = withNote(refOf(job), undefined, 'My own note', now)
      const p = okPlan(plan({ type: 'add-note', note: 'Check Glassdoor' }, [mine]))
      expect(p.next!.note).toBe('My own note\n\nAI suggestion (2026-11-03): Check Glassdoor')
    })
    it('refuses when it would exceed the note limit', () => {
      const long = withNote(refOf(job), undefined, 'x'.repeat(3990), now)
      expect(refusal(plan({ type: 'add-note', note: 'y'.repeat(100) }, [long]))).toMatch(/longer than the allowed length/)
    })
  })

  describe('set-follow-up', () => {
    const shortlisted = withStage(refOf(job), undefined, 'shortlisted', now)
    it('sets a follow-up date on an active application and keeps the user next action when none is proposed', () => {
      const withNext = { ...shortlisted, nextAction: 'Prepare system design' }
      const p = okPlan(plan({ type: 'set-follow-up', followUpOn: '2026-11-10' }, [withNext]))
      expect(p.next).toMatchObject({ followUpOn: '2026-11-10', nextAction: 'Prepare system design' })
    })
    it('replaces next action only when one is proposed', () => {
      const p = okPlan(plan({ type: 'set-follow-up', followUpOn: '2026-11-10', nextAction: 'Email the recruiter' }, [shortlisted]))
      expect(p.next!.nextAction).toBe('Email the recruiter')
    })
    it('refuses without an active application', () => {
      expect(refusal(plan({ type: 'set-follow-up', followUpOn: '2026-11-10' }))).toMatch(/active pipeline/)
    })
    it('refuses a date in the past', () => {
      expect(refusal(plan({ type: 'set-follow-up', followUpOn: '2026-10-01' }, [shortlisted]))).toMatch(/in the past/)
    })
  })

  it('refuses a job that is nowhere to be found', () => {
    expect(refusal(plan({ type: 'shortlist' }, [], []))).toMatch(/no longer in the feed/)
  })

  it('can still act on a job that left the feed if the user has a record for it', () => {
    const note = withNote(refOf(job), undefined, 'kept', now)
    expect(planApply(rec({ type: 'add-note', note: 'late thought' }), ctx([note], [])).ok).toBe(true)
  })

  it('refuses a recommendation that names no job', () => {
    expect(refusal(planApply(storedRec({ jobId: undefined, kind: 'insight', action: { type: 'shortlist' } }), ctx()))).toMatch(/no job/)
  })

  it('is pure: it never mutates the records it is given', () => {
    const shortlisted = withStage(refOf(job), undefined, 'shortlisted', now)
    const before = JSON.stringify(shortlisted)
    planApply(rec({ type: 'set-follow-up', followUpOn: '2026-11-10' }), ctx([shortlisted]))
    expect(JSON.stringify(shortlisted)).toBe(before)
  })
})
