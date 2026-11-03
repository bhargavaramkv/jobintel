import { Inbox, Sparkles } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useNow } from '../../components/layout/useNow'
import { planApply } from '../../domain/ai/apply'
import { countByStatus, isPending, sortInbox, STATUS_LABEL, withStatus } from '../../domain/ai/lifecycle'
import type { ReviewStatus, StoredRecommendation } from '../../domain/ai/schema'
import { useAiRecommendations } from './aiContext'
import { RecommendationCard } from './RecommendationCard'
import { useJobLookup } from './useJobLookup'
import { useJobActions } from '../jobs/useJobActions'

type Filter = 'pending' | ReviewStatus | 'all'
const FILTERS: Array<[Filter, string]> = [
  ['pending', 'To review'],
  ['accepted', 'Accepted'],
  ['rejected', 'Rejected'],
  ['all', 'All'],
]

export function InboxPanel() {
  const { recommendations, save, status } = useAiRecommendations()
  const { putAction } = useJobActions()
  const { jobs, actions, labelOf } = useJobLookup()
  const now = useNow()
  const [filter, setFilter] = useState<Filter>('pending')
  const [busyId, setBusyId] = useState<string | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const all = useMemo(() => sortInbox(recommendations.values()), [recommendations])
  const counts = useMemo(() => countByStatus(all), [all])
  const pendingCount = counts.generated + counts.reviewed
  const shown = all.filter((r) => (filter === 'all' ? true : filter === 'pending' ? isPending(r.status) : r.status === filter))

  const run = async (rec: StoredRecommendation, work: () => Promise<void>) => {
    setBusyId(rec.id)
    setErrors(({ [rec.id]: _drop, ...rest }) => rest)
    try {
      await work()
    } catch (err) {
      setErrors((e) => ({ ...e, [rec.id]: err instanceof Error ? err.message : String(err) }))
    } finally {
      setBusyId(null)
    }
  }

  const accept = (rec: StoredRecommendation) =>
    run(rec, async () => {
      const now = new Date()
      // Re-check against the records as they are right now, not as they were at import time.
      const plan = planApply(rec, { actions, jobs, now })
      if (!plan.ok) throw new Error(plan.reason)
      if (plan.next) await putAction(plan.next)
      try {
        await save(withStatus(rec, 'accepted', now, plan.summary))
      } catch {
        throw new Error('The change was applied to your records, but this recommendation’s status could not be saved. Reload before trying again.')
      }
    })

  if (status === 'loading') return <p className="secondary" role="status">Loading your inbox…</p>
  if (status === 'error') return <div className="alert alert--danger">The recommendation inbox could not be read from this browser.</div>

  return (
    <section aria-labelledby="inbox-title" className="stack">
      <div className="ai-section-head">
        <div>
          <h2 id="inbox-title" className="panel__title">
            Recommendation inbox
          </h2>
          <p className="panel__subtitle">
            Nothing here has changed your records. Accepting one applies only the change shown on its card.
          </p>
        </div>
        <ul className="ai-counts" aria-label="Recommendations by status">
          {(['generated', 'reviewed', 'accepted', 'rejected'] as const).map((s) => (
            <li key={s}>
              <span className={`badge ai-status ai-status--${s}`}>
                <span className="dot" aria-hidden="true" /> {STATUS_LABEL[s]} <strong className="mono">{counts[s]}</strong>
              </span>
            </li>
          ))}
        </ul>
      </div>

      {all.length === 0 ? (
        <div className="empty">
          <Inbox size={22} aria-hidden="true" />
          <h3 className="empty__title">No recommendations yet</h3>
          <p className="empty__text">
            Prepare a context file, give it to Claude, then import the answer. Recommendations land here for you to review.
          </p>
          <Link to="/assistant?tab=bridge" className="btn btn--secondary">
            <Sparkles size={15} aria-hidden="true" /> Prepare context
          </Link>
        </div>
      ) : (
        <>
          <div className="tabs" role="tablist" aria-label="Recommendation filter">
            {FILTERS.map(([f, label]) => (
              <button
                key={f}
                type="button"
                role="tab"
                aria-selected={filter === f}
                className={filter === f ? 'tab is-active' : 'tab'}
                onClick={() => setFilter(f)}
              >
                {label}
                <span className="tab__count mono">{f === 'all' ? all.length : f === 'pending' ? pendingCount : counts[f]}</span>
              </button>
            ))}
          </div>
          {shown.length === 0 ? (
            <p className="secondary">{filter === 'pending' ? 'Nothing left to review. Nice.' : 'Nothing in this list.'}</p>
          ) : (
            <ul className="ai-list">
              {shown.map((rec) => (
                <li key={rec.id}>
                  <RecommendationCard
                    rec={rec}
                    plan={planApply(rec, { actions, jobs, now })}
                    jobLabel={labelOf(rec.jobId)}
                    busy={busyId === rec.id}
                    error={errors[rec.id]}
                    onReview={() => void run(rec, () => save(withStatus(rec, 'reviewed', new Date())))}
                    onAccept={() => void accept(rec)}
                    onReject={() => void run(rec, () => save(withStatus(rec, 'rejected', new Date())))}
                    onReopen={() => void run(rec, () => save(withStatus(rec, 'reviewed', new Date())))}
                  />
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  )
}
