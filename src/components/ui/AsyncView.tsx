import { AlertCircle, Inbox } from 'lucide-react'
import type { ReactNode } from 'react'

export type ViewStatus = 'loading' | 'error' | 'empty' | 'ready'

interface AsyncViewProps {
  status: ViewStatus
  onRetry: () => void
  emptyTitle: string
  emptyText?: string
  emptyAction?: ReactNode
  /** Shown in the error state, e.g. why the feed could not be loaded. */
  errorText?: string | null
  children: ReactNode
}

/** One place for the four states every screen must handle. */
export function AsyncView({ status, onRetry, emptyTitle, emptyText, emptyAction, errorText, children }: AsyncViewProps) {
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
          <p>{errorText ?? 'Could not load this view.'}</p>
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
