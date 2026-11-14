import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { PageHeader } from '../../components/layout/PageHeader'
import { AsyncView } from '../../components/ui/AsyncView'
import { ModeBadge } from '../../components/ui/ModeBadge'
import { formatStamp } from '../../prototype/clock'
import { jobById, STATUS_LABEL } from '../../prototype/selectors'
import { interventionFor } from '../../prototype/store'
import { usePrototype, useSimulatedQuery } from '../../prototype/usePrototype'
import { APP_STATUSES, type Application, type AppStatus } from '../../prototype/types'

function Detail({ app }: { app: Application }) {
  const { state, dispatch } = usePrototype()
  const job = jobById(state, app.jobId)
  const intervention = interventionFor(state, app.id)
  return (
    <div className="stack">
      <div>
        <h2>{job?.company}, {job?.title}</h2>
        <div className="row">
          <ModeBadge mode={app.mode} />
          <span className="badge">{STATUS_LABEL[app.status]}</span>
        </div>
      </div>
      <div className="row">
        {app.status === 'awaiting-approval' && (
          <>
            <button type="button" className="btn btn--primary" onClick={() => dispatch({ type: 'app/approve', id: app.id })}>Approve</button>
            <button type="button" className="btn btn--secondary" onClick={() => dispatch({ type: 'app/reject', id: app.id })}>Reject</button>
          </>
        )}
        {app.status === 'failed' && (
          <button type="button" className="btn btn--primary" onClick={() => dispatch({ type: 'app/retry', id: app.id })}>Retry</button>
        )}
        {app.status === 'blocked' && intervention && (
          <button type="button" className="btn btn--primary" onClick={() => dispatch({ type: 'event/resolve', id: intervention.id })}>I&apos;ve resolved it</button>
        )}
      </div>
      {app.blocker && <div className="alert alert--danger" role="note"><p>{app.blocker}</p></div>}
      {app.failure && <div className="alert alert--warning" role="note"><p>{app.failure}</p></div>}
      <dl className="kv">
        <dt className="muted">Resume</dt>
        <dd>
          {app.resumeId ? <Link to={`/resumes/${app.resumeId}`}>Resume version v{app.resumeVersion}</Link> : 'Not tailored yet'}
        </dd>
        <dt className="muted">Match score</dt>
        <dd>{app.score ?? 'Not scored'}</dd>
      </dl>
      <section aria-labelledby="verify-title" className="panel panel__body">
        <h3 id="verify-title">Verification</h3>
        {app.verification ? (
          <dl className="kv">
            <dt className="muted">Method</dt>
            <dd>{app.verification.method}</dd>
            <dt className="muted">Evidence</dt>
            <dd>{app.verification.evidence}</dd>
            <dt className="muted">Verified at</dt>
            <dd>{formatStamp(app.verification.at)}</dd>
          </dl>
        ) : (
          <p className="secondary">
            Not verified. {app.notVerifiedReason ?? 'Nothing has been submitted yet.'}
          </p>
        )}
      </section>
      <section aria-labelledby="history-title">
        <h3 id="history-title">History</h3>
        <ol className="timeline" aria-label="Application history">
          {[...app.history].reverse().map((h, i) => (
            <li key={i} className="timeline__item">
              <p><strong>{STATUS_LABEL[h.status]}</strong>: {h.note}</p>
              <p className="list__meta">{formatStamp(h.at)}</p>
            </li>
          ))}
        </ol>
      </section>
    </div>
  )
}

export function ApplicationsPage() {
  const { appId } = useParams()
  const [filter, setFilter] = useState<AppStatus | 'all'>('all')
  const q = useSimulatedQuery((s) => ({ apps: s.applications, jobs: s.jobs }), (d) => d.apps.length === 0)
  const { apps, jobs } = q.data
  const selected = appId ? apps.find((a) => a.id === appId) : undefined
  const company = (a: Application) => jobs.find((j) => j.id === a.jobId)

  return (
    <div className="stack">
      <PageHeader title="Applications" subtitle="Everything the agent has queued, sent or stopped on." />
      <AsyncView
        status={q.status}
        onRetry={q.retry}
        emptyTitle="No applications yet"
        emptyText="Applications appear here once the agent queues them or you queue one from Discovery."
        emptyAction={<Link className="btn btn--secondary" to="/jobs">Open Discovery</Link>}
      >
        <div className="stack">
          <div className="field">
            <label className="field__label" htmlFor="status-filter">Status</label>
            <select id="status-filter" className="input" value={filter} onChange={(e) => setFilter(e.target.value as AppStatus | 'all')}>
              <option value="all">All statuses</option>
              {APP_STATUSES.map((s) => (
                <option key={s} value={s}>{STATUS_LABEL[s]}</option>
              ))}
            </select>
          </div>
          <div className={selected ? 'split split--detail-only' : 'split split--list-only'}>
            <div className="split__list stack">
              {APP_STATUSES.filter((s) => filter === 'all' || filter === s).map((status) => {
                const group = apps.filter((a) => a.status === status)
                if (group.length === 0) return null
                return (
                  <section key={status} aria-labelledby={`group-${status}`} className="stack">
                    <h2 id={`group-${status}`} className="eyebrow">{STATUS_LABEL[status]} ({group.length})</h2>
                    {group.map((a) => (
                      <Link key={a.id} className="select-row stack" to={`/applications/${a.id}`} aria-current={a.id === appId ? 'true' : undefined}>
                        <span className="list__title">{company(a)?.company}, {company(a)?.title}</span>
                        <span><ModeBadge mode={a.mode} /></span>
                      </Link>
                    ))}
                  </section>
                )
              })}
            </div>
            <div className="split__detail">
              {selected ? (
                <>
                  <Link className="btn btn--ghost btn--sm" to="/applications">Back to list</Link>
                  <Detail app={selected} />
                </>
              ) : (
                <p className="secondary">Select an application to see its history.</p>
              )}
            </div>
          </div>
        </div>
      </AsyncView>
    </div>
  )
}
