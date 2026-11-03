import { ChartLine, Download, Info } from 'lucide-react'
import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useNow } from '../../components/layout/useNow'
import {
  applicationsCsv,
  byCompany,
  funnel,
  outreachStats,
  pct,
  recommendations,
  responseTimes,
  skillGaps,
  SMALL_SAMPLE,
  type Metric,
} from '../../domain/analytics/analytics'
import { localDate } from '../../domain/jobs/actions'
import { targetLevels } from '../../domain/jobs/feedback'
import { useJobActions } from '../jobs/useJobActions'
import { useJobFeed } from '../jobs/jobFeed'
import { useOutreach } from '../outreach/outreachContext'
import { useProfile } from '../profile/useProfile'
import { useContacts } from '../referrals/useContacts'
import './analytics.css'

export function AnalyticsPage({ now: nowOverride }: { now?: Date }) {
  const now = useNow(nowOverride)
  const today = localDate(now)
  const { profile } = useProfile()
  const { actions } = useJobActions()
  const { contacts } = useContacts()
  const { messages } = useOutreach()
  const { state } = useJobFeed()
  const feedJobs = useMemo(() => (state.status === 'ready' ? state.feed.jobs : []), [state])

  const acts = useMemo(() => [...actions.values()], [actions])
  const targets = useMemo(() => targetLevels(profile?.targetSeniority ?? []), [profile])
  const steps = useMemo(() => funnel(acts, feedJobs.filter((j) => j.status === 'open').length), [acts, feedJobs])
  const reach = useMemo(() => outreachStats(acts, [...contacts.values()], [...messages.values()], profile), [acts, contacts, messages, profile])
  const companies = useMemo(() => byCompany(acts), [acts])
  const times = useMemo(() => responseTimes(acts, today), [acts, today])
  const gaps = useMemo(() => skillGaps(feedJobs, acts, profile, targets), [feedJobs, acts, profile, targets])
  const recs = useMemo(() => recommendations({ actions: acts, funnel: steps, outreach: reach, gaps, times, today }), [acts, steps, reach, gaps, times, today])

  // Resolve ids to readable names so every number can be traced to records.
  const titleOf = useMemo(() => {
    const jobs = new Map(feedJobs.map((j) => [j.id, `${j.title} · ${j.company}`]))
    return (id: string) => {
      const a = actions.get(id)
      if (a) return `${a.snapshot.title} · ${a.snapshot.company}`
      const c = contacts.get(id)
      if (c) return `${c.name} · ${c.company}`
      const m = messages.get(id)
      if (m) return `${m.sentOn ?? 'draft'} → ${contacts.get(m.contactId)?.name ?? 'removed lead'}`
      return jobs.get(id) ?? id
    }
  }, [actions, contacts, messages, feedJobs])

  const applied = steps.find((s) => s.id === 'applied')!.value
  const empty = acts.length === 0 && messages.size === 0
  const maxStep = Math.max(1, ...steps.slice(1).map((s) => s.value))

  const exportCsv = () => {
    const blob = new Blob([applicationsCsv(acts)], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `jobintel-applications-${today}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="analytics">
      <header className="profile__header">
        <div>
          <p className="eyebrow">Analytics</p>
          <h1 className="profile__title">Your job-search analytics</h1>
          <p className="secondary profile__lede">
            Calculated in this browser from your own records. There are no outside benchmarks. Open any number to see the records
            behind it.
          </p>
        </div>
        <button type="button" className="btn btn--secondary" onClick={exportCsv} disabled={applied === 0 && steps[1].value === 0}>
          <Download size={15} aria-hidden="true" /> Export CSV
        </button>
      </header>

      {empty ? (
        <section className="panel">
          <div className="empty">
            <ChartLine size={36} className="muted" aria-hidden="true" />
            <h2 className="empty__title">No records to analyse yet</h2>
            <p className="empty__text">
              Shortlist and apply in <Link to="/jobs">Job Discovery</Link>, and log outreach. Analytics appear as you record outcomes.
            </p>
          </div>
        </section>
      ) : (
        <>
          {applied < SMALL_SAMPLE && (
            <div className="alert alert--warning" role="status">
              <Info size={16} aria-hidden="true" />
              <span>
                Small sample: {applied} application{applied === 1 ? '' : 's'}. Rates below can change a lot with each new outcome.
              </span>
            </div>
          )}

          <section className="panel" aria-labelledby="funnel-title">
            <div className="panel__header">
              <h2 id="funnel-title" className="panel__title">
                Application funnel
              </h2>
            </div>
            <div className="panel__body">
              <ol className="funnel">
                {steps.map((s, i) => (
                  <li key={s.id} className="funnel__row">
                    <span className="funnel__label">
                      {s.label}
                      {s.hint && <span className="muted"> · {s.hint}</span>}
                    </span>
                    <span className="funnel__track" aria-hidden="true">
                      {i > 0 && (
                        <span className="funnel__bar" style={{ width: `${(s.value / maxStep) * 100}%` }} title={`${s.label}: ${s.value}`} />
                      )}
                    </span>
                    <span className="funnel__value mono">
                      {s.value}
                      {s.conversion !== null && <span className="muted"> · {pct(s.conversion)}</span>}
                    </span>
                    {s.ids.length > 0 && <Records ids={s.ids} titleOf={titleOf} />}
                  </li>
                ))}
              </ol>
              <p className="field__hint">Percentages are the share of the previous step. Jobs marked “Not interested” are excluded.</p>
            </div>
          </section>

          <div className="analytics__grid">
            <section className="panel" aria-labelledby="reach-title">
              <div className="panel__header">
                <h2 id="reach-title" className="panel__title">
                  Referrals & outreach
                </h2>
              </div>
              <div className="panel__body">
                <dl className="stats">
                  {[reach.sent, reach.people, reach.replies, reach.recruiterReplies, reach.referralRequests, reach.referred].map((m) => (
                    <Stat key={m.id} m={m} titleOf={titleOf} />
                  ))}
                </dl>
                <p className="field__hint">
                  Reply rate:{' '}
                  {reach.replyRate === null
                    ? 'nothing sent yet'
                    : `${pct(reach.replyRate)} of people contacted${reach.people.value < SMALL_SAMPLE ? ' (small sample)' : ''}`}
                  . Replies are logged by you.
                </p>
              </div>
            </section>

            <section className="panel" aria-labelledby="time-title">
              <div className="panel__header">
                <h2 id="time-title" className="panel__title">
                  Time to response
                </h2>
              </div>
              <div className="panel__body stack">
                <p>
                  {times.median === null ? (
                    <span className="secondary">No company responses recorded yet.</span>
                  ) : (
                    <>
                      <span className="hero-num mono">{times.median}</span> days median, from {times.samples.length} response
                      {times.samples.length === 1 ? '' : 's'}
                      {times.samples.length < SMALL_SAMPLE ? ' (small sample)' : ''}.
                    </>
                  )}
                </p>
                {times.waiting.length > 0 && (
                  <p className="secondary">
                    Waiting: {times.waiting.length} application{times.waiting.length > 1 ? 's' : ''}, longest {times.waiting[0].days} days.
                  </p>
                )}
                <p className="field__hint">From the applied date to the first interview, offer or rejection in the status history.</p>
              </div>
            </section>
          </div>

          <section className="panel" aria-labelledby="co-title">
            <div className="panel__header">
              <h2 id="co-title" className="panel__title">
                By company
              </h2>
            </div>
            <div className="panel__body">
              {companies.length === 0 ? (
                <p className="secondary">No applications yet.</p>
              ) : (
                <div className="table-scroll">
                  <table className="table">
                    <caption className="sr-only">Applications and responses by company</caption>
                    <thead>
                      <tr>
                        <th scope="col">Company</th>
                        <th scope="col">Applied</th>
                        <th scope="col">Responded</th>
                        <th scope="col">Interviews</th>
                        <th scope="col">Offers</th>
                        <th scope="col">Rejections</th>
                        <th scope="col">Response rate</th>
                      </tr>
                    </thead>
                    <tbody>
                      {companies.map((r) => (
                        <tr key={r.company}>
                          <th scope="row">{r.company}</th>
                          <td className="mono">{r.applied}</td>
                          <td className="mono">{r.responded}</td>
                          <td className="mono">{r.interviews}</td>
                          <td className="mono">{r.offers}</td>
                          <td className="mono">{r.rejections}</td>
                          <td className="mono">
                            {r.responseRate === null ? '–' : pct(r.responseRate)}
                            {r.applied < 3 && <span className="muted"> (n={r.applied})</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>

          <section className="panel" aria-labelledby="gap-title">
            <div className="panel__header">
              <h2 id="gap-title" className="panel__title">
                Repeated skill gaps
              </h2>
            </div>
            <div className="panel__body">
              {gaps.gaps.length === 0 ? (
                <p className="secondary">
                  {gaps.relevant === 0 ? 'Add skills to your profile and shortlist jobs to see gaps.' : 'No required skill is missing across your relevant jobs.'}
                </p>
              ) : (
                <ul className="gaps">
                  {gaps.gaps.slice(0, 10).map((g) => (
                    <li key={g.skill}>
                      <strong>{g.skill}</strong>{' '}
                      <span className="mono muted">
                        required in {g.jobIds.length} of {gaps.relevant} relevant jobs ({pct(g.share)})
                      </span>
                      <Records ids={g.jobIds} titleOf={titleOf} />
                    </li>
                  ))}
                </ul>
              )}
              <p className="field__hint">
                Relevant jobs: your pipeline jobs still in the feed, plus open jobs with at least a partial fit. Skills are matched
                by name; check the postings.
              </p>
            </div>
          </section>

          <section className="panel" aria-labelledby="rec-title">
            <div className="panel__header">
              <h2 id="rec-title" className="panel__title">
                Recommendations
              </h2>
            </div>
            <div className="panel__body">
              {recs.length === 0 ? (
                <p className="secondary">Nothing stands out yet.</p>
              ) : (
                <ul className="recs">
                  {recs.map((r) => (
                    <li key={r.text}>
                      <p>
                        {r.basis === 'correlation' && <span className="badge badge--warning">Correlation</span>} {r.text}
                      </p>
                      <p className="field__hint">Evidence: {r.evidence}</p>
                      {r.ids.length > 0 && <Records ids={r.ids} titleOf={titleOf} />}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        </>
      )}
    </div>
  )
}

function Stat({ m, titleOf }: { m: Metric; titleOf: (id: string) => string }) {
  return (
    <div className="stat">
      <dt>{m.label}</dt>
      <dd className="mono">{m.value}</dd>
      {m.ids.length > 0 && <Records ids={m.ids} titleOf={titleOf} />}
    </div>
  )
}

function Records({ ids, titleOf }: { ids: string[]; titleOf: (id: string) => string }) {
  return (
    <details className="records">
      <summary>
        {ids.length} record{ids.length > 1 ? 's' : ''}
      </summary>
      <ul>
        {ids.slice(0, 50).map((id) => (
          <li key={id}>{titleOf(id)}</li>
        ))}
        {ids.length > 50 && <li className="muted">…and {ids.length - 50} more</li>}
      </ul>
    </details>
  )
}
