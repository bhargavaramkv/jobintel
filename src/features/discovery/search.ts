import type { City, Job, JobWorkMode } from '../../domain/jobs/feedSchema'
import type { MatchResult } from '../../domain/match/score'

/** Search, filter and sort for the Jobs page. Pure: the page reads these from the URL query. */

export const CITY_FILTERS = ['Bengaluru', 'Hyderabad'] as const satisfies readonly City[]
export const MODE_FILTERS = ['onsite', 'hybrid', 'remote'] as const satisfies readonly JobWorkMode[]
export const SORTS = ['match', 'newest'] as const

export type CityFilter = (typeof CITY_FILTERS)[number]
export type ModeFilter = (typeof MODE_FILTERS)[number]
export type SortKey = (typeof SORTS)[number]

export interface JobQuery {
  q: string
  city: CityFilter | ''
  mode: ModeFilter | ''
  /** Jobs scoring below this are hidden. 0 shows everything, including jobs without a score. */
  min: number
  sort: SortKey
}

export interface ScoredJob {
  job: Job
  match: MatchResult
}

/** Reads ?q=&city=&mode=&min=&sort= and ignores values it does not know. `defaultMin` applies when `min` is absent or invalid. */
export function queryFromParams(params: URLSearchParams, defaultMin: number): JobQuery {
  const city = params.get('city')
  const mode = params.get('mode')
  const min = params.get('min')
  const sort = params.get('sort')
  const minNum = min !== null && /^\d{1,3}$/.test(min) && Number(min) <= 100 ? Number(min) : defaultMin
  return {
    q: params.get('q') ?? '',
    city: CITY_FILTERS.find((c) => c === city) ?? '',
    mode: MODE_FILTERS.find((m) => m === mode) ?? '',
    min: minNum,
    sort: SORTS.find((s) => s === sort) ?? 'match',
  }
}

const postedKey = (j: Job) => j.postedAt ?? j.firstSeenAt

export function searchJobs(items: readonly ScoredJob[], query: JobQuery): ScoredJob[] {
  const terms = query.q.trim().toLowerCase().split(/\s+/).filter(Boolean)
  const out = items.filter(({ job, match }) => {
    if (query.city && !job.cities.includes(query.city)) return false
    if (query.mode && job.workMode !== query.mode) return false
    if (query.min > 0 && (match.score === null || match.score < query.min)) return false
    if (terms.length) {
      const hay = `${job.title}\n${job.company}\n${job.description}`.toLowerCase()
      if (!terms.every((t) => hay.includes(t))) return false
    }
    return true
  })
  const byNewest = (a: ScoredJob, b: ScoredJob) => postedKey(b.job).localeCompare(postedKey(a.job)) || a.job.id.localeCompare(b.job.id)
  if (query.sort === 'newest') return out.sort(byNewest)
  return out.sort((a, b) => (b.match.score ?? -1) - (a.match.score ?? -1) || byNewest(a, b))
}
