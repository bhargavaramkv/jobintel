import { CheckCheck, Inbox, Sparkles } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useNow } from '../../components/layout/useNow'
import { planApply } from '../../domain/ai/apply'
import { countByStatus, isPending, sortInbox, STATUS_LABEL, withStatus } from '../../domain/ai/lifecycle'
import type { ReviewStatus, StoredRecommendation } from '../../domain/ai/schema'
import { useAiRecommendations } from './aiContext'
import { RecommendationCard } from './RecommendationCard'
import { useJobLookup } from './useJobLookup'
import { useContacts } from '../referrals/useContacts'
import { useAcceptRecommendations } from './useAcceptRecommendations'

type Filter = 'pending' | ReviewStatus | 'all'
const FILTERS: Array<[Filter, string]> = [
  ['pending', 'To review'],
  ['accepted', 'Accepted'],
  ['rejected', 'Rejected'],
  ['all', 'All'],
]

export function InboxPanel() {
  const { recommendations, save, status } = useAiRecommendations()
  const acceptRecs = useAcceptRecommendations()
  const { contacts } = useContacts()
  const [bulk, setBulk] = useState<string | null>(null)
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
      const [outcome] = await acceptRecs([rec])
      if (!outcome.ok) throw new Error(outcome.reason)
    })

  // Everything still pending whose change can be applied right now (re-checked one by one when accepted).
  const ready = all.filter((r) => isPending(r.status) && planApply(r, { actions, jobs, contacts, now }).ok)
  const acceptAll = async () => {
    setBulk('working')
    const outcomes = await acceptRecs(ready)
    const failed = outcomes.filter((o) => !o.ok).length
    setBulk(failed ? `Accepted ${outcomes.length - failed}; ${failed} could not be applied and stay in the list.` : `Accepted ${outcomes.length}.`)
  }

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
          {ready.length > 1 && (
            <div className="ai-bulk">
              <button type="button" className="btn btn--primary btn--sm" onClick={() => void acceptAll()} disabled={bulk === 'working'}>
                <CheckCheck size={14} aria-hidden="true" /> Accept all ready ({ready.length})
              </button>
              <span className="field__hint" role="status">
                {bulk && bulk !== 'working' ? bulk : 'Each one is re-checked against your records as it is applied.'}
              </span>
            </div>
          )}
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
                    plan={planApply(rec, { actions, jobs, contacts, now })}
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
