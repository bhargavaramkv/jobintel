import { describe, expect, it } from 'vitest'
import { refOf, withDetails, withNote, withRejected, withStage, type JobAction } from '../jobs/actions'
import type { Contact } from '../referrals/contacts'
import type { OutreachMessage } from '../outreach/messages'
import { makeJob } from '../../test/feedFixture'
import { makeProfile } from '../../test/helpers'
import {
  buildAiContext,
  DEFAULT_EXPORT_OPTIONS,
  exportRecordOf,
  serializeContext,
  type ExportOptions,
  type ExportSource,
} from './context'
import { exportRecordSchema } from './schema'

const NOW = new Date('2026-11-03T08:00:00.000Z')

/** Every personal string below starts with SENTINEL so a leak is easy to find. */
const profile = makeProfile({
  displayName: 'SENTINEL-NAME',
  currentTitle: 'Software Engineer',
  currentCompany: 'SENTINEL-EMPLOYER',
  pastEmployers: ['SENTINEL-PAST-EMPLOYER'],
  schools: ['SENTINEL-SCHOOL'],
  yearsExperience: 4,
  professionalSummary: 'Backend engineer who ships.',
  primarySkills: [{ name: 'C#', proficiency: 'strong' }, { name: 'SQL' }],
  secondarySkills: [{ name: 'Docker' }],
  targetRoles: ['Backend Engineer'],
  targetSeniority: ['SDE-2'],
  preferredLocations: ['Bengaluru'],
  workModes: ['hybrid'],
  targetCompanies: ['Globex'],
  compensation: { currency: 'INR', minimum: 7_654_321 },
  noticePeriod: 'SENTINEL-NOTICE',
})

const acme = makeJob({ sourceId: '1', company: 'Acme Corp', title: 'Backend Engineer', requirements: ['3+ years C#', 'SQL'] })
const globex = makeJob({ sourceId: '2', company: 'Globex', title: 'Senior Backend Engineer', requirements: ['C#'] })
const initech = makeJob({ sourceId: '3', company: 'Initech', title: 'Platform Engineer' })
const hidden = makeJob({ sourceId: '4', company: 'Hooli', title: 'Backend Engineer', requirements: ['C#', 'SQL'] })
const closed = makeJob({ sourceId: '5', company: 'Pied Piper', title: 'Backend Engineer', status: 'closed' })
const rejectedJob = makeJob({ sourceId: '6', company: 'Umbrella', title: 'Backend Engineer', requirements: ['C#'] })
const jobs = [acme, globex, initech, hidden, closed, rejectedJob]

const now = NOW
let shortlisted: JobAction = withStage(refOf(acme), undefined, 'shortlisted', now, 'SENTINEL-HISTORY-NOTE')
shortlisted = withNote(refOf(acme), shortlisted, 'SENTINEL-JOB-NOTE', now)
shortlisted = withDetails(
  { ...shortlisted, interviews: [{ id: 'i1', on: '2026-11-10', kind: 'technical', outcome: 'pending', note: 'SENTINEL-INTERVIEW-NOTE' }] },
  { nextAction: 'SENTINEL-NEXT-ACTION', followUpOn: '2026-11-12', resumeVersion: 'SENTINEL-RESUME', feedback: 'SENTINEL-FEEDBACK' },
  now,
)
const notInterested = withRejected(refOf(rejectedJob), undefined, ['tech-stack'], now)
const hideCompany = withRejected(refOf(hidden), undefined, ['company'], now)

const contact: Contact = {
  id: 'c1',
  name: 'SENTINEL-PERSON',
  company: 'Acme Corp',
  role: 'Staff Engineer',
  profileUrl: 'https://sentinel.example/in/person',
  sourceUrl: 'https://sentinel.example/team',
  pastCompanies: ['SENTINEL-PAST-EMPLOYER', 'SENTINEL-CONTACT-PAST'],
  schools: ['SENTINEL-SCHOOL'],
  knowsPersonally: true,
  workedTogether: false,
  mutual: { name: 'SENTINEL-MUTUAL', evidence: 'SENTINEL-MUTUAL-EVIDENCE' },
  status: 'known',
  note: 'SENTINEL-CONTACT-NOTE',
  createdAt: '2026-11-01T00:00:00.000Z',
  updatedAt: '2026-11-01T00:00:00.000Z',
}
const stranger: Contact = { ...contact, id: 'c2', name: 'SENTINEL-STRANGER', company: 'Unrelated Ltd', note: 'SENTINEL-STRANGER-NOTE' }
const message: OutreachMessage = {
  id: 'm1',
  contactId: 'c1',
  channel: 'linkedin-message',
  kind: 'initial',
  body: 'SENTINEL-MESSAGE-BODY',
  status: 'sent',
  sentOn: '2026-11-02',
  createdAt: '2026-11-02T00:00:00.000Z',
  updatedAt: '2026-11-02T00:00:00.000Z',
}

const source = (over: Partial<ExportSource> = {}): ExportSource => ({
  profile,
  actions: [shortlisted, notInterested, hideCompany],
  jobs,
  contacts: [contact, stranger],
  messages: [message],
  now: NOW,
  ...over,
})
const build = (o: Partial<ExportOptions> = {}, s: Partial<ExportSource> = {}) =>
  buildAiContext(source(s), { ...DEFAULT_EXPORT_OPTIONS, ...o }, 'ctx-1')
const text = (o: Partial<ExportOptions> = {}, s: Partial<ExportSource> = {}) => serializeContext(build(o, s))

describe('AI context export: privacy', () => {
  it('leaks no sentinel personal string under the default (privacy-first) options', () => {
    expect(text()).not.toContain('SENTINEL')
  })

  it('never exports compensation, notice period, names, schools or employers by default', () => {
    const t = text()
    for (const forbidden of ['7654321', 'compensation', 'noticePeriod', 'displayName', 'pastEmployers', 'schools', 'currentCompany']) {
      expect(t).not.toContain(forbidden)
    }
  })

  it('exports identity and expectations only when switched on', () => {
    const t = text({ identity: true, compensation: true })
    for (const s of ['SENTINEL-NAME', 'SENTINEL-EMPLOYER', 'SENTINEL-PAST-EMPLOYER', 'SENTINEL-SCHOOL', 'SENTINEL-NOTICE', '7654321']) {
      expect(t).toContain(s)
    }
  })

  it('exports private notes only when switched on', () => {
    const on = text({ notes: true })
    for (const s of ['SENTINEL-JOB-NOTE', 'SENTINEL-NEXT-ACTION', 'SENTINEL-FEEDBACK', 'SENTINEL-INTERVIEW-NOTE', 'SENTINEL-HISTORY-NOTE']) {
      expect(on).toContain(s)
    }
    expect(text({ notes: false })).not.toContain('SENTINEL-JOB-NOTE')
  })

  it('NEVER exports fields that have no switch, even with every switch on', () => {
    const t = text({ identity: true, compensation: true, notes: true, referralNames: true, topMatches: 25 })
    for (const s of [
      'SENTINEL-CONTACT-NOTE',
      'SENTINEL-MESSAGE-BODY',
      'SENTINEL-MUTUAL',
      'SENTINEL-MUTUAL-EVIDENCE',
      'SENTINEL-CONTACT-PAST',
      'sentinel.example',
      'SENTINEL-RESUME',
    ]) {
      expect(t).not.toContain(s)
    }
  })

  it('includes lead names only when asked, and only for leads at companies you care about', () => {
    expect(text()).not.toContain('SENTINEL-PERSON')
    const named = text({ referralNames: true })
    expect(named).toContain('SENTINEL-PERSON')
    expect(named).not.toContain('SENTINEL-STRANGER')
    expect(named).not.toContain('Unrelated Ltd')
  })

  it('exports referral strength as kind + confidence, not the evidence text', () => {
    const refs = build().referrals!
    expect(refs).toHaveLength(1)
    expect(refs[0]).toMatchObject({ contactId: 'c1', company: 'Acme Corp', messagesSent: 1, replied: false })
    expect(refs[0].relationships).toContainEqual({ kind: 'direct-connection', confidence: 'verified' })
  })

  it('omits sections that are switched off entirely', () => {
    const b = build({ profile: false, pipeline: false, applications: false, referrals: false, topMatches: 0 })
    expect(Object.keys(b).sort()).toEqual(['asOf', 'contextId', 'format', 'generatedAt', 'instructions', 'resultSchema', 'schemaVersion'])
  })

  it('omits the deterministic match (which would reveal skills) when the profile is not shared', () => {
    const b = build({ profile: false })
    expect(b.candidate).toBeUndefined()
    expect(JSON.stringify(b.pipeline)).not.toContain('"match"')
    expect(JSON.stringify(b.topMatches)).not.toContain('"match"')
  })

  it('works with no profile at all', () => {
    const b = build({}, { profile: null })
    expect(b.candidate).toBeUndefined()
    expect(b.pipeline).toHaveLength(1)
  })

  it('is deterministic for the same inputs', () => {
    expect(text()).toBe(text())
  })

  it('exposes no export-log field that could hold candidate data', () => {
    const b = build({ identity: true, notes: true })
    const record = exportRecordOf(b, { ...DEFAULT_EXPORT_OPTIONS, identity: true, notes: true }, serializeContext(b), NOW)
    expect(exportRecordSchema.parse(record)).toEqual(record)
    expect(JSON.stringify(record)).not.toContain('SENTINEL')
    expect(record.counts).toEqual({ pipelineJobs: 1, topMatches: b.topMatches!.length, applications: 1, referrals: 1 })
  })
})

describe('AI context export: content', () => {
  it('puts the pipeline job first with the deterministic match breakdown', () => {
    const [entry] = build().pipeline!
    expect(entry).toMatchObject({ jobId: acme.id, stage: 'shortlisted', company: 'Acme Corp' })
    const match = entry.match as { score: number | null; factors: Array<{ id: string }> }
    expect(match.factors.map((f) => f.id)).toContain('skills')
    expect(typeof match.score).toBe('number')
  })

  it('marks a pipeline job that left the feed as not listed and sends no posting text', () => {
    const [entry] = build({}, { jobs: [] }).pipeline!
    expect(entry).toMatchObject({ jobId: acme.id, listed: false })
    expect(entry).not.toHaveProperty('description')
  })

  it('offers only open, undecided, un-hidden jobs as top matches, best first', () => {
    const ids = build({ topMatches: 10 }).topMatches!.map((j) => j.jobId)
    expect(ids).not.toContain(acme.id) // already in pipeline
    expect(ids).not.toContain(closed.id)
    expect(ids).not.toContain(rejectedJob.id) // marked Not interested
    expect(ids).not.toContain(hidden.id) // company hidden
    expect(ids).toEqual(expect.arrayContaining([globex.id, initech.id]))
  })

  it('clamps topMatches and honours zero', () => {
    expect(build({ topMatches: 0 }).topMatches).toBeUndefined()
    expect(build({ topMatches: 999 }).topMatches!.length).toBeLessThanOrEqual(25)
  })

  it('summarises Not interested reasons without notes', () => {
    const apps = build().applications as { notInterested: Array<{ company: string; reasons: string[] }> }
    expect(apps.notInterested).toContainEqual({ company: 'Umbrella', title: 'Backend Engineer', reasons: ['tech-stack'] })
  })

  it('tells the model the contract: instructions, schema and the no-auto-send rule', () => {
    const b = build()
    expect(b.instructions.join(' ')).toMatch(/cannot submit applications or send messages/)
    expect(JSON.stringify(b.resultSchema)).toContain('jobintel-ai-result')
    expect(b.contextId).toBe('ctx-1')
    expect(b.asOf).toBe('2026-11-03')
  })
})

describe('AI context export: resume (A6)', () => {
  it('includes the stored resume when the switch is on, and nothing when off or empty', () => {
    expect(build({ resume: true }, { resumeText: 'RESUME-TEXT C# .NET' }).resume).toBe('RESUME-TEXT C# .NET')
    expect(text({ resume: false }, { resumeText: 'RESUME-TEXT' })).not.toContain('RESUME-TEXT')
    expect(build({ resume: true }, { resumeText: '   ' }).resume).toBeUndefined()
  })
})
