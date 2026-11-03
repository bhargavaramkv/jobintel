import { CircleAlert, CircleCheck, Eye, Loader2, Radar, RefreshCw, RotateCcw, Search, Sparkles, TriangleAlert } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useNow } from '../../components/layout/useNow'
import { CITY_ORDER } from '../../domain/jobs/cities'
import { stageOf, type JobAction } from '../../domain/jobs/actions'
import { assessJob, describeLearning, hasSignals, targetLevels } from '../../domain/jobs/feedback'
import { ATS_LABEL, type City, type Job, type JobFeed, type JobWorkMode } from '../../domain/jobs/feedSchema'
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
import { isStalePosting, matchJob, matchRank, similarPostings } from '../../domain/match/score'
import { nextScheduledScan } from '../../domain/jobs/schedule'
import { useProfile } from '../profile/useProfile'
import { JobCard } from './JobCard'
import { useJobActions } from './useJobActions'
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

type View = 'review' | 'shortlist' | 'applied' | 'rejected' | 'all'
type SortChoice = SortKey | 'recommended' | 'match'

function FeedView({ feed, now }: { feed: JobFeed; now: Date }) {
  const { profile } = useProfile()
  const { actions, learned, unhideCompany } = useJobActions()
  const prefs = useMemo(() => preferencesFromProfile(profile), [profile])
  const targets = useMemo(() => targetLevels(profile?.targetSeniority ?? []), [profile])
  const [filters, setFilters] = useState<JobFilters>(DEFAULT_FILTERS)
  const [view, setView] = useState<View>('review')
  const [sortChoice, setSortChoice] = useState<SortChoice | null>(null)
  const [showHidden, setShowHidden] = useState(false)
  const [limit, setLimit] = useState(PAGE)
  // Default to fit once the profile has skills, else the learned ranking once there is something to learn from.
  const canMatch = !!profile && profile.primarySkills.length + profile.secondarySkills.length > 0
  const sort: SortChoice = sortChoice ?? (canMatch ? 'match' : hasSignals(learned, targets) ? 'recommended' : 'newest')

  const set = <K extends keyof JobFilters>(key: K, value: JobFilters[K]) => {
    setFilters((f) => ({ ...f, [key]: value }))
    setLimit(PAGE)
  }

  const cityOptions = useMemo(
    () =>
      feed.cityScope?.length
        ? CITY_ORDER.filter((c) => feed.cityScope!.includes(c))
        : CITY_ORDER.filter((c) => feed.jobs.some((j) => j.cities.includes(c))),
    [feed],
  )
  const hasRemoteIndia = useMemo(() => feed.jobs.some((j) => j.remoteIndia), [feed])
  const companies = useMemo(() => [...new Set(feed.jobs.map((j) => j.company))].sort((a, b) => a.localeCompare(b)), [feed])
  const jobsById = useMemo(() => new Map(feed.jobs.map((j) => [j.id, j])), [feed])
  const newIds = useMemo(() => new Set(newJobs(feed.jobs, NEW_WINDOW_DAYS, now).map((j) => j.id)), [feed, now])

  const filtered = useMemo(() => applyFilters(feed.jobs, filters, prefs, now), [feed, filters, prefs, now])
  const assessed = useMemo(() => new Map(filtered.map((j) => [j.id, assessJob(j, learned, targets)])), [filtered, learned, targets])
  const matches = useMemo(() => new Map(filtered.map((j) => [j.id, matchJob(j, profile, targets)])), [filtered, profile, targets])
  const similar = useMemo(() => similarPostings(feed.jobs), [feed])

  const counts = useMemo(() => {
    let applied = 0
    let rejected = 0
    let shortlist = 0
    for (const a of actions.values()) {
      if (a.decision === 'applied') applied++
      else if (a.decision === 'rejected') rejected++
      else if (stageOf(a)) shortlist++
    }
    const undecided = (j: Job) => !actions.get(j.id)?.decision && !stageOf(actions.get(j.id))
    const hiddenCount = filtered.filter((j) => undecided(j) && assessed.get(j.id)?.hidden).length
    const review = filtered.filter((j) => undecided(j) && !assessed.get(j.id)?.hidden).length
    return { applied, rejected, shortlist, review, hiddenCount }
  }, [actions, filtered, assessed])

  type Item = { key: string; job?: Job; record?: JobAction }
  const items: Item[] = useMemo(() => {
    if (view === 'applied' || view === 'rejected' || view === 'shortlist') {
      const q = filters.query.trim().toLowerCase()
      return [...actions.values()]
        .filter((a) => (view === 'shortlist' ? !a.decision && !!stageOf(a) : a.decision === view))
        .filter((a) => !q || `${a.snapshot.title} ${a.snapshot.company} ${a.note}`.toLowerCase().includes(q))
        .sort((a, b) => (b.appliedOn ?? b.updatedAt).localeCompare(a.appliedOn ?? a.updatedAt))
        .map((a) => ({ key: a.jobId, job: jobsById.get(a.jobId), record: a }))
    }
    const pool = filtered.filter((j) => {
      if (view === 'all') return true
      const a = actions.get(j.id)
      if (a?.decision || stageOf(a)) return false
      return showHidden || !assessed.get(j.id)?.hidden
    })
    const learnedScore = (j: Job) => assessed.get(j.id)?.score ?? 0
    const ordered =
      sort === 'recommended'
        ? sortJobs(pool, 'newest').sort((a, b) => learnedScore(b) - learnedScore(a))
        : sort === 'match'
          ? sortJobs(pool, 'newest').sort(
              (a, b) => matchRank(matches.get(b.id)!) - matchRank(matches.get(a.id)!) || learnedScore(b) - learnedScore(a),
            )
          : sortJobs(pool, sort)
    return ordered.map((j) => ({ key: j.id, job: j, record: actions.get(j.id) }))
  }, [view, actions, filtered, assessed, matches, showHidden, sort, filters.query, jobsById])

  const openCount = feed.jobs.filter((j) => j.status === 'open').length
  const freshness = feedFreshness(feed.lastSuccessfulScanAt, now)
  const healthy = feed.sources.filter((s) => s.status === 'ok').length
  const failed = feed.sources.filter((s) => s.status === 'error')
  const filtersChanged = JSON.stringify(filters) !== JSON.stringify(DEFAULT_FILTERS)
  const learnedLines = describeLearning(learned)
  const decidedView = view === 'applied' || view === 'rejected' || view === 'shortlist'

  const toggleCity = (c: City) =>
    set('cities', filters.cities.includes(c) ? filters.cities.filter((x) => x !== c) : [...filters.cities, c])

  const prefSummary = [
    prefs.cities.length ? prefs.cities.join(', ') : null,
    prefs.wantsRemote ? 'remote (India)' : null,
    prefs.excludedTitles.length ? `${prefs.excludedTitles.length} excluded title(s)` : null,
  ]
    .filter(Boolean)
    .join(' · ')

  const TABS: Array<[View, string, number | null]> = [
    ['review', 'To review', counts.review],
    ['shortlist', 'Shortlisted', counts.shortlist],
    ['applied', 'Applied', counts.applied],
    ['rejected', 'Not interested', counts.rejected],
    ['all', 'All', null],
  ]

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
          {openCount} open · {healthy}/{feed.sources.length} sources healthy · next scan around{' '}
          {nextScheduledScan(now).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
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
                <th scope="col">Roles kept</th>
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
          {feed.recentScans && feed.recentScans.length > 0 && (
            <table>
              <caption className="field__hint">Recent scans (newest first). Failed runs keep the last good feed and are reported in GitHub.</caption>
              <thead>
                <tr>
                  <th scope="col">When</th>
                  <th scope="col">Sources OK</th>
                  <th scope="col">Failed</th>
                  <th scope="col">Open</th>
                  <th scope="col">New</th>
                  <th scope="col">Closed</th>
                </tr>
              </thead>
              <tbody>
                {feed.recentScans.map((r) => (
                  <tr key={r.at}>
                    <td className="mono">{relativeTime(r.at, now)}</td>
                    <td className="mono">{r.sourcesOk}</td>
                    <td className={r.sourcesFailed ? 'err mono' : 'mono'}>{r.sourcesFailed}</td>
                    <td className="mono">{r.open}</td>
                    <td className="mono">{r.added}</td>
                    <td className="mono">{r.closed}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
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

      {learned.decisions > 0 && (
        <details className="panel learned">
          <summary>
            <Sparkles size={15} aria-hidden="true" /> Learned from your {learned.decisions} decision{learned.decisions > 1 ? 's' : ''}
            <span className="mono muted">
              {' '}
              · {learned.applied} applied · {learned.rejected} not interested
            </span>
          </summary>
          <div className="learned__body">
            {learnedLines.length ? (
              <ul>
                {learnedLines.map((l) => (
                  <li key={l}>{l}</li>
                ))}
              </ul>
            ) : (
              <p className="secondary">Nothing to adjust yet. Reasons on "Not interested" and more applications sharpen the ranking.</p>
            )}
            {learned.hiddenCompanies.length > 0 && (
              <div className="learned__hidden">
                {learned.hiddenCompanies.map((c) => (
                  <button key={c} type="button" className="btn btn--ghost btn--sm" onClick={() => void unhideCompany(c)}>
                    <Eye size={13} aria-hidden="true" /> Show {c} again
                  </button>
                ))}
              </div>
            )}
            <p className="field__hint">
              This ranking runs in your browser on every new scan. Your decisions are never sent to GitHub or included in the
              public feed.
            </p>
          </div>
        </details>
      )}

      <div className="tabs" role="tablist" aria-label="Job lists">
        {TABS.map(([v, label, n]) => (
          <button
            key={v}
            type="button"
            role="tab"
            aria-selected={view === v}
            className={view === v ? 'tab is-active' : 'tab'}
            onClick={() => {
              setView(v)
              setLimit(PAGE)
            }}
          >
            {label}
            {n !== null && <span className="tab__count mono">{n}</span>}
          </button>
        ))}
      </div>

      <section className="panel filters" aria-label="Filters">
        <div className="filters__row">
          <label className="filters__search">
            <Search size={15} aria-hidden="true" />
            <span className="sr-only">Search jobs</span>
            <input
              className="input"
              type="search"
              placeholder={decidedView ? 'Search title, company or your notes…' : 'Search title, company, skills…'}
              value={filters.query}
              onChange={(e) => set('query', e.target.value)}
            />
          </label>
          {!decidedView && (
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
          )}
        </div>
        {!decidedView && (
          <>
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
              {cityOptions.map((c) => (
                <label key={c} className="choice">
                  <input type="checkbox" checked={filters.cities.includes(c)} onChange={() => toggleCity(c)} />
                  <span>{c}</span>
                </label>
              ))}
              {hasRemoteIndia && (
                <label className="choice">
                  <input type="checkbox" checked={filters.remoteIndiaOnly} onChange={(e) => set('remoteIndiaOnly', e.target.checked)} />
                  <span>Remote (India)</span>
                </label>
              )}
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
                onChange={(v) => setSortChoice(v as SortChoice)}
                options={[
                  ['match', canMatch ? 'Best fit for your profile' : 'Best fit (add skills to your profile)'],
                  ['recommended', hasSignals(learned, targets) ? 'Recommended for you' : 'Recommended (mark jobs to train)'],
                  ['newest', 'Newest first seen'],
                  ['posted', 'Most recently posted'],
                  ['company', 'Company A–Z'],
                ]}
              />
              <label className="ack filters__closed">
                <input type="checkbox" checked={filters.showClosed} onChange={(e) => set('showClosed', e.target.checked)} />
                <span>Show closed</span>
              </label>
              {counts.hiddenCount > 0 && view === 'review' && (
                <label className="ack filters__closed">
                  <input type="checkbox" checked={showHidden} onChange={(e) => setShowHidden(e.target.checked)} />
                  <span>Show {counts.hiddenCount} hidden</span>
                </label>
              )}
              {filtersChanged && (
                <button type="button" className="btn btn--ghost btn--sm" onClick={() => setFilters(DEFAULT_FILTERS)}>
                  <RotateCcw size={14} aria-hidden="true" /> Reset
                </button>
              )}
            </div>
          </>
        )}
      </section>

      <p className="mono muted" role="status" aria-live="polite" data-testid="result-count">
        Showing {Math.min(limit, items.length)} of {items.length}
        {decidedView ? '' : ' matching'} · {openCount} open in feed
      </p>

      {items.length === 0 ? (
        <section className="panel">
          <div className="empty">
            <h2 className="empty__title">
              {view === 'shortlist'
                ? 'Nothing shortlisted yet'
                : view === 'applied'
                ? 'No applications marked yet'
                : view === 'rejected'
                  ? 'Nothing marked as not interested'
                  : 'No jobs match these filters'}
            </h2>
            <p className="empty__text">
              {decidedView
                ? 'Use "Shortlist", "Mark applied" or "Not interested" on a job. Your decisions stay in this browser.'
                : 'Try clearing a filter or turning off profile preferences.'}
            </p>
          </div>
        </section>
      ) : (
        <div className="job-list">
          {items.slice(0, limit).map((it) => (
            <JobCard
              key={it.key}
              job={it.job}
              record={it.record}
              now={now}
              isNew={newIds.has(it.key)}
              assessment={sort === 'recommended' || view === 'review' ? assessed.get(it.key) : undefined}
              match={it.job ? (matches.get(it.key) ?? matchJob(it.job, profile, targets)) : undefined}
              similarCount={similar.get(it.key)?.length ?? 0}
              stale={it.job ? isStalePosting(it.job, now) : false}
            />
          ))}
        </div>
      )}
      {items.length > limit && (
        <button type="button" className="btn btn--secondary jobs__more" onClick={() => setLimit((l) => l + PAGE)}>
          Show {Math.min(PAGE, items.length - limit)} more
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
