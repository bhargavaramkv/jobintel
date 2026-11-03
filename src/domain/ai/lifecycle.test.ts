import { describe, expect, it } from 'vitest'
import { storedBriefing, storedRec } from '../../test/aiFixture'
import { canTransition, countByStatus, isPending, latestBriefing, sortInbox, STATUS_LABEL, withStatus } from './lifecycle'
import { REVIEW_STATUSES } from './schema'

const now = new Date('2026-11-04T09:00:00.000Z')

describe('recommendation review lifecycle', () => {
  it('labels all four states', () => {
    expect(REVIEW_STATUSES.map((s) => STATUS_LABEL[s])).toEqual(['Generated', 'Reviewed', 'Accepted', 'Rejected'])
  })

  it('allows the documented transitions and nothing else', () => {
    const allowed = [
      ['generated', 'reviewed'],
      ['generated', 'accepted'],
      ['generated', 'rejected'],
      ['reviewed', 'accepted'],
      ['reviewed', 'rejected'],
      ['rejected', 'reviewed'],
    ]
    for (const from of REVIEW_STATUSES) {
      for (const to of REVIEW_STATUSES) {
        expect(canTransition(from, to), `${from} -> ${to}`).toBe(allowed.some(([a, b]) => a === from && b === to))
      }
    }
  })

  it('marks reviewed with a timestamp and no decision', () => {
    const r = withStatus(storedRec(), 'reviewed', now)
    expect(r).toMatchObject({ status: 'reviewed', reviewedAt: now.toISOString() })
    expect(r.decidedAt).toBeUndefined()
  })

  it('records the decision time and outcome, keeping an earlier review time', () => {
    const reviewed = withStatus(storedRec(), 'reviewed', new Date('2026-11-03T10:00:00.000Z'))
    const done = withStatus(reviewed, 'accepted', now, 'Shortlisted Backend Engineer at Acme.')
    expect(done).toMatchObject({ status: 'accepted', reviewedAt: '2026-11-03T10:00:00.000Z', decidedAt: now.toISOString(), outcome: 'Shortlisted Backend Engineer at Acme.' })
  })

  it('treats accepting straight from "generated" as having reviewed it', () => {
    expect(withStatus(storedRec(), 'rejected', now).reviewedAt).toBe(now.toISOString())
  })

  it('reopening a rejection clears the decision', () => {
    const reopened = withStatus(withStatus(storedRec(), 'rejected', now, 'x'), 'reviewed', now)
    expect(reopened.decidedAt).toBeUndefined()
    expect(reopened.outcome).toBeUndefined()
    expect(reopened.status).toBe('reviewed')
  })

  it('refuses an illegal transition, so an accepted change cannot be silently undone', () => {
    const accepted = withStatus(storedRec(), 'accepted', now)
    expect(() => withStatus(accepted, 'rejected', now)).toThrow(/accepted.*cannot become rejected/)
    expect(() => withStatus(accepted, 'generated', now)).toThrow()
  })

  it('does not mutate its input', () => {
    const r = storedRec()
    withStatus(r, 'accepted', now)
    expect(r.status).toBe('generated')
  })

  it('knows which states still need a decision', () => {
    expect(REVIEW_STATUSES.filter(isPending)).toEqual(['generated', 'reviewed'])
  })
})

describe('inbox ordering and counts', () => {
  const a = storedRec({ id: 'a', priority: 'low', confidence: 0.9 })
  const b = storedRec({ id: 'b', priority: 'high', confidence: 0.5 })
  const c = storedRec({ id: 'c', priority: 'high', confidence: 0.8 })
  const d = storedRec({ id: 'd', priority: 'high', confidence: 0.99, status: 'accepted' })

  it('lists pending first, by priority then confidence; decided items last', () => {
    expect(sortInbox([a, b, c, d]).map((r) => r.id)).toEqual(['c', 'b', 'a', 'd'])
  })

  it('counts every status, including zeros', () => {
    expect(countByStatus([a, b, d, storedRec({ id: 'e', status: 'rejected' })])).toEqual({ generated: 2, reviewed: 0, accepted: 1, rejected: 1 })
  })

  it('picks the briefing for the latest day, newest import first', () => {
    const old = storedBriefing({ id: '1', date: '2026-11-01' })
    const today = storedBriefing({ id: '2', date: '2026-11-03', importedAt: '2026-11-03T08:00:00.000Z' })
    const todayAgain = storedBriefing({ id: '3', date: '2026-11-03', importedAt: '2026-11-03T09:00:00.000Z' })
    expect(latestBriefing([old, today, todayAgain])?.id).toBe('3')
    expect(latestBriefing([])).toBeUndefined()
  })
})
