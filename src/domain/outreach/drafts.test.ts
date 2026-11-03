import { describe, expect, it } from 'vitest'
import { makeProfile } from '../../test/helpers'
import { relationshipsOf, type Contact } from '../referrals/contacts'
import { addDays, allowedStrategies, followUpDraft, followUpState, generateDraft, strategyFor } from './drafts'
import { outreachMessageSchema, threadOf, type OutreachMessage } from './messages'

const lead = (o: Partial<Contact> = {}): Contact => ({
  id: 'c1',
  name: 'Asha Rao',
  company: 'Acme Corp',
  role: 'Senior Backend Engineer',
  sourceUrl: 'https://example.com/team',
  pastCompanies: [],
  schools: [],
  knowsPersonally: false,
  workedTogether: false,
  status: 'new',
  note: '',
  createdAt: '2026-11-01T00:00:00.000Z',
  updatedAt: '2026-11-01T00:00:00.000Z',
  ...o,
})
const me = makeProfile({ displayName: 'Test User', currentTitle: 'Software Engineer', currentCompany: 'Globex', yearsExperience: 4, pastEmployers: ['Initech'], schools: ['State University'], primarySkills: [{ name: 'C#' }, { name: '.NET' }] })
const job = { title: 'Backend Engineer II', company: 'Acme Corp', url: 'https://example.com/jobs/1' }

describe('strategyFor', () => {
  it('asks for a referral only with a confirmed relationship', () => {
    expect(strategyFor(relationshipsOf(lead({ knowsPersonally: true }), me)).id).toBe('direct')
    expect(strategyFor(relationshipsOf(lead({ pastCompanies: ['Initech'], workedTogether: true }), me)).id).toBe('colleague')
    expect(strategyFor(relationshipsOf(lead({ pastCompanies: ['Initech'] }), me))).toMatchObject({ id: 'shared-employer', asksReferral: false })
    expect(strategyFor(relationshipsOf(lead({ schools: ['State University'] }), me))).toMatchObject({ id: 'alumni', asksReferral: false })
    expect(strategyFor(relationshipsOf(lead({ role: 'Talent Acquisition Partner' }), me)).id).toBe('recruiter')
    expect(strategyFor(relationshipsOf(lead(), me))).toMatchObject({ id: 'advice', asksReferral: false })
  })
})

describe('allowedStrategies', () => {
  it('never offers a strategy the facts do not support', () => {
    expect(allowedStrategies(relationshipsOf(lead(), me))).toEqual(['advice'])
    expect(allowedStrategies(relationshipsOf(lead({ pastCompanies: ['Initech'] }), me))).toEqual(['shared-employer', 'advice'])
    const d = generateDraft({ lead: lead(), rels: relationshipsOf(lead(), me), profile: me, channel: 'email', tone: 'concise', strategy: 'colleague' })
    expect(d.strategy.id).toBe('advice')
  })
})

describe('generateDraft', () => {
  it('uses only recorded context and never claims familiarity it lacks', () => {
    const d = generateDraft({ lead: lead(), rels: relationshipsOf(lead(), me), profile: me, job, channel: 'email', tone: 'concise', matchedSkills: ['C#'] })
    expect(d.body).toMatch(/^Hi Asha,/)
    expect(d.body).toContain('Backend Engineer II')
    expect(d.body).toContain(job.url)
    expect(d.body).not.toMatch(/worked together|we both|refer(ring)? me/i)
    expect(d.body).toContain('Test User')
    expect(d.subject).toMatch(/^Question:/)
    expect(d.usedFacts).toEqual(expect.arrayContaining([expect.stringMatching(/Job: Backend Engineer II/)]))
  })

  it('mentions shared history only when the facts support it', () => {
    const l = lead({ pastCompanies: ['Initech'], workedTogether: true })
    const d = generateDraft({ lead: l, rels: relationshipsOf(l, me), profile: me, job, channel: 'linkedin-message', tone: 'warm' })
    expect(d.body).toContain('worked together at Initech')
    expect(d.body).toMatch(/referring me/)
    const alum = lead({ schools: ['State University'] })
    expect(generateDraft({ lead: alum, rels: relationshipsOf(alum, me), profile: me, channel: 'email', tone: 'formal' }).body).toContain('studied at State University')
  })

  it('keeps LinkedIn notes within 300 characters', () => {
    const d = generateDraft({ lead: lead(), rels: relationshipsOf(lead(), me), profile: me, job, channel: 'linkedin-note', tone: 'concise' })
    expect(d.body.length).toBeLessThanOrEqual(300)
    expect(d.warnings.some((w) => /limit/.test(w))).toBe(false)
  })

  it('warns instead of inventing details when the profile is empty', () => {
    const d = generateDraft({ lead: lead(), rels: [], profile: null, channel: 'email', tone: 'concise' })
    expect(d.warnings[0]).toMatch(/Add your current title/)
    expect(d.body).not.toMatch(/undefined|null|\[/)
  })
})

describe('follow-up policy', () => {
  it('schedules at most two follow-ups a week apart and stops after a reply', () => {
    expect(followUpState([], false).dueOn).toBeNull()
    expect(followUpState(['2026-11-01'], false)).toMatchObject({ dueOn: '2026-11-08', reason: 'Follow-up 1 of 2' })
    expect(followUpState(['2026-11-01', '2026-11-08'], false).dueOn).toBe('2026-11-15')
    expect(followUpState(['2026-11-01', '2026-11-08', '2026-11-15'], false).dueOn).toBeNull()
    expect(followUpState(['2026-11-01'], true).dueOn).toBeNull()
    expect(addDays('2026-12-28', 7)).toBe('2027-01-04')
  })

  it('writes a short, final second follow-up', () => {
    expect(followUpDraft(lead(), 2, 'concise', job)).toMatch(/won't message again/)
  })
})

describe('message log', () => {
  const m = (o: Partial<OutreachMessage>): OutreachMessage => ({
    id: 'm1', contactId: 'c1', channel: 'email', kind: 'initial', body: 'Hi', status: 'sent', sentOn: '2026-11-01',
    createdAt: '2026-11-01T00:00:00Z', updatedAt: '2026-11-01T00:00:00Z', ...o,
  })
  it('requires a date for sent messages', () => {
    expect(outreachMessageSchema.safeParse(m({})).success).toBe(true)
    expect(outreachMessageSchema.safeParse(m({ sentOn: undefined })).success).toBe(false)
  })
  it('builds a thread per person', () => {
    const t = threadOf([m({ id: 'a', sentOn: '2026-11-08' }), m({ id: 'b' }), m({ id: 'c', contactId: 'c2' }), m({ id: 'd', status: 'draft', sentOn: undefined })], 'c1')
    expect(t.sent).toEqual(['2026-11-01', '2026-11-08'])
    expect(t.messages).toHaveLength(3)
    expect(t.replied).toBe(false)
  })
})
