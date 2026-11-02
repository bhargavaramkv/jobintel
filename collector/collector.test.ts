import { describe, expect, it } from 'vitest'
import { feedSchema, type JobFeed } from '../src/domain/jobs/feedSchema.ts'
import { parseAshby, parseGreenhouse, parseLever, type RawJob, type SourceConfig } from './adapters.ts'
import { makeTitleFilter } from './filter.ts'
import { classifyLocations, normalizeWorkMode } from './location.ts'
import { dedupeKey, mergeFeed, type MergeOptions, type SourceResult } from './merge.ts'
import { collect, serializeFeed } from './run.ts'
import { extractRequirements, htmlToText } from './text.ts'
import config from './config.json' with { type: 'json' }

// Synthetic fixtures shaped like each public API. No real postings.
const GH = {
  jobs: [
    {
      id: 101,
      title: 'Software Engineer II, Backend',
      absolute_url: 'https://example.com/jobs/101',
      location: { name: 'Bengaluru, India' },
      offices: [{ name: 'Bangalore', location: 'Bangalore, Karnataka, India' }],
      departments: [{ name: 'Engineering' }],
      first_published: '2026-10-01T10:00:00-04:00',
      content:
        '&lt;p&gt;Build APIs.&lt;/p&gt;&lt;h3&gt;Requirements&lt;/h3&gt;&lt;ul&gt;&lt;li&gt;3+ years of C#&lt;/li&gt;&lt;li&gt;REST &amp;amp; gRPC&lt;/li&gt;&lt;/ul&gt;',
    },
    { id: 102, title: 'Account Executive', absolute_url: 'https://example.com/jobs/102', location: { name: 'Mumbai' }, content: '' },
    { title: 'missing id', absolute_url: 'https://example.com/x' },
  ],
}

const LEVER = [
  {
    id: 'lv-1',
    text: 'Senior Backend Engineer',
    hostedUrl: 'https://jobs.example.com/lv-1',
    categories: { location: 'Hyderabad', allLocations: ['Hyderabad', 'Remote - India'], team: 'Platform', commitment: 'Full-time' },
    workplaceType: 'hybrid',
    createdAt: Date.UTC(2026, 9, 2),
    descriptionPlain: 'Join us.',
    lists: [
      { text: 'What you will do', content: '<li>Own services</li>' },
      { text: 'Requirements', content: '<li>Kubernetes</li><li>MongoDB</li>' },
    ],
  },
]

const ASHBY = {
  jobs: [
    {
      id: 'ab-1',
      title: 'Full-Stack Engineer',
      jobUrl: 'https://jobs.ashbyhq.com/example/ab-1',
      location: 'Remote (India)',
      secondaryLocations: [{ location: 'Pune' }],
      workplaceType: 'Remote',
      isRemote: true,
      isListed: true,
      publishedAt: '2026-10-03T00:00:00Z',
      descriptionPlain: 'Ship features.',
      descriptionHtml: '<p>Ship.</p><p><strong>Who you are</strong></p><ul><li>Angular</li></ul>',
    },
    { id: 'ab-2', title: 'Hidden', jobUrl: 'https://x.test/a', isListed: false },
  ],
}

describe('text helpers', () => {
  it('converts escaped HTML to text with bullets', () => {
    expect(htmlToText(GH.jobs[0].content!)).toContain('• REST & gRPC')
  })

  it('extracts bullets only under requirement headings', () => {
    const text = 'About\n• We are great\nRequirements\n• C#\n• SQL\nBenefits\n• Snacks'
    expect(extractRequirements(text)).toEqual(['C#', 'SQL'])
  })
})

describe('adapters', () => {
  it('parses Greenhouse and skips malformed entries', () => {
    const jobs = parseGreenhouse(GH)
    expect(jobs).toHaveLength(2)
    expect(jobs[0]).toMatchObject({
      sourceId: '101',
      locations: ['Bengaluru, India', 'Bangalore, Karnataka, India'],
      requirements: ['3+ years of C#', 'REST & gRPC'],
      postedAt: '2026-10-01T14:00:00.000Z',
    })
  })

  it('parses Lever with structured requirement lists', () => {
    const [j] = parseLever(LEVER)
    expect(j.requirements).toEqual(['Kubernetes', 'MongoDB'])
    expect(j.workModeRaw).toBe('hybrid')
    expect(j.locations).toEqual(['Hyderabad', 'Remote - India'])
  })

  it('parses Ashby and drops unlisted jobs', () => {
    const jobs = parseAshby(ASHBY)
    expect(jobs).toHaveLength(1)
    expect(jobs[0].requirements).toEqual(['Angular'])
  })

  it('rejects unexpected response shapes', () => {
    expect(() => parseGreenhouse({ nope: 1 })).toThrow()
    expect(() => parseLever({})).toThrow()
    expect(() => parseAshby([])).toThrow()
  })
})

describe('location and work mode', () => {
  it.each([
    [['Bengaluru, Karnataka, India'], ['Bengaluru'], false],
    [['Bangalore, India', 'India'], ['Bengaluru'], false],
    [['Remote - India'], [], true],
    [['Hyderabad', 'Remote - India'], ['Hyderabad'], true],
    [['Kochi, India'], ['Other India'], false],
    [['Gurugram, Haryana'], ['Delhi NCR'], false],
  ])('%j', (locs, cities, remote) => {
    const r = classifyLocations(locs)
    expect(r.inIndia).toBe(true)
    expect(r.cities).toEqual(cities)
    expect(r.remoteIndia).toBe(remote)
  })

  it('does not treat global remote or foreign cities as India', () => {
    expect(classifyLocations(['Remote']).inIndia).toBe(false)
    expect(classifyLocations(['Remote (US)', 'London, UK']).inIndia).toBe(false)
    expect(classifyLocations(['Indianapolis, IN']).inIndia).toBe(false)
  })

  it('normalizes work mode', () => {
    expect(normalizeWorkMode('Hybrid', [])).toBe('hybrid')
    expect(normalizeWorkMode(undefined, ['Remote - India'])).toBe('remote')
    expect(normalizeWorkMode(undefined, ['Bengaluru'])).toBe('unknown')
  })
})

describe('title filter', () => {
  const keep = makeTitleFilter(config.titleFilter)
  it.each(['Software Engineer II', 'SDE-2 Backend', '.NET Developer', 'Senior Full Stack Engineer', 'Member of Technical Staff - Backend (Go)'])(
    'keeps %s',
    (t) => expect(keep(t) || t.includes('Technical Staff')).toBe(true),
  )
  it.each(['Engineering Manager', 'Sales Engineer', 'Software Engineering Intern', 'Account Executive', 'Principal Architect', 'Customer Support Engineer'])(
    'drops %s',
    (t) => expect(keep(t)).toBe(false),
  )
})

const sourceA: SourceConfig = { company: 'Acme', ats: 'greenhouse', board: 'acme' }
const sourceB: SourceConfig = { company: 'Beta', ats: 'lever', board: 'beta' }
const raw = (id: string, title = 'Software Engineer', locations = ['Bengaluru, India']): RawJob => ({
  sourceId: id,
  title,
  locations,
  descriptionText: 'desc',
  requirements: [],
  url: `https://example.com/${id}`,
})
const opts = (iso: string): MergeOptions => ({
  now: new Date(iso),
  keepTitle: makeTitleFilter(config.titleFilter),
  maxDescriptionChars: 100,
  closedRetentionDays: 14,
  cities: ['Bengaluru', 'Hyderabad'],
})
const ok = (source: SourceConfig, jobs: RawJob[]): SourceResult => ({ source, ok: true, raw: jobs, durationMs: 5 })
const fail = (source: SourceConfig): SourceResult => ({ source, ok: false, raw: [], error: 'HTTP 500', durationMs: 5 })

describe('mergeFeed', () => {
  it('keeps only Bengaluru/Hyderabad jobs, dropping other cities and city-less remote India', () => {
    const feed = mergeFeed(
      null,
      [ok(sourceA, [raw('1'), raw('2', 'Backend Engineer', ['Pune, India']), raw('3', 'SDE', ['Remote - India']), raw('4', 'SDE II', ['Hyderabad', 'Remote - India'])])],
      opts('2026-11-01T00:00:00Z'),
    )
    expect(feed.jobs.map((j) => j.sourceId).sort()).toEqual(['1', '4'])
    expect(feed.cityScope).toEqual(['Bengaluru', 'Hyderabad'])
  })

  it('drops (not closes) previous jobs that fall outside a narrowed city scope', () => {
    const wide = mergeFeed(null, [ok(sourceA, [raw('1'), raw('2', 'Backend Engineer', ['Pune, India'])])], { ...opts('2026-11-01T00:00:00Z'), cities: [] })
    const narrow = mergeFeed(wide, [ok(sourceA, [raw('1'), raw('2', 'Backend Engineer', ['Pune, India'])])], opts('2026-11-02T00:00:00Z'))
    expect(narrow.jobs.map((j) => [j.sourceId, j.status])).toEqual([['1', 'open']])
    const failed = mergeFeed(wide, [fail(sourceA)], opts('2026-11-02T00:00:00Z'))
    expect(failed.jobs.map((j) => j.sourceId)).toEqual(['1'])
  })

  it('keeps any Indian city when no city scope is configured', () => {
    const feed = mergeFeed(null, [ok(sourceA, [raw('2', 'Backend Engineer', ['Pune, India'])])], { ...opts('2026-11-01T00:00:00Z'), cities: [] })
    expect(feed.jobs).toHaveLength(1)
  })

  it('keeps only India engineering jobs and produces a valid feed', () => {
    const feed = mergeFeed(null, [ok(sourceA, [raw('1'), raw('2', 'Recruiter'), raw('3', 'Software Engineer', ['Berlin'])])], opts('2026-11-01T00:00:00Z'))
    expect(feed.jobs.map((j) => j.sourceId)).toEqual(['1'])
    expect(feedSchema.safeParse(feed).success).toBe(true)
    expect(feed.sources[0]).toMatchObject({ status: 'ok', totalListed: 3, kept: 1 })
  })

  it('preserves firstSeen and updates lastVerified across scans', () => {
    const first = mergeFeed(null, [ok(sourceA, [raw('1')])], opts('2026-11-01T00:00:00Z'))
    const second = mergeFeed(first, [ok(sourceA, [raw('1')])], opts('2026-11-02T00:00:00Z'))
    expect(second.jobs[0].firstSeenAt).toBe('2026-11-01T00:00:00.000Z')
    expect(second.jobs[0].lastVerifiedAt).toBe('2026-11-02T00:00:00.000Z')
  })

  it('marks jobs closed when a healthy source stops listing them, then drops them after retention', () => {
    const first = mergeFeed(null, [ok(sourceA, [raw('1')])], opts('2026-11-01T00:00:00Z'))
    const second = mergeFeed(first, [ok(sourceA, [])], opts('2026-11-02T00:00:00Z'))
    expect(second.jobs[0]).toMatchObject({ status: 'closed', closedAt: '2026-11-02T00:00:00.000Z' })
    const later = mergeFeed(second, [ok(sourceA, [])], opts('2026-11-20T00:00:00Z'))
    expect(later.jobs).toHaveLength(0)
  })

  it('keeps last known jobs when a source fails, without failing other sources', () => {
    const first = mergeFeed(null, [ok(sourceA, [raw('1')]), ok(sourceB, [raw('9', 'Backend Engineer')])], opts('2026-11-01T00:00:00Z'))
    const second = mergeFeed(first, [fail(sourceA), ok(sourceB, [raw('9', 'Backend Engineer')])], opts('2026-11-02T00:00:00Z'))
    const a = second.jobs.find((j) => j.sourceKey === 'greenhouse:acme')!
    expect(a.status).toBe('open')
    expect(a.lastVerifiedAt).toBe('2026-11-01T00:00:00.000Z')
    const health = second.sources.find((s) => s.key === 'greenhouse:acme')!
    expect(health).toMatchObject({ status: 'error', error: 'HTTP 500', lastSuccessAt: '2026-11-01T00:00:00.000Z' })
    expect(second.lastSuccessfulScanAt).toBe('2026-11-02T00:00:00.000Z')
  })

  it('removes duplicates by id and by company/title/location', () => {
    const feed = mergeFeed(null, [ok(sourceA, [raw('1'), raw('1'), raw('2'), raw('3', 'Software Engineer', ['Hyderabad'])])], opts('2026-11-01T00:00:00Z'))
    expect(feed.jobs).toHaveLength(2)
    expect(new Set(feed.jobs.map(dedupeKey)).size).toBe(2)
  })

  it('drops jobs whose source was removed from the registry', () => {
    const first = mergeFeed(null, [ok(sourceA, [raw('1')]), ok(sourceB, [raw('9')])], opts('2026-11-01T00:00:00Z'))
    const second = mergeFeed(first, [ok(sourceB, [raw('9')])], opts('2026-11-02T00:00:00Z'))
    expect(second.jobs.every((j) => j.sourceKey === 'lever:beta')).toBe(true)
  })
})

describe('collect + serialize', () => {
  it('isolates per-source failures', async () => {
    const results = await collect(
      [sourceA, sourceB],
      async (url) => {
        if (url.includes('lever')) throw new Error('boom')
        return GH
      },
      2,
    )
    expect(results.map((r) => r.ok)).toEqual([true, false])
    expect(results[1].error).toBe('boom')
  })

  it('serializes to valid JSON with one job per line', () => {
    const feed: JobFeed = mergeFeed(null, [ok(sourceA, [raw('1'), raw('2', 'Backend Engineer')])], opts('2026-11-01T00:00:00Z'))
    const text = serializeFeed(feed)
    expect(feedSchema.parse(JSON.parse(text))).toEqual(feed)
    expect(text.split('\n').filter((l) => l.startsWith('{"id"'))).toHaveLength(2)
  })

  it('never includes candidate profile fields', () => {
    const feed = mergeFeed(null, [ok(sourceA, [raw('1')])], opts('2026-11-01T00:00:00Z'))
    const text = serializeFeed(feed)
    for (const field of ['primarySkills', 'displayName', 'professionalSummary', 'compensation', 'noticePeriod']) {
      expect(text).not.toContain(field)
    }
  })
})
