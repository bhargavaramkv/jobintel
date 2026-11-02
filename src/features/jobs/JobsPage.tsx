import { CircleAlert, CircleCheck, Loader2, Radar, RefreshCw, RotateCcw, Search, TriangleAlert } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useNow } from '../../components/layout/useNow'
import { CITY_ORDER } from '../../domain/jobs/cities'
import { ATS_LABEL, type City, type JobFeed, type JobWorkMode } from '../../domain/jobs/feedSchema'
import {
  applyFilters,
  DEFAULT_FILTERS,
  feedFreshness,
  NEW_WINDOW_DAYS,
  newJobs,
  preferencesFromProfile,
  relativeTime,
  sortJobs,
  type JobFilters,
  type SortKey,
} from '../../domain/jobs/filters'
import { useProfile } from '../profile/useProfile'
import { JobCard } from './JobCard'
import { useJobFeed } from './jobFeed'
import './jobs.css'

const PAGE = 30

export function JobsPage({ now: nowOverride }: { now?: Date }) {
  const now = useNow(nowOverride)
  const { state, reload } = useJobFeed()

  return (
    <div className="jobs">
      <header className="profile__header">
        <div>
          <p className="eyebrow">Discovery</p>
          <h1 className="profile__title">Job Discovery</h1>
          <p className="secondary profile__lede">
            Public openings collected from company job boards a few times a day. Filtering happens in your browser.
          </p>
        </div>
        <button type="button" className="btn btn--secondary" onClick={reload} disabled={state.status === 'loading'}>
          <RefreshCw size={15} aria-hidden="true" /> Reload feed
        </button>
      </header>

      {state.status === 'loading' && (
        <div className="profile-loading" role="status">
          <Loader2 size={18} className="spin" aria-hidden="true" /> Loading the public job feed…
        </div>
      )}
      {state.status === 'error' && (
        <div className="alert alert--danger" role="alert">
          <CircleAlert size={16} aria-hidden="true" />
          <span>{state.message}</span>
        </div>
      )}
      {state.status === 'empty' && (
        <section className="panel">
          <div className="empty">
            <Radar size={40} className="muted" aria-hidden="true" />
            <h2 className="empty__title">No scan has run yet</h2>
            <p className="empty__text">
              The collector runs on a schedule in GitHub Actions. Jobs appear here after the first successful scan.
            </p>
          </div>
        </section>
      )}
      {state.status === 'ready' && <FeedView feed={state.feed} now={now} />}
    </div>
  )
}

function FeedView({ feed, now }: { feed: JobFeed; now: Date }) {
  const { profile } = useProfile()
  const prefs = useMemo(() => preferencesFromProfile(profile), [profile])
  const [filters, setFilters] = useState<JobFilters>(DEFAULT_FILTERS)
  const [sort, setSort] = useState<SortKey>('newest')
  const [limit, setLimit] = useState(PAGE)

  const set = <K extends keyof JobFilters>(key: K, value: JobFilters[K]) => {
    setFilters((f) => ({ ...f, [key]: value }))
    setLimit(PAGE)
  }

  const companies = useMemo(() => [...new Set(feed.jobs.map((j) => j.company))].sort((a, b) => a.localeCompare(b)), [feed])
  const results = useMemo(() => sortJobs(applyFilters(feed.jobs, filters, prefs, now), sort), [feed, filters, prefs, now, sort])
  const newIds = useMemo(() => new Set(newJobs(feed.jobs, NEW_WINDOW_DAYS, now).map((j) => j.id)), [feed, now])
  const openCount = feed.jobs.filter((j) => j.status === 'open').length
  const freshness = feedFreshness(feed.lastSuccessfulScanAt, now)
  const healthy = feed.sources.filter((s) => s.status === 'ok').length
  const failed = feed.sources.filter((s) => s.status === 'error')
  const filtersChanged = JSON.stringify(filters) !== JSON.stringify(DEFAULT_FILTERS)

  const toggleCity = (c: City) =>
    set('cities', filters.cities.includes(c) ? filters.cities.filter((x) => x !== c) : [...filters.cities, c])

  const prefSummary = [
    prefs.cities.length ? prefs.cities.join(', ') : null,
    prefs.wantsRemote ? 'remote (India)' : null,
    prefs.excludedTitles.length ? `${prefs.excludedTitles.length} excluded title(s)` : null,
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <>
      <section className={`freshness ${freshness.kind === 'stale' ? 'is-stale' : ''}`} aria-label="Feed status">
        {freshness.kind === 'stale' ? (
          <TriangleAlert size={16} aria-hidden="true" className="freshness__warn" />
        ) : (
          <CircleCheck size={16} aria-hidden="true" className="freshness__ok" />
        )}
        <span>
          {freshness.kind === 'none' ? 'No successful scan yet' : `Last successful scan ${relativeTime(freshness.at, now)}`}
          {freshness.kind === 'stale' && ' · the feed may be out of date'}
        </span>
        <span className="mono muted">
          {openCount} open · {healthy}/{feed.sources.length} sources healthy
        </span>
        <details className="freshness__sources">
          <summary>Sources</summary>
          <table>
            <caption className="sr-only">Source health</caption>
            <thead>
              <tr>
                <th scope="col">Company</th>
                <th scope="col">Board</th>
                <th scope="col">Status</th>
                <th scope="col">India eng. roles</th>
                <th scope="col">Last success</th>
              </tr>
            </thead>
            <tbody>
              {feed.sources.map((s) => (
                <tr key={s.key}>
                  <td>{s.company}</td>
                  <td className="mono">
                    {ATS_LABEL[s.ats]}/{s.board}
                  </td>
                  <td className={s.status === 'ok' ? 'ok' : 'err'} title={s.error}>
                    {s.status === 'ok' ? 'OK' : `Failed: ${s.error ?? 'error'}`}
                  </td>
                  <td className="mono">{s.kept}</td>
                  <td className="mono">{s.lastSuccessAt ? relativeTime(s.lastSuccessAt, now) : 'never'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </details>
      </section>

      {failed.length > 0 && (
        <div className="alert alert--warning" role="status">
          <TriangleAlert size={16} aria-hidden="true" />
          <span>
            {failed.length} source{failed.length > 1 ? 's' : ''} failed in the last scan ({failed.map((s) => s.company).join(', ')}).
            Their previously seen jobs are still shown.
          </span>
        </div>
      )}

      <section className="panel filters" aria-label="Filters">
        <div className="filters__row">
          <label className="filters__search">
            <Search size={15} aria-hidden="true" />
            <span className="sr-only">Search jobs</span>
            <input
              className="input"
              type="search"
              placeholder="Search title, company, skills…"
              value={filters.query}
              onChange={(e) => set('query', e.target.value)}
            />
          </label>
          <label className="switch">
            <input
              type="checkbox"
              role="switch"
              checked={filters.useProfile && prefs.active}
              onChange={(e) => set('useProfile', e.target.checked)}
              disabled={!prefs.active}
            />
            Use my profile preferences
          </label>
        </div>
        <p className="field__hint">
          {prefs.active ? (
            <>
              Profile filter: {prefSummary || 'work modes'}. Jobs that don't state a work mode are kept.{' '}
              <Link to="/profile?section=location">Edit preferences</Link>
            </>
          ) : (
            <>
              Add preferred locations in your <Link to="/profile?section=location">profile</Link> to filter automatically.
            </>
          )}
        </p>

        <div className="filters__row filters__chips" role="group" aria-label="City">
          {CITY_ORDER.map((c) => (
            <label key={c} className="choice">
              <input type="checkbox" checked={filters.cities.includes(c)} onChange={() => toggleCity(c)} />
              <span>{c}</span>
            </label>
          ))}
          <label className="choice">
            <input type="checkbox" checked={filters.remoteIndiaOnly} onChange={(e) => set('remoteIndiaOnly', e.target.checked)} />
            <span>Remote (India)</span>
          </label>
        </div>

        <div className="filters__row filters__selects">
          <SelectFilter
            label="Work mode"
            value={filters.workModes[0] ?? ''}
            onChange={(v) => set('workModes', v ? [v as JobWorkMode] : [])}
            options={[
              ['', 'Any'],
              ['onsite', 'Onsite'],
              ['hybrid', 'Hybrid'],
              ['remote', 'Remote'],
              ['unknown', 'Not stated'],
            ]}
          />
          <SelectFilter
            label="Company"
            value={filters.companies[0] ?? ''}
            onChange={(v) => set('companies', v ? [v] : [])}
            options={[['', `All (${companies.length})`], ...companies.map((c) => [c, c] as [string, string])]}
          />
          <SelectFilter
            label="Posted"
            value={filters.postedWithinDays === null ? '' : String(filters.postedWithinDays)}
            onChange={(v) => set('postedWithinDays', v ? Number(v) : null)}
            options={[
              ['', 'Any time'],
              ['1', 'Last 24 hours'],
              ['7', 'Last 7 days'],
              ['30', 'Last 30 days'],
            ]}
          />
          <SelectFilter
            label="Sort"
            value={sort}
            onChange={(v) => setSort(v as SortKey)}
            options={[
              ['newest', 'Newest first seen'],
              ['posted', 'Most recently posted'],
              ['company', 'Company A–Z'],
            ]}
          />
          <label className="ack filters__closed">
            <input type="checkbox" checked={filters.showClosed} onChange={(e) => set('showClosed', e.target.checked)} />
            <span>Show closed</span>
          </label>
          {filtersChanged && (
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => setFilters(DEFAULT_FILTERS)}>
              <RotateCcw size={14} aria-hidden="true" /> Reset
            </button>
          )}
        </div>
      </section>

      <p className="mono muted" role="status" aria-live="polite" data-testid="result-count">
        Showing {Math.min(limit, results.length)} of {results.length} matching · {openCount} open in feed
      </p>

      {results.length === 0 ? (
        <section className="panel">
          <div className="empty">
            <h2 className="empty__title">No jobs match these filters</h2>
            <p className="empty__text">Try clearing a filter or turning off profile preferences.</p>
          </div>
        </section>
      ) : (
        <div className="job-list">
          {results.slice(0, limit).map((j) => (
            <JobCard key={j.id} job={j} now={now} isNew={newIds.has(j.id)} />
          ))}
        </div>
      )}
      {results.length > limit && (
        <button type="button" className="btn btn--secondary jobs__more" onClick={() => setLimit((l) => l + PAGE)}>
          Show {Math.min(PAGE, results.length - limit)} more
        </button>
      )}
    </>
  )
}

function SelectFilter({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  options: Array<[string, string]>
}) {
  return (
    <label className="filters__select">
      <span className="field__label">{label}</span>
      <select className="select" value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
    </label>
  )
}
