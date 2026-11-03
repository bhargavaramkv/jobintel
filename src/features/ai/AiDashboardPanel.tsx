import { Sparkles } from 'lucide-react'
import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { countByStatus, latestBriefing } from '../../domain/ai/lifecycle'
import { localDate } from '../../domain/jobs/actions'
import { useAiBriefings, useAiRecommendations } from './aiContext'

/** Dashboard entry point: what the AI inbox and briefing are waiting on. Reads local data only. */
export function AiDashboardPanel({ now }: { now: Date }) {
  const { recommendations } = useAiRecommendations()
  const { briefings } = useAiBriefings()
  const counts = useMemo(() => countByStatus(recommendations.values()), [recommendations])
  const briefing = useMemo(() => latestBriefing(briefings.values()), [briefings])
  const pending = counts.generated + counts.reviewed
  const today = localDate(now)

  return (
    <section className="panel" aria-labelledby="ai-dash-title">
      <div className="panel__header">
        <h2 id="ai-dash-title" className="panel__title">
          AI assistant
        </h2>
        <Sparkles size={16} className="muted" aria-hidden="true" />
      </div>
      <div className="panel__body stack">
        {briefing ? (
          <p>
            <strong>{briefing.headline}</strong>
            <span className="field__hint"> {briefing.date === today ? 'Today’s briefing' : `Briefing from ${briefing.date}`}</span>
          </p>
        ) : (
          <p className="secondary">No AI briefing yet.</p>
        )}
        {pending > 0 ? (
          <p>
            <Link to="/assistant?tab=inbox">
              {pending} recommendation{pending === 1 ? '' : 's'} to review
            </Link>
          </p>
        ) : (
          <p className="secondary">Nothing waiting for review.</p>
        )}
        <Link to={briefing ? '/assistant' : '/assistant?tab=bridge'} className="btn btn--secondary btn--sm">
          {briefing ? 'Open assistant' : 'Prepare your first AI review'}
        </Link>
      </div>
    </section>
  )
}
