import { describe, expect, it } from 'vitest'
import { makeJob } from '../../test/feedFixture'
import { jobActionSchema, refOf, withDetails, withRejected, withStage } from '../jobs/actions'
import { applicationsOf, daysBetween, dueApplicationFollowUps, findDuplicate, groupByStage, manualRef, upcomingInterviews } from './pipeline'

const t = new Date('2026-11-02T10:00:00Z')
const feedRef = refOf(makeJob({ sourceId: 'a1', title: 'Backend Engineer (Payments)', company: 'Acme Corp' }))

describe('pipeline', () => {
  it('excludes not-interested jobs and jobs without a stage', () => {
    const a = withStage(feedRef, undefined, 'applied', t)
    const r = withRejected(refOf(makeJob({ sourceId: 'r' })), undefined, [], t)
    expect(applicationsOf([a, r]).map((x) => x.jobId)).toEqual([feedRef.jobId])
  })

  it('finds an active duplicate by company and title, ignoring case and brackets', () => {
    const a = withStage(feedRef, undefined, 'applied', t)
    const manual = manualRef({ title: 'backend engineer', company: 'ACME corp', url: 'https://example.com/x' })
    expect(findDuplicate([a], manual.snapshot, manual.jobId)?.jobId).toBe(feedRef.jobId)
    expect(findDuplicate([a], manual.snapshot, feedRef.jobId)).toBeUndefined()
    const closed = withStage(feedRef, a, 'rejected', t)
    expect(findDuplicate([closed], manual.snapshot, manual.jobId)).toBeUndefined()
  })

  it('creates valid manual application records', () => {
    const ref = manualRef({ title: 'SDE 2', company: 'Example', url: 'https://example.com/careers/1' }, 'manual:1')
    const rec = withStage(ref, undefined, 'applied', t)
    expect(jobActionSchema.parse(rec).snapshot.ats).toBe('manual')
  })

  it('lists due follow-ups and upcoming interviews', () => {
    let a = withStage(feedRef, undefined, 'interview', t)
    a = withDetails(a, { followUpOn: '2026-11-01', nextAction: 'Email recruiter', interviews: [{ id: 'i1', on: '2026-11-05', kind: 'technical' }] }, t)
    expect(dueApplicationFollowUps([a], '2026-11-02')).toEqual([expect.objectContaining({ what: 'Email recruiter', dueOn: '2026-11-01' })])
    expect(dueApplicationFollowUps([a], '2026-10-30')).toEqual([])
    expect(upcomingInterviews([a], '2026-11-02')).toHaveLength(1)
    expect(groupByStage([a]).find((g) => g.stage === 'interview')!.items).toHaveLength(1)
  })

  it('counts days between dates', () => {
    expect(daysBetween('2026-11-01', '2026-11-08')).toBe(7)
  })
})
