import { Pause, Play, Square } from 'lucide-react'
import { Link } from 'react-router-dom'
import { PageHeader } from '../../components/layout/PageHeader'
import { AsyncView } from '../../components/ui/AsyncView'
import { ModeBadge } from '../../components/ui/ModeBadge'
import { formatStamp, formatTime } from '../../prototype/clock'
import { RUN_SCRIPT } from '../../prototype/data'
import { interventionFor } from '../../prototype/store'
import { jobById, needsAttention, submittedToday } from '../../prototype/selectors'
import { useSimulatedQuery, usePrototype } from '../../prototype/usePrototype'
import type { Application } from '../../prototype/types'

const RUN_TEXT = { idle: 'Agent idle', running: 'Agent running', paused: 'Agent paused' } as const

function Hero() {
  const { state, dispatch } = usePrototype()
  const { run } = state
  const current = run.status === 'idle' ? null : RUN_SCRIPT[Math.min(run.step, run.total - 1)]
  const pct = Math.round((run.step / run.total) * 100)
  const done = run.status === 'idle' && run.step >= run.total
  const stepText = current
    ? `${current.title}: step ${Math.min(run.step + 1, run.total)} of ${run.total}`
    : done
      ? `Run complete: ${run.total} of ${run.total} steps`
      : 'Ready to start'
  return (
    <section className="hero" aria-label="Agent">
      <div className="hero__top">
        <span className="orb" data-state={run.status} aria-hidden="true" />
        <div className="hero__status">
          <h2 className="hero__title">{RUN_TEXT[run.status]}</h2>
          <p className="secondary">{stepText}</p>
          <p className="muted mono">Last run: {run.lastRunAt ? formatStamp(run.lastRunAt) : 'never'}</p>
        </div>
        <div className="row">
          {run.status === 'idle' && (
            <button type="button" className="btn btn--primary" disabled={!state.onboarded} onClick={() => dispatch({ type: 'agent/start' })}>
              <Play size={14} aria-hidden="true" />
              Start
            </button>
          )}
          {run.status === 'running' && (
            <button type="button" className="btn btn--secondary" onClick={() => dispatch({ type: 'agent/pause' })}>
              <Pause size={14} aria-hidden="true" />
              Pause
            </button>
          )}
          {run.status === 'paused' && (
            <button type="button" className="btn btn--primary" onClick={() => dispatch({ type: 'agent/resume' })}>
              <Play size={14} aria-hidden="true" />
              Resume
            </button>
          )}
          {run.status !== 'idle' && (
            <button type="button" className="btn btn--ghost" onClick={() => dispatch({ type: 'agent/stop' })}>
              <Square size={14} aria-hidden="true" />
              Stop
            </button>
          )}
        </div>
      </div>
      <div className="progress" role="progressbar" aria-label="Run progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}>
        <div className="progress__bar" style={{ width: `${pct}%` }} />
      </div>
      {!state.onboarded && <p className="muted">Finish onboarding to start the agent.</p>}
    </section>
  )
}

function AttentionItem({ app }: { app: Application }) {
  const { state, dispatch } = usePrototype()
  const job = jobById(state, app.jobId)
  const intervention = interventionFor(state, app.id)
  const detail = app.blocker ?? app.failure ?? 'Ready for your review'
  return (
    <li className="list__item">
      <div className="list__main">
        <Link className="list__title" to={`/applications/${app.id}`}>
          {job?.company}, {job?.title}
        </Link>
        <p className="list__meta">{detail}</p>
      </div>
      <ModeBadge mode={app.mode} />
      <div className="row">
        {app.status === 'awaiting-approval' && (
          <>
            <button type="button" className="btn btn--primary btn--sm" onClick={() => dispatch({ type: 'app/approve', id: app.id })}>
              Approve
            </button>
            <button type="button" className="btn btn--secondary btn--sm" onClick={() => dispatch({ type: 'app/reject', id: app.id })}>
              Reject
            </button>
          </>
        )}
        {app.status === 'blocked' && intervention && (
          <button type="button" className="btn btn--secondary btn--sm" onClick={() => dispatch({ type: 'event/resolve', id: intervention.id })}>
            Resolve
          </button>
        )}
        {app.status === 'failed' && (
          <button type="button" className="btn btn--secondary btn--sm" onClick={() => dispatch({ type: 'app/retry', id: app.id })}>
            Retry
          </button>
        )}
      </div>
    </li>
  )
}

export function DashboardPage() {
  const q = useSimulatedQuery((s) => s)
  const s = q.data
  const attention = needsAttention(s)
  const sent = submittedToday(s)
  const limit = s.settings.limits.daily
  const kpis = [
    ['Discovered', s.jobs.length],
    ['Matched', s.jobs.filter((j) => j.agentDecision.verdict === 'selected').length],
    ['Submitted', s.applications.filter((a) => a.status === 'submitted' || a.status === 'verified').length],
    ['Needs attention', attention.length],
  ] as const

  return (
    <div className="stack">
      <PageHeader title="Dashboard" subtitle="What the agent is doing and what needs you." />
      <AsyncView status={q.status} onRetry={q.retry} emptyTitle="Nothing yet">
        <div className="stack">
          {!s.onboarded && (
            <div className="callout">
              <div>
                <strong>Set up your profile to get started</strong>
                <p className="secondary">The agent needs your roles, skills and rules before it can run.</p>
              </div>
              <Link className="btn btn--primary" to="/onboarding">
                Start onboarding
              </Link>
            </div>
          )}
          <Hero />
          <section className="kpis" aria-label="Key indicators">
            {kpis.map(([label, value]) => (
              <div key={label} className="kpi">
                <span className="kpi__value">{value}</span>
                <span className="kpi__label">{label}</span>
              </div>
            ))}
          </section>
          <div className="grid-2">
            <section className="panel" aria-labelledby="attention-title">
              <div className="panel__header">
                <h2 id="attention-title" className="panel__title">Needs attention</h2>
              </div>
              <div className="panel__body">
                {attention.length === 0 ? (
                  <p className="secondary">Nothing needs you right now.</p>
                ) : (
                  <ul className="list">
                    {attention.map((a) => (
                      <AttentionItem key={a.id} app={a} />
                    ))}
                  </ul>
                )}
              </div>
            </section>
            <div className="stack">
              <section className="panel" aria-labelledby="daily-title">
                <div className="panel__header">
                  <h2 id="daily-title" className="panel__title">Today</h2>
                </div>
                <div className="panel__body stack">
                  <p>
                    <strong>{sent}</strong> of {limit} daily applications used
                  </p>
                  <div className="progress" role="progressbar" aria-label="Daily limit used" aria-valuemin={0} aria-valuemax={limit} aria-valuenow={sent}>
                    <div className="progress__bar" style={{ width: `${Math.min(100, (sent / limit) * 100)}%` }} />
                  </div>
                </div>
              </section>
              <section className="panel" aria-labelledby="recent-title">
                <div className="panel__header">
                  <h2 id="recent-title" className="panel__title">Recent activity</h2>
                  <Link to="/activity">View all</Link>
                </div>
                <div className="panel__body">
                  {s.events.length === 0 ? (
                    <p className="secondary">No activity yet.</p>
                  ) : (
                    <ul className="list">
                      {s.events.slice(0, 5).map((e) => (
                        <li key={e.id} className="list__item">
                          <div className="list__main">
                            <p className="list__title">{e.title}</p>
                            {e.detail && <p className="list__meta">{e.detail}</p>}
                          </div>
                          <span className="mono muted">{formatTime(e.at)}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </section>
            </div>
          </div>
        </div>
      </AsyncView>
    </div>
  )
}
