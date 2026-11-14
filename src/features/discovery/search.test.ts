import { describe, expect, it } from 'vitest'
import type { Job } from '../../domain/jobs/feedSchema'
import type { MatchResult } from '../../domain/match/score'
import { makeJob } from '../../test/feedFixture'
import { queryFromParams, searchJobs, type JobQuery, type ScoredJob } from './search'

const match = (score: number | null): MatchResult => ({ score, coverage: 100, band: 'good', factors: [], gaps: { mandatory: [], preferred: [] }, notes: [] })
const item = (id: string, score: number | null, o: Partial<Job> = {}): ScoredJob => ({
  job: makeJob({ sourceId: id, ...o }),
  match: match(score),
})

const items = [
  item('a', 90, { company: 'Acme', title: 'Backend Engineer', description: 'Payments in C#', workMode: 'hybrid', postedAt: '2026-11-01T00:00:00Z' }),
  item('b', 60, { company: 'Globex', title: 'Frontend Engineer', cities: ['Hyderabad'], workMode: 'remote', description: 'React apps', postedAt: '2026-11-10T00:00:00Z' }),
  item('c', null, { company: 'Initech', title: 'Data Scientist', workMode: 'onsite', description: 'Backend data pipelines', postedAt: '2026-11-05T00:00:00Z' }),
]
const base: JobQuery = { q: '', city: '', mode: '', min: 0, sort: 'match' }
const ids = (r: ScoredJob[]) => r.map((x) => x.job.sourceId)

describe('searchJobs', () => {
  it('returns everything, best match first, with no filters', () => {
    expect(ids(searchJobs(items, base))).toEqual(['a', 'b', 'c'])
  })

  it('searches title, company and description, case-insensitively', () => {
    expect(ids(searchJobs(items, { ...base, q: 'FRONTEND' }))).toEqual(['b'])
    expect(ids(searchJobs(items, { ...base, q: 'initech' }))).toEqual(['c'])
    expect(ids(searchJobs(items, { ...base, q: 'payments c#' }))).toEqual(['a'])
    expect(ids(searchJobs(items, { ...base, q: 'backend' }))).toEqual(['a', 'c'])
  })

  it('filters by city', () => {
    expect(ids(searchJobs(items, { ...base, city: 'Hyderabad' }))).toEqual(['b'])
    expect(ids(searchJobs(items, { ...base, city: 'Bengaluru' }))).toEqual(['a', 'c'])
  })

  it('filters by work mode', () => {
    expect(ids(searchJobs(items, { ...base, mode: 'remote' }))).toEqual(['b'])
    expect(ids(searchJobs(items, { ...base, mode: 'onsite' }))).toEqual(['c'])
  })

  it('filters by minimum score and hides unscored jobs when a minimum is set', () => {
    expect(ids(searchJobs(items, { ...base, min: 60 }))).toEqual(['a', 'b'])
    expect(ids(searchJobs(items, { ...base, min: 61 }))).toEqual(['a'])
  })

  it('sorts newest first by posted date', () => {
    expect(ids(searchJobs(items, { ...base, sort: 'newest' }))).toEqual(['b', 'c', 'a'])
  })

  it('combines filters and can return nothing', () => {
    expect(ids(searchJobs(items, { ...base, q: 'engineer', city: 'Hyderabad', mode: 'remote', min: 50 }))).toEqual(['b'])
    expect(searchJobs(items, { ...base, q: 'engineer', mode: 'onsite' })).toEqual([])
  })

  it('does not change the input order', () => {
    const copy = [...items]
    searchJobs(items, { ...base, sort: 'newest' })
    expect(items).toEqual(copy)
  })
})

describe('queryFromParams', () => {
  it('reads q, city, mode, min and sort', () => {
    const q = queryFromParams(new URLSearchParams('q=react&city=Hyderabad&mode=remote&min=70&sort=newest'), 50)
    expect(q).toEqual({ q: 'react', city: 'Hyderabad', mode: 'remote', min: 70, sort: 'newest' })
  })

  it('falls back to defaults for missing or unknown values', () => {
    expect(queryFromParams(new URLSearchParams(''), 55)).toEqual({ q: '', city: '', mode: '', min: 55, sort: 'match' })
    expect(queryFromParams(new URLSearchParams('city=Mars&mode=hover&min=abc&sort=random'), 55)).toEqual({ q: '', city: '', mode: '', min: 55, sort: 'match' })
    expect(queryFromParams(new URLSearchParams('min=101'), 55).min).toBe(55)
  })

  it('lets an explicit min=0 override the default', () => {
    expect(queryFromParams(new URLSearchParams('min=0'), 55).min).toBe(0)
  })
})
