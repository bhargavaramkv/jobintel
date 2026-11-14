import { AlertCircle, Inbox } from 'lucide-react'
import type { ReactNode } from 'react'
import type { QueryStatus } from '../../prototype/usePrototype'

interface AsyncViewProps {
  status: QueryStatus
  onRetry: () => void
  emptyTitle: string
  emptyText?: string
  emptyAction?: ReactNode
  children: ReactNode
}

/** One place for the four states every screen must handle. */
export function AsyncView({ status, onRetry, emptyTitle, emptyText, emptyAction, children }: AsyncViewProps) {
  if (status === 'loading') {
    return (
      <div className="async-state" role="status" aria-label="Loading">
        <span className="skeleton" style={{ width: '60%' }} />
        <span className="skeleton" style={{ width: '90%' }} />
        <span className="skeleton" style={{ width: '75%' }} />
      </div>
    )
  }
  if (status === 'error') {
    return (
      <div className="alert alert--danger" role="alert">
        <AlertCircle size={16} aria-hidden="true" />
        <div>
          <p>Could not load this view (simulated error).</p>
          <button type="button" className="btn btn--secondary btn--sm" onClick={onRetry}>
            Retry
          </button>
        </div>
      </div>
    )
  }
  if (status === 'empty') {
    return (
      <div className="empty">
        <Inbox size={22} aria-hidden="true" />
        <p className="empty__title">{emptyTitle}</p>
        {emptyText && <p className="empty__text">{emptyText}</p>}
        {emptyAction}
      </div>
    )
  }
  return <>{children}</>
}
