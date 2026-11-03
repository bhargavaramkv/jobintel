import { describe, expect, it } from 'vitest'
import { makeJob } from '../../test/feedFixture'
import { refOf, withDetails, withStage } from '../jobs/actions'
import { reminderSummary, shouldNotify } from './reminders'

const t = new Date('2026-11-02T10:00:00Z')

describe('reminders', () => {
  it('summarises interviews today and due follow-ups', () => {
    const ref = refOf(makeJob({ sourceId: 'r1' }))
    const a = withDetails(withStage(ref, undefined, 'interview', t), { followUpOn: '2026-11-01', interviews: [{ id: 'i', on: '2026-11-02', kind: 'technical' }] }, t)
    const lead = {
      id: 'c1', name: 'A', company: 'Acme Corp', sourceUrl: 'https://example.com', pastCompanies: [], schools: [],
      knowsPersonally: false, workedTogether: false, status: 'contacted' as const, note: '', createdAt: '', updatedAt: '',
    }
    const msg = { id: 'm', contactId: 'c1', channel: 'email' as const, kind: 'initial' as const, body: 'x', status: 'sent' as const, sentOn: '2026-10-20', createdAt: '', updatedAt: '' }
    const s = reminderSummary([a], [lead], [msg], '2026-11-02')
    expect(s).toMatchObject({ interviewsToday: 1, applicationFollowUps: 1, outreachFollowUps: 1, total: 3 })
    expect(s.lines[0]).toBe('1 interview today')
  })

  it('notifies once per day and only when something is due', () => {
    const some = { outreachFollowUps: 1, applicationFollowUps: 0, interviewsToday: 0, total: 1, lines: [] }
    expect(shouldNotify(some, null, '2026-11-02')).toBe(true)
    expect(shouldNotify(some, '2026-11-02', '2026-11-02')).toBe(false)
    expect(shouldNotify({ ...some, total: 0 }, null, '2026-11-02')).toBe(false)
  })
})
