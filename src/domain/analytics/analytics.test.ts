import { describe, expect, it } from 'vitest'
import { makeJob } from '../../test/feedFixture'
import { makeProfile } from '../../test/helpers'
import { refOf, withApplied, withRejected, withStage, type JobAction } from '../jobs/actions'
import { applicationsCsv, byCompany, funnel, outreachStats, recommendations, responseTimes, skillGaps } from './analytics'

const d = (day: string) => new Date(`${day}T10:00:00Z`)
const ref = (id: string, company = 'Acme Corp', title = 'Backend Engineer') => refOf(makeJob({ sourceId: id, company, title }))

function journey(id: string, stages: Array<[Parameters<typeof withStage>[2], string]>, company?: string): JobAction {
  let a: JobAction | undefined
  for (const [s, day] of stages) a = withStage(ref(id, company), a, s, d(day))
  return a!
}

describe('analytics', () => {
  const recs = [
    journey('a', [['shortlisted', '2026-10-01'], ['applied', '2026-10-02'], ['interview', '2026-10-09'], ['offer', '2026-10-20']]),
    journey('b', [['applied', '2026-10-03'], ['rejected', '2026-10-13']], 'Beta'),
    journey('c', [['applied', '2026-10-05']], 'Beta'),
    journey('s', [['shortlisted', '2026-10-01']]),
    withRejected(ref('x'), undefined, [], d('2026-10-01')),
  ]

  it('builds a funnel from history, with traceable ids', () => {
    const f = funnel(recs, 300)
    const get = (id: string) => f.find((s) => s.id === id)!
    expect(get('discovered').value).toBe(300)
    expect(get('pipeline').ids.sort()).toEqual(['greenhouse:acme:a', 'greenhouse:acme:b', 'greenhouse:acme:c', 'greenhouse:acme:s'])
    expect(get('applied').value).toBe(3)
    expect(get('responded').value).toBe(2)
    expect(get('interview').ids).toEqual(['greenhouse:acme:a'])
    expect(get('offer').value).toBe(1)
    expect(get('applied').conversion).toBeCloseTo(0.75)
  })

  it('counts legacy applied records without history', () => {
    const legacy = withApplied(ref('l'), undefined, d('2026-10-01'))
    delete legacy.stage
    delete legacy.history
    expect(funnel([legacy], 0).find((s) => s.id === 'applied')!.value).toBe(1)
  })

  it('computes company response rates and response times', () => {
    const rows = byCompany(recs)
    expect(rows.find((r) => r.company === 'Beta')).toMatchObject({ applied: 2, responded: 1, rejections: 1, responseRate: 0.5 })
    const t = responseTimes(recs, '2026-11-02')
    expect(t.samples.map((s) => s.days).sort((x, y) => x - y)).toEqual([7, 10])
    expect(t.median).toBe(8.5)
    expect(t.waiting).toEqual([{ jobId: 'greenhouse:acme:c', days: 28 }])
  })

  it('finds repeated skill gaps across relevant jobs', () => {
    const p = makeProfile({ primarySkills: [{ name: 'C#' }], targetRoles: ['Backend Engineer'], preferredLocations: ['Bengaluru'], yearsExperience: 3 })
    const jobs = ['1', '2', '3'].map((i) => makeJob({ sourceId: `k${i}`, title: 'Backend Engineer', requirements: ['3+ years C#', 'Kafka'] }))
    const g = skillGaps(jobs, [], p, [])
    expect(g.relevant).toBe(3)
    expect(g.gaps[0]).toMatchObject({ skill: 'Kafka', share: 1 })
    expect(skillGaps(jobs, [], makeProfile(), [])).toEqual({ gaps: [], relevant: 0 })
  })

  it('recommends from evidence and flags small samples', () => {
    const f = funnel(recs, 0)
    const o = outreachStats(recs, [], [], null)
    const r = recommendations({ actions: recs, funnel: f, outreach: o, gaps: { gaps: [], relevant: 0 }, times: responseTimes(recs, '2026-11-02'), today: '2026-11-02' })
    const texts = r.map((x) => x.text).join('\n')
    expect(texts).toMatch(/shortlisted job untouched/)
    expect(texts).toMatch(/no response for 2\+ weeks/)
    expect(texts).toMatch(/fewer than 5 applications/)
    expect(r.every((x) => x.evidence.length > 0)).toBe(true)
  })

  it('exports CSV with escaping', () => {
    const csv = applicationsCsv([journey('q', [['applied', '2026-10-01']], 'Comma, Inc')])
    expect(csv.split('\n')[1]).toMatch(/^"Comma, Inc",Backend Engineer,applied,2026-10-01/)
  })
})
