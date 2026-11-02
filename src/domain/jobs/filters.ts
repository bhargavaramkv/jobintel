import type { CandidateProfile, WorkMode } from '../profile/schema'
import { citiesIn } from './cities.ts'
import type { City, Job, JobWorkMode } from './feedSchema.ts'

/**
 * Deterministic filtering of the public feed. This is NOT matching or scoring
 * (Phase 3); it only applies preferences the user stated explicitly.
 */
export interface JobFilters {
  query: string
  cities: City[]
  remoteIndiaOnly: boolean
  workModes: JobWorkMode[]
  companies: string[]
  postedWithinDays: number | null
  showClosed: boolean
  useProfile: boolean
}

export const DEFAULT_FILTERS: JobFilters = {
  query: '',
  cities: [],
  remoteIndiaOnly: false,
  workModes: [],
  companies: [],
  postedWithinDays: null,
  showClosed: false,
  useProfile: true,
}

export interface ProfilePreferences {
  cities: City[]
  /**
   * Profile lists a location mentioning "remote" (e.g. "Remote India"). Accepting the remote
   * WORK MODE is not enough: it says how you work, not that any location is fine.
   */
  wantsRemote: boolean
  workModes: WorkMode[]
  excludedTitles: string[]
  /** True when the profile constrains anything at all. */
  active: boolean
}

export function preferencesFromProfile(p: CandidateProfile | null): ProfilePreferences {
  if (!p) return { cities: [], wantsRemote: false, workModes: [], excludedTitles: [], active: false }
  const cities = [...new Set(p.preferredLocations.flatMap(citiesIn))]
  const wantsRemote = p.preferredLocations.some((l) => /\bremote\b/i.test(l))
  const excludedTitles = p.excludedTitles.map((t) => t.toLowerCase())
  const active = cities.length > 0 || (p.workModes.length > 0 && p.workModes.length < 3) || excludedTitles.length > 0
  return { cities, wantsRemote, workModes: p.workModes, excludedTitles, active }
}

/** Does the job fit the stated preferences? Unknown data is never treated as a mismatch. */
export function fitsPreferences(job: Job, prefs: ProfilePreferences): boolean {
  if (prefs.excludedTitles.some((t) => job.title.toLowerCase().includes(t))) return false

  if (prefs.cities.length > 0) {
    const cityHit = job.cities.some((c) => prefs.cities.includes(c))
    const remoteHit = job.remoteIndia && prefs.wantsRemote
    if (!cityHit && !remoteHit) return false
  }

  const modes = prefs.workModes
  if (modes.length > 0 && modes.length < 3 && job.workMode !== 'unknown' && !modes.includes(job.workMode)) return false
  return true
}

const DAY = 86_400_000

export function applyFilters(jobs: Job[], f: JobFilters, prefs: ProfilePreferences, now: Date = new Date()): Job[] {
  const q = f.query.trim().toLowerCase()
  const terms = q ? q.split(/\s+/) : []
  return jobs.filter((j) => {
    if (!f.showClosed && j.status !== 'open') return false
    if (f.useProfile && prefs.active && !fitsPreferences(j, prefs)) return false
    if (f.cities.length && !j.cities.some((c) => f.cities.includes(c)) && !(f.remoteIndiaOnly && j.remoteIndia)) return false
    if (f.remoteIndiaOnly && !f.cities.length && !j.remoteIndia) return false
    if (f.workModes.length && !f.workModes.includes(j.workMode)) return false
    if (f.companies.length && !f.companies.includes(j.company)) return false
    if (f.postedWithinDays !== null) {
      const ref = j.postedAt ?? j.firstSeenAt
      if (now.getTime() - new Date(ref).getTime() > f.postedWithinDays * DAY) return false
    }
    if (terms.length) {
      const hay = `${j.title} ${j.company} ${j.department ?? ''} ${j.locations.join(' ')} ${j.requirements.join(' ')}`.toLowerCase()
      if (!terms.every((t) => hay.includes(t))) return false
    }
    return true
  })
}

export type SortKey = 'newest' | 'posted' | 'company'

export function sortJobs(jobs: Job[], key: SortKey): Job[] {
  const copy = [...jobs]
  if (key === 'company') return copy.sort((a, b) => a.company.localeCompare(b.company) || a.title.localeCompare(b.title))
  if (key === 'posted')
    return copy.sort((a, b) => (b.postedAt ?? b.firstSeenAt).localeCompare(a.postedAt ?? a.firstSeenAt))
  return copy.sort((a, b) => b.firstSeenAt.localeCompare(a.firstSeenAt) || (b.postedAt ?? '').localeCompare(a.postedAt ?? ''))
}

/** A job counts as "new" when the collector first saw it within this many days. */
export const NEW_WINDOW_DAYS = 3

/** Jobs first seen by the collector within `days`. */
export function newJobs(jobs: Job[], days: number, now: Date = new Date()): Job[] {
  return jobs.filter((j) => j.status === 'open' && now.getTime() - new Date(j.firstSeenAt).getTime() <= days * DAY)
}

export type Freshness = { kind: 'none' } | { kind: 'fresh' | 'stale'; at: string; hours: number }

export const STALE_AFTER_HOURS = 24

export function feedFreshness(lastSuccessfulScanAt: string | undefined, now: Date = new Date()): Freshness {
  if (!lastSuccessfulScanAt) return { kind: 'none' }
  const hours = (now.getTime() - new Date(lastSuccessfulScanAt).getTime()) / 3_600_000
  return { kind: hours > STALE_AFTER_HOURS ? 'stale' : 'fresh', at: lastSuccessfulScanAt, hours }
}

export function relativeTime(iso: string, now: Date = new Date()): string {
  const mins = Math.round((now.getTime() - new Date(iso).getTime()) / 60_000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins} min ago`
  const hours = Math.round(mins / 60)
  if (hours < 24) return `${hours} h ago`
  const days = Math.round(hours / 24)
  if (days < 30) return `${days} d ago`
  return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
}
