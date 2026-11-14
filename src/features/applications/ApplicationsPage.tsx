import { Link } from 'react-router-dom'
import { useApp } from '../../app/appContext'
import { MAX_NOTES, TRACK_STATUSES, TRACK_STATUS_LABEL, type TrackedJob, type TrackStatus } from '../../app/appState'
import { PageHeader } from '../../components/layout/PageHeader'

const formatDate = (iso: string) => new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })

function Row({ item }: { item: TrackedJob }) {
  const { setStatus, setNotes, untrack, notify } = useApp()
  const label = `${item.title}, ${item.company}`
  return (
    <li className="panel panel__body stack">
      <div className="row row--between">
        <div>
          <h2 className="panel__title">{item.title}</h2>
          <p className="secondary">{item.company}</p>
          <p className="muted mono">Tracked {formatDate(item.trackedAt)}</p>
        </div>
        <span className="badge">{TRACK_STATUS_LABEL[item.status]}</span>
      </div>
      <div className="field">
        <label className="field__label" htmlFor={`status-${item.jobId}`}>Status for {label}</label>
        <select id={`status-${item.jobId}`} className="input" value={item.status} onChange={(e) => setStatus(item.jobId, e.target.value as TrackStatus)}>
          {TRACK_STATUSES.map((s) => (
            <option key={s} value={s}>{TRACK_STATUS_LABEL[s]}</option>
          ))}
        </select>
      </div>
      <div className="field">
        <label className="field__label" htmlFor={`notes-${item.jobId}`}>Notes for {label}</label>
        <textarea
          id={`notes-${item.jobId}`}
          className="textarea"
          value={item.notes}
          maxLength={MAX_NOTES}
          onChange={(e) => setNotes(item.jobId, e.target.value)}
        />
      </div>
      <div className="row">
        <Link className="btn btn--secondary btn--sm" to={`/jobs/${encodeURIComponent(item.jobId)}`}>View job</Link>
        <button
          type="button"
          className="btn btn--danger btn--sm"
          onClick={() => {
            untrack(item.jobId)
            notify(`Removed ${item.title} from Applications`)
          }}
        >
          Remove
        </button>
      </div>
    </li>
  )
}

export function ApplicationsPage() {
  const { tracked } = useApp()
  return (
    <div className="stack">
      <PageHeader title="Applications" subtitle="Jobs you track. You set each status yourself, nothing is sent for you." />
      {tracked.length === 0 ? (
        <div className="empty">
          <p className="empty__title">No tracked jobs yet</p>
          <p className="empty__text">Open a job and choose Track to keep it here.</p>
          <Link className="btn btn--secondary" to="/jobs">Browse jobs</Link>
        </div>
      ) : (
        <ul className="plain-list stack" aria-label="Tracked jobs">
          {tracked.map((t) => (
            <Row key={t.jobId} item={t} />
          ))}
        </ul>
      )}
    </div>
  )
}
