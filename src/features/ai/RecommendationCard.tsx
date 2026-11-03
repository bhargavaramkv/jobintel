import { Check, Eye, RotateCcw, TriangleAlert, X } from 'lucide-react'
import type { ApplyPlan } from '../../domain/ai/apply'
import { STATUS_HINT, STATUS_LABEL } from '../../domain/ai/lifecycle'
import { RECOMMENDATION_KINDS, type StoredRecommendation } from '../../domain/ai/schema'
import { confidencePct, confidenceWord, describeAction, SOURCE_LABEL } from './labels'

interface Props {
  rec: StoredRecommendation
  /** What accepting would do right now, re-checked against live records. */
  plan: ApplyPlan
  jobLabel: string | null
  busy: boolean
  error?: string
  onReview: () => void
  onAccept: () => void
  onReject: () => void
  onReopen: () => void
}

const KIND_LABEL = Object.fromEntries(RECOMMENDATION_KINDS.map((k) => [k.id, k.label]))

export function RecommendationCard({ rec, plan, jobLabel, busy, error, onReview, onAccept, onReject, onReopen }: Props) {
  const titleId = `rec-${rec.id}`
  const pending = rec.status === 'generated' || rec.status === 'reviewed'
  const changes = rec.action.type !== 'none'
  const acceptLabel = changes ? 'Accept and apply' : 'Accept'

  return (
    <article className={`panel ai-rec ai-rec--${rec.status}`} aria-labelledby={titleId} id={titleId}>
      <div className="panel__body ai-rec__body">
        <header className="ai-rec__head">
          <div className="ai-rec__badges">
            <span className={`badge ai-status ai-status--${rec.status}`} title={STATUS_HINT[rec.status]}>
              <span className="dot" aria-hidden="true" /> {STATUS_LABEL[rec.status]}
            </span>
            <span className="badge">{KIND_LABEL[rec.kind]}</span>
            <span className={`badge ai-priority ai-priority--${rec.priority}`}>{rec.priority} priority</span>
            <span className="badge" title="The model's own estimate of how likely this is to be right">
              {confidencePct(rec.confidence)} confident ({confidenceWord(rec.confidence)})
            </span>
          </div>
          <h3 id={`${titleId}-title`} className="ai-rec__title">
            {rec.title}
          </h3>
          {jobLabel ? (
            <p className="ai-rec__job secondary">{jobLabel}</p>
          ) : rec.jobId ? (
            <p className="ai-rec__job secondary">
              <span className="mono">{rec.jobId}</span> · not found in the current feed or your records
            </p>
          ) : null}
        </header>

        <p>{rec.summary}</p>

        <details className="ai-rec__evidence">
          <summary>
            Evidence ({rec.evidence.length}){rec.caveats.length > 0 ? ` · ${rec.caveats.length} caveat${rec.caveats.length === 1 ? '' : 's'}` : ''}
          </summary>
          <ul className="ai-evidence">
            {rec.evidence.map((e, i) => (
              <li key={i}>
                <span className={`badge ${e.source === 'external' ? 'badge--warning' : ''}`}>{SOURCE_LABEL[e.source]}</span>
                {e.ref && <span className="mono ai-evidence__ref">{e.ref}</span>}
                <span>{e.detail}</span>
              </li>
            ))}
          </ul>
          {rec.caveats.length > 0 && (
            <>
              <h4 className="ai-rec__subhead">Caveats</h4>
              <ul className="ai-caveats">
                {rec.caveats.map((c, i) => (
                  <li key={i}>{c}</li>
                ))}
              </ul>
            </>
          )}
        </details>

        <div className="ai-rec__change">
          <strong>{pending ? 'If you accept:' : 'Proposed change:'}</strong> {describeAction(rec.action)}
        </div>

        {pending && !plan.ok && (
          <div className="alert alert--warning" role="status">
            <TriangleAlert size={16} aria-hidden="true" />
            <span>
              <strong>Can’t be applied now.</strong> {plan.reason} You can still reject it.
            </span>
          </div>
        )}

        {rec.outcome && rec.status === 'accepted' && (
          <p className="ai-rec__outcome" role="status">
            <Check size={14} aria-hidden="true" /> {rec.outcome}
          </p>
        )}

        {error && (
          <p className="field__error" role="alert">
            {error}
          </p>
        )}

        <footer className="ai-rec__foot">
          <p className="field__hint">
            Generated {rec.generatedAt.slice(0, 10)}
            {rec.generator ? ` by ${rec.generator.name}${rec.generator.model ? ` (${rec.generator.model})` : ''}` : ''}
            {rec.decidedAt ? ` · decided ${rec.decidedAt.slice(0, 10)}` : ''}
          </p>
          <div className="ai-rec__actions">
            {rec.status === 'generated' && (
              <button type="button" className="btn btn--ghost btn--sm" onClick={onReview} disabled={busy} aria-label={`Mark reviewed: ${rec.title}`}>
                <Eye size={14} aria-hidden="true" /> Mark reviewed
              </button>
            )}
            {pending && (
              <>
                <button
                  type="button"
                  className="btn btn--primary btn--sm"
                  onClick={onAccept}
                  disabled={busy || !plan.ok}
                  aria-label={`${acceptLabel}: ${rec.title}`}
                >
                  <Check size={14} aria-hidden="true" /> {acceptLabel}
                </button>
                <button type="button" className="btn btn--secondary btn--sm" onClick={onReject} disabled={busy} aria-label={`Reject: ${rec.title}`}>
                  <X size={14} aria-hidden="true" /> Reject
                </button>
              </>
            )}
            {rec.status === 'rejected' && (
              <button type="button" className="btn btn--ghost btn--sm" onClick={onReopen} disabled={busy} aria-label={`Reconsider: ${rec.title}`}>
                <RotateCcw size={14} aria-hidden="true" /> Reconsider
              </button>
            )}
          </div>
        </footer>
      </div>
    </article>
  )
}
