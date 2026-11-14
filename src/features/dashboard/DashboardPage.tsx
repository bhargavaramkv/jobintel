import { Link } from 'react-router-dom'
import { useApp } from '../../app/appContext'
import { useJobFeed } from '../../app/feed'
import { PageHeader } from '../../components/layout/PageHeader'
import { AsyncView } from '../../components/ui/AsyncView'
import { ScoreMeter } from '../../components/ui/ScoreMeter'
import { relativeTime } from '../../domain/jobs/filters'
import { calculateReadiness } from '../../domain/profile/readiness'
import { effectiveMinScore, useScoredJobs } from '../discovery/useScoredJobs'

const TOP = 5
const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString(undefined, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })

export function DashboardPage() {
  const { profile, prefs, tracked } = useApp()
  const feed = useJobFeed()
  const scored = useScoredJobs()
  const readiness = calculateReadiness(profile)
  const hasProfile = readiness.score > 0
  const min = effectiveMinScore(scored, prefs.minScore)
  const matching = scored.filter((i) => i.match.score !== null && i.match.score >= min)
  const top = [...matching].sort((a, b) => b.match.score! - a.match.score!).slice(0, TOP)
  const ready = feed.status === 'ready'
  const scan = feed.feed?.lastSuccessfulScanAt
  const missing = readiness.rules.filter((r) => !r.complete)

  const kpis: Array<[string, string]> = [
    ['Open jobs', ready ? String(scored.length) : '-'],
    ['Last scan', ready ? (scan ? relativeTime(scan) : 'Unknown') : '-'],
    [`Matching (score ${min}+)`, ready && hasProfile ? String(matching.length) : '-'],
    ['Tracked applications', String(tracked.length)],
  ]

  return (
    <div className="stack">
      <PageHeader title="Dashboard" subtitle="Your profile, the job feed and the jobs you track." />
      {!hasProfile && (
        <div className="callout">
          <div>
            <strong>Set up your profile to get started</strong>
            <p className="secondary">Add your roles, skills and locations so jobs can be matched to you.</p>
          </div>
          <Link className="btn btn--primary" to="/onboarding">
            Start setup
          </Link>
        </div>
      )}
      <section className="kpis" aria-label="Key numbers">
        {kpis.map(([label, value]) => (
          <div key={label} className="kpi">
            <span className="kpi__value">{value}</span>
            <span className="kpi__label">{label}</span>
          </div>
        ))}
      </section>
      {ready && scan && <p className="muted mono">Feed last scanned {formatDateTime(scan)}</p>}
      <div className="grid-2">
        <section className="panel" aria-labelledby="top-title">
          <div className="panel__header">
            <h2 id="top-title" className="panel__title">Top matches</h2>
            <Link to="/jobs">All jobs</Link>
          </div>
          <div className="panel__body">
            <AsyncView status={feed.status} onRetry={feed.retry} errorText={feed.error} emptyTitle="No jobs">
              {!hasProfile ? (
                <p className="secondary">Complete Setup to see your best matches.</p>
              ) : top.length === 0 ? (
                <p className="secondary">No jobs score {min} or higher yet. Lower the minimum in Settings.</p>
              ) : (
                <ul className="list">
                  {top.map(({ job, match }) => (
                    <li key={job.id} className="list__item">
                      <div className="list__main">
                        <Link className="list__title" to={`/jobs/${encodeURIComponent(job.id)}`}>
                          {job.title}
                        </Link>
                        <p className="list__meta">{job.company}, {job.cities.join(', ') || 'Other location'}</p>
                      </div>
                      <ScoreMeter score={match.score} />
                    </li>
                  ))}
                </ul>
              )}
            </AsyncView>
          </div>
        </section>
        <section className="panel" aria-labelledby="ready-title">
          <div className="panel__header">
            <h2 id="ready-title" className="panel__title">Profile readiness</h2>
            <Link to="/onboarding">Open Setup</Link>
          </div>
          <div className="panel__body stack">
            <div className="row">
              <div className="progress" style={{ flex: 1 }} role="progressbar" aria-label="Profile readiness" aria-valuemin={0} aria-valuemax={100} aria-valuenow={readiness.score}>
                <div className="progress__bar" style={{ width: `${readiness.score}%` }} />
              </div>
              <span className="mono muted">{readiness.score}%</span>
            </div>
            {missing.length === 0 ? (
              <p className="secondary">Your profile is complete.</p>
            ) : (
              <>
                <p className="secondary">Still missing:</p>
                <ul>
                  {missing.map((r) => (
                    <li key={r.id}>{r.label}</li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
