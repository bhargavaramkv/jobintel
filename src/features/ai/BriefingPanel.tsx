import { Newspaper, Sparkles } from 'lucide-react'
import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useNow } from '../../components/layout/useNow'
import { latestBriefing, STATUS_LABEL } from '../../domain/ai/lifecycle'
import { storedIdOf } from '../../domain/ai/import'
import { localDate } from '../../domain/jobs/actions'
import { useAiBriefings, useAiRecommendations } from './aiContext'
import { confidencePct, SOURCE_LABEL } from './labels'
import { useJobLookup } from './useJobLookup'

export function BriefingPanel({ now: nowOverride }: { now?: Date }) {
  const now = useNow(nowOverride)
  const today = localDate(now)
  const { briefings, status } = useAiBriefings()
  const { recommendations } = useAiRecommendations()
  const { labelOf } = useJobLookup()
  const briefing = useMemo(() => latestBriefing(briefings.values()), [briefings])

  if (status === 'loading') return <p className="secondary" role="status">Loading your briefing…</p>

  if (!briefing) {
    return (
      <div className="empty">
        <Newspaper size={22} aria-hidden="true" />
        <h2 className="empty__title">No AI briefing yet</h2>
        <p className="empty__text">
          A briefing is a short, ordered list of what to do next to get interviews. Claude writes it from the context file you
          prepare here. Nothing is generated automatically.
        </p>
        <Link to="/assistant?tab=bridge" className="btn btn--secondary">
          <Sparkles size={15} aria-hidden="true" /> Prepare context
        </Link>
      </div>
    )
  }

  const stale = briefing.date < today

  return (
    <section aria-labelledby="briefing-title" className="stack">
      <div className="ai-section-head">
        <div>
          <p className="eyebrow">
            Briefing for {briefing.date}
            {briefing.generator ? ` · ${briefing.generator.name}${briefing.generator.model ? ` (${briefing.generator.model})` : ''}` : ''}
          </p>
          <h2 id="briefing-title" className="ai-briefing__headline">
            {briefing.headline}
          </h2>
        </div>
      </div>

      {stale && (
        <div className="alert alert--warning" role="status">
          <span>
            This briefing is from {briefing.date}, not today. Prepare a fresh context to get an up-to-date one.{' '}
            <Link to="/assistant?tab=bridge">Prepare context</Link>
          </span>
        </div>
      )}

      <p className="ai-briefing__summary">{briefing.summary}</p>

      {briefing.priorities.length > 0 && (
        <section className="panel" aria-labelledby="priorities-title">
          <div className="panel__header">
            <h3 id="priorities-title" className="panel__title">
              Priorities, in order
            </h3>
          </div>
          <ol className="panel__body ai-priorities">
            {briefing.priorities.map((p, i) => {
              const rec = p.recommendationId ? recommendations.get(storedIdOf(briefing.id, p.recommendationId)) : undefined
              const job = labelOf(p.jobId)
              return (
                <li key={i} className="ai-priority-item">
                  <div className="ai-priority-item__head">
                    <strong>{p.title}</strong>
                    <span className="badge">{confidencePct(p.confidence)} confident</span>
                    {rec && (
                      <Link to="/assistant?tab=inbox" className={`badge ai-status ai-status--${rec.status}`}>
                        <span className="dot" aria-hidden="true" /> {STATUS_LABEL[rec.status]} in inbox
                      </Link>
                    )}
                  </div>
                  {job && <p className="secondary">{job}</p>}
                  <p>{p.detail}</p>
                  <details>
                    <summary>Evidence ({p.evidence.length})</summary>
                    <ul className="ai-evidence">
                      {p.evidence.map((e, j) => (
                        <li key={j}>
                          <span className={`badge ${e.source === 'external' ? 'badge--warning' : ''}`}>{SOURCE_LABEL[e.source]}</span>
                          {e.ref && <span className="mono ai-evidence__ref">{e.ref}</span>}
                          <span>{e.detail}</span>
                        </li>
                      ))}
                    </ul>
                  </details>
                </li>
              )
            })}
          </ol>
        </section>
      )}

      {briefing.watchouts.length > 0 && (
        <section className="panel" aria-labelledby="watchouts-title">
          <div className="panel__header">
            <h3 id="watchouts-title" className="panel__title">
              Watch-outs
            </h3>
          </div>
          <ul className="panel__body ai-caveats">
            {briefing.watchouts.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </section>
      )}

      <p className="field__hint">
        AI-written. Imported {briefing.importedAt.slice(0, 10)}. The briefing never changes your records; only recommendations you accept do.
      </p>
    </section>
  )
}
