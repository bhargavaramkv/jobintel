import { ExternalLink } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { Link, useLocation, useParams, useSearchParams } from 'react-router-dom'
import { useApp } from '../../app/appContext'
import { useJobFeed } from '../../app/feed'
import { PageHeader } from '../../components/layout/PageHeader'
import { AsyncView } from '../../components/ui/AsyncView'
import { ModeBadge } from '../../components/ui/ModeBadge'
import { ScoreMeter } from '../../components/ui/ScoreMeter'
import { BAND_LABEL } from '../../domain/match/score'
import { CITY_FILTERS, MODE_FILTERS, queryFromParams, searchJobs, type ScoredJob } from './search'
import { effectiveMinScore, useScoredJobs } from './useScoredJobs'

const MIN_CHOICES = [0, 40, 50, 60, 70, 80, 90]
const FILTER_KEYS = ['q', 'city', 'mode', 'min', 'sort'] as const
const cap = (s: string) => s[0].toUpperCase() + s.slice(1)
const formatDate = (iso: string) => new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
const jobPath = (id: string) => `/jobs/${encodeURIComponent(id)}`
const isWebUrl = (url: string) => /^https?:\/\//i.test(url)

function Detail({ item }: { item: ScoredJob }) {
  const { tracked, trackJob, notify } = useApp()
  const { job, match } = item
  const isTracked = tracked.some((t) => t.jobId === job.id)
  const skills = match.factors.find((f) => f.id === 'skills')
  const missing = [...match.gaps.mandatory, ...match.gaps.preferred.map((s) => `${s} (preferred)`)]
  return (
    <div className="stack">
      <div>
        <h2>{job.title}</h2>
        <p className="secondary">
          {job.company}, {job.locations.join(' / ') || job.cities.join(' / ')}
        </p>
        <p className="muted mono">{job.postedAt ? `Posted ${formatDate(job.postedAt)}` : `First seen ${formatDate(job.firstSeenAt)}`}</p>
      </div>
      <div className="row">
        <ModeBadge mode={job.workMode} />
        <ScoreMeter score={match.score} />
        <span className="muted">{BAND_LABEL[match.band]}</span>
      </div>
      <div className="row">
        {isTracked ? (
          <Link className="btn btn--secondary btn--sm" to="/applications">Tracked: view in Applications</Link>
        ) : (
          <button
            type="button"
            className="btn btn--primary btn--sm"
            onClick={() => {
              trackJob(job)
              notify(`Added ${job.title} to Applications`)
            }}
          >
            Track
          </button>
        )}
        {isWebUrl(job.url) && (
          <a className="btn btn--secondary btn--sm" href={job.url} target="_blank" rel="noopener noreferrer">
            <ExternalLink size={13} aria-hidden="true" />
            Open posting
          </a>
        )}
      </div>
      {match.notes.length > 0 && (
        <div className="alert alert--warning" role="note">
          <ul>
            {match.notes.map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>
        </div>
      )}
      <section aria-labelledby="factors-title">
        <h3 id="factors-title">Match breakdown</h3>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Factor</th>
                <th>Weight</th>
                <th>Fit</th>
                <th>Why</th>
              </tr>
            </thead>
            <tbody>
              {match.factors.map((f) => (
                <tr key={f.id}>
                  <td>{f.label}</td>
                  <td>{f.weight}</td>
                  <td>{f.value === null ? 'No data' : `${Math.round(f.value * 100)}%`}</td>
                  <td>{f.summary}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <section aria-labelledby="skills-title" className="stack">
        <h3 id="skills-title">Skills</h3>
        {skills && skills.matched.length + missing.length > 0 ? (
          <>
            <div>
              <p className="eyebrow">Matched skills</p>
              <span className="chip-row">
                {skills.matched.length === 0 && <span className="muted">None</span>}
                {skills.matched.map((s) => (
                  <span key={s} className="skill-chip skill-chip--have">{s}</span>
                ))}
              </span>
            </div>
            <div>
              <p className="eyebrow">Missing skills</p>
              <span className="chip-row">
                {missing.length === 0 && <span className="muted">None</span>}
                {missing.map((s) => (
                  <span key={s} className="skill-chip skill-chip--miss">{s}</span>
                ))}
              </span>
            </div>
          </>
        ) : (
          <p className="secondary">{skills?.summary ?? 'No skills to compare.'}</p>
        )}
      </section>
      <section aria-labelledby="desc-title">
        <h3 id="desc-title">Description</h3>
        <p className="secondary" style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{job.description}</p>
      </section>
      {job.requirements.length > 0 && (
        <section aria-labelledby="req-title">
          <h3 id="req-title">Requirements</h3>
          <ul>
            {job.requirements.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}

function Filters({ minValue }: { minValue: number }) {
  const [params, setParams] = useSearchParams()
  const query = queryFromParams(params, minValue)
  // The search box is uncontrolled and edits go onto the latest params, because URL updates land a render late
  // and a controlled box would snap back (and quick changes would drop each other).
  const latest = useRef(params)
  const searchRef = useRef<HTMLInputElement>(null)
  useEffect(() => {
    latest.current = params
    // Follow external changes (Clear filters, Back) unless the user is typing in the box.
    const box = searchRef.current
    if (box && document.activeElement !== box && box.value !== query.q) box.value = query.q
  }, [params, query.q])
  const change = (key: (typeof FILTER_KEYS)[number], value: string) => {
    const next = new URLSearchParams(latest.current)
    if (value) next.set(key, value)
    else next.delete(key)
    latest.current = next
    setParams(next, { replace: true })
  }
  const hasFilters = FILTER_KEYS.some((k) => params.has(k))
  const choices = MIN_CHOICES.includes(query.min) ? MIN_CHOICES : [...MIN_CHOICES, query.min].sort((a, b) => a - b)
  return (
    <form className="filters" role="search" aria-label="Job filters" onSubmit={(e) => e.preventDefault()}>
      <div className="field filters__search">
        <label className="field__label" htmlFor="job-search">Search</label>
        <input
          id="job-search"
          className="input"
          type="search"
          placeholder="Title, company or description"
          ref={searchRef}
          defaultValue={query.q}
          onChange={(e) => change('q', e.target.value)}
        />
      </div>
      <div className="field">
        <label className="field__label" htmlFor="job-city">City</label>
        <select id="job-city" className="input" value={query.city} onChange={(e) => change('city', e.target.value)}>
          <option value="">All cities</option>
          {CITY_FILTERS.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>
      <div className="field">
        <label className="field__label" htmlFor="job-mode">Work mode</label>
        <select id="job-mode" className="input" value={query.mode} onChange={(e) => change('mode', e.target.value)}>
          <option value="">Any mode</option>
          {MODE_FILTERS.map((m) => (
            <option key={m} value={m}>{cap(m)}</option>
          ))}
        </select>
      </div>
      <div className="field">
        <label className="field__label" htmlFor="job-min">Minimum match score</label>
        <select id="job-min" className="input" value={query.min} onChange={(e) => change('min', e.target.value)}>
          {choices.map((n) => (
            <option key={n} value={n}>{n === 0 ? 'Any score' : `${n}+`}</option>
          ))}
        </select>
      </div>
      <div className="field">
        <label className="field__label" htmlFor="job-sort">Sort by</label>
        <select id="job-sort" className="input" value={query.sort} onChange={(e) => change('sort', e.target.value)}>
          <option value="match">Best match</option>
          <option value="newest">Newest</option>
        </select>
      </div>
      <button type="button" className="btn btn--ghost btn--sm filters__clear" disabled={!hasFilters} onClick={() => setParams({}, { replace: true })}>
        Clear filters
      </button>
    </form>
  )
}

export function DiscoveryPage() {
  const { jobId } = useParams()
  const [params, setParams] = useSearchParams()
  const { search } = useLocation()
  const { prefs, profile } = useApp()
  const feed = useJobFeed()
  const all = useScoredJobs()
  const minValue = effectiveMinScore(all, prefs.minScore)
  const query = queryFromParams(params, minValue)
  const results = searchJobs(all, query)
  const selected = jobId ? all.find((i) => i.job.id === jobId) : undefined
  const status = feed.status === 'ready' && all.length === 0 ? 'empty' : feed.status
  const minFromPrefs = !params.has('min') && query.min > 0

  return (
    <div className="stack">
      <PageHeader title="Jobs" subtitle="Open jobs from the public feed, scored against your profile." />
      <AsyncView
        status={status}
        onRetry={feed.retry}
        errorText={feed.error}
        emptyTitle="The feed has no open jobs"
        emptyText="The job feed was loaded but lists no open jobs right now."
      >
        <div className="stack">
          {!profile && (
            <div className="callout">
              <p className="secondary">Match scores appear once your profile has skills, roles and locations.</p>
              <Link className="btn btn--primary btn--sm" to="/onboarding">Go to Setup</Link>
            </div>
          )}
          <Filters minValue={minValue} />
          <p className="muted mono" role="status">
            {results.length} of {all.length} jobs
          </p>
          <div className={jobId ? 'split split--detail-only' : 'split split--list-only'}>
            <div className="split__list stack">
              {results.length === 0 && (
                <div className="empty">
                  <p className="empty__title">No jobs match these filters</p>
                  {minFromPrefs && <p className="empty__text">Your minimum match score is {query.min}. Lower it above or in Settings.</p>}
                  <button type="button" className="btn btn--secondary btn--sm" onClick={() => setParams({}, { replace: true })}>
                    Clear filters
                  </button>
                </div>
              )}
              <ul className="plain-list stack">
                {results.map(({ job, match }) => {
                  const chips = (match.factors.find((f) => f.id === 'skills')?.matched ?? []).slice(0, 4)
                  return (
                    <li key={job.id}>
                      <Link className="select-row stack" to={{ pathname: jobPath(job.id), search }} aria-current={job.id === jobId ? 'true' : undefined}>
                        <span className="list__title">{job.company}, {job.title}</span>
                        <span className="row">
                          <span className="list__meta">{job.cities.join(', ') || 'Other location'}</span>
                          <ModeBadge mode={job.workMode} />
                        </span>
                        <ScoreMeter score={match.score} />
                        {chips.length > 0 && (
                          <span className="chip-row">
                            {chips.map((c) => (
                              <span key={c} className="skill-chip skill-chip--have">{c}</span>
                            ))}
                          </span>
                        )}
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </div>
            <div className="split__detail">
              {selected ? (
                <>
                  <Link className="btn btn--ghost btn--sm" to={{ pathname: '/jobs', search }}>Back to list</Link>
                  <Detail item={selected} />
                </>
              ) : jobId ? (
                <div className="stack">
                  <Link className="btn btn--ghost btn--sm" to={{ pathname: '/jobs', search }}>Back to list</Link>
                  <p className="secondary">This job is not in the current feed. It may have been closed.</p>
                </div>
              ) : (
                <p className="secondary">Select a job to see its description and how it matches you.</p>
              )}
            </div>
          </div>
        </div>
      </AsyncView>
    </div>
  )
}
