import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { PageHeader } from '../../components/layout/PageHeader'
import { AsyncView } from '../../components/ui/AsyncView'
import { formatStamp } from '../../prototype/clock'
import { usePrototype, useSimulatedQuery } from '../../prototype/usePrototype'
import { EVENT_KINDS, type ActivityEvent } from '../../prototype/types'

const KIND_LABEL: Record<string, string> = {
  scan: 'Scan',
  evaluate: 'Evaluate',
  tailor: 'Tailor',
  apply: 'Apply',
  verify: 'Verify',
  failure: 'Failure',
  system: 'System',
  intervention: 'Needs intervention',
}
const FILTERS = [...EVENT_KINDS, 'intervention'] as const

function EventRow({ event, isNew }: { event: ActivityEvent; isNew: boolean }) {
  const { state, dispatch } = usePrototype()
  const [open, setOpen] = useState(false)
  const pending = event.needsIntervention && !event.resolved
  const app = event.applicationId ? state.applications.find((a) => a.id === event.applicationId) : undefined
  // Only a blocked application can be resolved from here; approvals are decided on the application itself.
  const resolvable = !app || app.status === 'blocked'
  return (
    <li className={isNew ? 'timeline__item timeline__item--new' : 'timeline__item'}>
      <div className="row row--between">
        <p>
          <span className="badge">{KIND_LABEL[event.kind]}</span> <strong>{event.title}</strong>
        </p>
        <span className="mono muted">{formatStamp(event.at)}</span>
      </div>
      {event.detail && <p className="list__meta">{event.detail}</p>}
      <div className="row">
        {event.log && (
          <button type="button" className="btn btn--ghost btn--sm" aria-expanded={open} onClick={() => setOpen(!open)}>
            {open ? 'Hide log' : 'Show log'}
          </button>
        )}
        {pending && resolvable && (
          <button type="button" className="btn btn--secondary btn--sm" onClick={() => dispatch({ type: 'event/resolve', id: event.id })}>
            Resolve
          </button>
        )}
        {pending && !resolvable && app && (
          <Link className="btn btn--secondary btn--sm" to={`/applications/${app.id}`}>
            Review in Applications
          </Link>
        )}
        {event.resolved && <span className="badge badge--success">Resolved</span>}
      </div>
      {open && event.log && <pre className="log">{event.log.join('\n')}</pre>}
    </li>
  )
}

export function ActivityPage() {
  const [params, setParams] = useSearchParams()
  const q = useSimulatedQuery((s) => s.events, (e) => e.length === 0)
  const events = q.data
  const [initial] = useState(() => new Set(events.map((e) => e.id)))
  const requested = params.get('kind')
  const kind = (FILTERS as readonly string[]).includes(requested ?? '') ? requested! : 'all'

  const shown = events.filter((e) => (kind === 'all' ? true : kind === 'intervention' ? e.needsIntervention : e.kind === kind))
  const count = (k: string) => events.filter((e) => e.kind === k).length
  const counters = [
    ['Evaluated', count('evaluate')],
    ['Resumes generated', count('tailor')],
    ['Apply events', count('apply')],
    ['Failures', count('failure')],
  ] as const

  return (
    <div className="stack">
      <PageHeader title="Activity" subtitle="A live log of what the agent did." />
      <AsyncView status={q.status} onRetry={q.retry} emptyTitle="No activity yet" emptyText="Start the agent from the Dashboard and events will appear here.">
        <div className="stack">
          <section className="kpis" aria-label="Counters">
            {counters.map(([label, value]) => (
              <div key={label} className="kpi">
                <span className="kpi__value">{value}</span>
                <span className="kpi__label">{label}</span>
              </div>
            ))}
          </section>
          <div className="chip-row" role="group" aria-label="Filter by kind">
            {['all', ...FILTERS].map((k) => (
              <button key={k} type="button" className="chip" aria-pressed={kind === k} onClick={() => setParams(k === 'all' ? {} : { kind: k })}>
                {k === 'all' ? 'All' : KIND_LABEL[k]}
              </button>
            ))}
          </div>
          {shown.length === 0 ? (
            <p className="secondary">No events match this filter.</p>
          ) : (
            <ol className="timeline" aria-label="Activity timeline">
              {shown.map((e) => (
                <EventRow key={e.id} event={e} isNew={!initial.has(e.id)} />
              ))}
            </ol>
          )}
        </div>
      </AsyncView>
    </div>
  )
}
