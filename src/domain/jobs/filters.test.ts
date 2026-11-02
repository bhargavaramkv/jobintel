import { describe, expect, it } from 'vitest'
import { makeJob } from '../../test/feedFixture'
import { makeProfile } from '../../test/helpers'
import {
  applyFilters,
  DEFAULT_FILTERS,
  feedFreshness,
  fitsPreferences,
  newJobs,
  preferencesFromProfile,
  sortJobs,
} from './filters'

const now = new Date('2026-11-02T12:00:00.000Z')

const blr = makeJob({ sourceId: '1', title: 'Backend Engineer' })
const hyd = makeJob({ sourceId: '2', cities: ['Hyderabad'], locations: ['Hyderabad'], workMode: 'hybrid' })
const pune = makeJob({ sourceId: '3', cities: ['Pune'], locations: ['Pune'], workMode: 'onsite' })
const remote = makeJob({ sourceId: '4', cities: [], locations: ['Remote - India'], remoteIndia: true, workMode: 'remote' })
const closed = makeJob({ sourceId: '5', status: 'closed', closedAt: '2026-11-02T00:00:00.000Z' })
const qa = makeJob({ sourceId: '6', title: 'QA Engineer' })
const all = [blr, hyd, pune, remote, closed, qa]

describe('preferencesFromProfile', () => {
  it('is inactive without a profile or preferences', () => {
    expect(preferencesFromProfile(null).active).toBe(false)
    expect(preferencesFromProfile(makeProfile()).active).toBe(false)
  })

  it('maps free-text locations to cities', () => {
    const p = preferencesFromProfile(makeProfile({ preferredLocations: ['Bangalore', 'Hyderabad, Telangana'] }))
    expect(p.cities).toEqual(['Bengaluru', 'Hyderabad'])
    expect(p.active).toBe(true)
  })
})

describe('fitsPreferences', () => {
  const prefs = preferencesFromProfile(
    makeProfile({ preferredLocations: ['Bengaluru', 'Hyderabad'], workModes: ['onsite', 'hybrid', 'remote'] }),
  )

  it('keeps only preferred cities, even when the remote work mode is accepted', () => {
    expect([blr, hyd].every((j) => fitsPreferences(j, prefs))).toBe(true)
    expect(fitsPreferences(pune, prefs)).toBe(false)
    expect(fitsPreferences(remote, prefs)).toBe(false) // remote India with no Bengaluru/Hyderabad
  })

  it('keeps city-less remote-India jobs only when a location explicitly says remote', () => {
    const p = preferencesFromProfile(makeProfile({ preferredLocations: ['Bengaluru', 'Remote India'] }))
    expect(fitsPreferences(remote, p)).toBe(true)
  })

  it('keeps jobs with an unknown work mode instead of guessing', () => {
    const p = preferencesFromProfile(makeProfile({ preferredLocations: ['Bengaluru'], workModes: ['remote'] }))
    expect(fitsPreferences(blr, p)).toBe(true) // workMode unknown
  })

  it('applies excluded titles case-insensitively', () => {
    const p = preferencesFromProfile(makeProfile({ excludedTitles: ['qa'] }))
    expect(fitsPreferences(qa, p)).toBe(false)
  })
})

describe('applyFilters', () => {
  const none = preferencesFromProfile(null)

  it('hides closed jobs by default', () => {
    expect(applyFilters(all, DEFAULT_FILTERS, none, now)).not.toContain(closed)
    expect(applyFilters(all, { ...DEFAULT_FILTERS, showClosed: true }, none, now)).toContain(closed)
  })

  it('filters by text across title, company and requirements', () => {
    expect(applyFilters(all, { ...DEFAULT_FILTERS, query: 'backend' }, none, now)).toEqual([blr])
    expect(applyFilters(all, { ...DEFAULT_FILTERS, query: 'c# acme' }, none, now).length).toBe(5)
  })

  it('filters by city, remote India and work mode', () => {
    expect(applyFilters(all, { ...DEFAULT_FILTERS, cities: ['Hyderabad'] }, none, now)).toEqual([hyd])
    expect(applyFilters(all, { ...DEFAULT_FILTERS, remoteIndiaOnly: true }, none, now)).toEqual([remote])
    expect(applyFilters(all, { ...DEFAULT_FILTERS, workModes: ['onsite'] }, none, now)).toEqual([pune])
  })

  it('filters by posted date, falling back to first seen', () => {
    const old = makeJob({ sourceId: '9', postedAt: '2026-09-01T00:00:00.000Z' })
    expect(applyFilters([blr, old], { ...DEFAULT_FILTERS, postedWithinDays: 7 }, none, now)).toEqual([blr])
  })

  it('ignores the profile toggle when turned off', () => {
    const prefs = preferencesFromProfile(makeProfile({ preferredLocations: ['Bengaluru'] }))
    expect(applyFilters(all, DEFAULT_FILTERS, prefs, now)).not.toContain(pune)
    expect(applyFilters(all, { ...DEFAULT_FILTERS, useProfile: false }, prefs, now)).toContain(pune)
  })
})

describe('newJobs, sorting and freshness', () => {
  it('counts open jobs first seen within the window', () => {
    const recent = makeJob({ sourceId: '10', firstSeenAt: '2026-11-02T06:00:00.000Z' })
    const older = makeJob({ sourceId: '11', firstSeenAt: '2026-10-20T00:00:00.000Z' })
    expect(newJobs([recent, older, closed], 3, now)).toEqual([recent])
  })

  it('sorts deterministically', () => {
    const a = makeJob({ sourceId: 'a', company: 'Zeta', firstSeenAt: '2026-11-01T00:00:00.000Z' })
    const b = makeJob({ sourceId: 'b', company: 'Alpha', firstSeenAt: '2026-11-02T00:00:00.000Z' })
    expect(sortJobs([a, b], 'newest').map((j) => j.sourceId)).toEqual(['b', 'a'])
    expect(sortJobs([a, b], 'company').map((j) => j.sourceId)).toEqual(['b', 'a'])
  })

  it('reports staleness after 24 hours', () => {
    expect(feedFreshness(undefined, now).kind).toBe('none')
    expect(feedFreshness('2026-11-02T06:00:00.000Z', now).kind).toBe('fresh')
    expect(feedFreshness('2026-10-31T00:00:00.000Z', now).kind).toBe('stale')
  })
})
