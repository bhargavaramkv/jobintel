import { ArrowDown, ArrowUp, Bookmark, BookmarkCheck, Check, ChevronDown, ExternalLink, MapPin, NotebookPen, RotateCcw, ThumbsDown } from 'lucide-react'
import { useId, useState } from 'react'
import { Dialog } from '../../components/ui/Dialog'
import {
  localDate,
  NOTE_MAX,
  REJECT_REASONS,
  refOf,
  STAGE_LABEL,
  stageOf,
  type JobAction,
  type JobRef,
  type RejectReason,
} from '../../domain/jobs/actions'
import type { Assessment } from '../../domain/jobs/feedback'
import { ATS_LABEL, type Job } from '../../domain/jobs/feedSchema'
import { relativeTime } from '../../domain/jobs/filters'
import type { MatchResult } from '../../domain/match/score'
import { MatchBreakdown, MatchPill } from './MatchBreakdown'
import { useJobActions } from './useJobActions'

const WORK_MODE_LABEL = { onsite: 'Onsite', hybrid: 'Hybrid', remote: 'Remote', unknown: 'Work mode not stated' } as const
const REASON_LABEL = Object.fromEntries(REJECT_REASONS.map((r) => [r.id, r.label])) as Record<RejectReason, string>

interface JobCardProps {
  /** Live job from the feed. Absent when showing a stored record whose job has left the feed. */
  job?: Job
  record?: JobAction
  now: Date
  isNew?: boolean
  assessment?: Assessment
  match?: MatchResult
  /** Other open postings at the same company with the same title. */
  similarCount?: number
  /** Posted long ago according to the source. */
  stale?: boolean
}

function formatDay(isoDate: string) {
  const [y, m, d] = isoDate.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
}

export function JobCard({ job, record, now, isNew = false, assessment, match, similarCount = 0, stale = false }: JobCardProps) {
  const { markApplied, markRejected, clearDecision, setNote, setAppliedOn, setStage, removeStage } = useJobActions()
  const [open, setOpen] = useState(false)
  const [noteOpen, setNoteOpen] = useState(false)
  const [rejectOpen, setRejectOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [announce, setAnnounce] = useState('')
  const id = useId()

  const ref: JobRef = job ? refOf(job) : { jobId: record!.jobId, snapshot: record!.snapshot }
  const s = ref.snapshot
  const decision = record?.decision
  const stage = stageOf(record)
  const preApplied = !decision && !!stage
  const gone = !job
  const cities = job?.cities ?? s.cities
  const where = [...cities.filter((c) => c !== 'Other India'), ...(job?.remoteIndia ? ['Remote (India)'] : [])]
  const locationText = where.length ? where.join(' · ') : s.locations.join(' · ')

  const run = async (fn: () => Promise<void>, message: string) => {
    setBusy(true)
    setError(null)
    try {
      await fn()
      setAnnounce(message)
    } catch (err) {
      setError(`Could not save: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setBusy(false)
    }
  }

  const className = ['job', job?.status === 'closed' || gone ? 'is-closed' : '', decision ? `is-${decision}` : '']
    .filter(Boolean)
    .join(' ')

  return (
    <article className={className} aria-labelledby={`${id}-title`}>
      <div className="job__main">
        <div className="job__head">
          <h3 id={`${id}-title`} className="job__title">
            <a href={s.url} target="_blank" rel="noopener noreferrer">
              {s.title}
              <ExternalLink size={13} aria-hidden="true" />
              <span className="sr-only"> (opens the original posting in a new tab)</span>
            </a>
          </h3>
          <div className="job__badges">
            {match && job?.status === 'open' && !decision && <MatchPill match={match} />}
            {isNew && !decision && job?.status === 'open' && <span className="badge badge--accent">New</span>}
            {preApplied && (
              <span className="badge badge--accent">
                <BookmarkCheck size={11} aria-hidden="true" /> {STAGE_LABEL[stage!]}
              </span>
            )}
            {decision === 'applied' && stage && stage !== 'applied' && <span className="badge">{STAGE_LABEL[stage]}</span>}
            {stale && job?.status === 'open' && (
              <span className="badge badge--warning" title="The source says this was posted over two months ago. It may already be filled.">
                Posted long ago
              </span>
            )}
            {decision === 'applied' && (
              <span className="badge badge--success">
                <Check size={11} aria-hidden="true" /> Applied{record?.appliedOn ? ` · ${formatDay(record.appliedOn)}` : ''}
              </span>
            )}
            {decision === 'rejected' && <span className="badge">Not interested</span>}
            {job?.status === 'closed' && <span className="badge">Closed</span>}
            {gone && <span className="badge">No longer listed</span>}
          </div>
        </div>
        <p className="job__company">{s.company}</p>
        <p className="job__meta">
          <span title={s.locations.join(' / ')}>
            <MapPin size={13} aria-hidden="true" /> {locationText}
          </span>
          {job && <span>{WORK_MODE_LABEL[job.workMode]}</span>}
          {s.department && <span>{s.department}</span>}
        </p>
        {job && (
          <p className="job__source mono">
            {ATS_LABEL[job.ats]} · {job.postedAt ? `posted ${relativeTime(job.postedAt, now)}` : 'post date not stated'} · first
            seen {relativeTime(job.firstSeenAt, now)} · verified {relativeTime(job.lastVerifiedAt, now)}
            {job.closedAt && ` · closed ${relativeTime(job.closedAt, now)}`}
          </p>
        )}
        {similarCount > 0 && job?.status === 'open' && (
          <p className="job__similar mono muted">
            {similarCount} similar posting{similarCount > 1 ? 's' : ''} at {s.company} (other locations or teams)
          </p>
        )}
        {decision === 'rejected' && record!.rejectReasons.length > 0 && (
          <p className="job__reasons">{record!.rejectReasons.map((r) => REASON_LABEL[r]).join(' · ')}</p>
        )}
        {!decision && assessment && assessment.reasons.length > 0 && (
          <ul className="job__why" aria-label="Why this job is ranked here">
            {assessment.reasons.slice(0, 2).map((r) => (
              <li key={r.text} className={`why why--${r.tone}`}>
                {r.tone === 'up' ? <ArrowUp size={11} aria-hidden="true" /> : <ArrowDown size={11} aria-hidden="true" />}
                {r.text}
              </li>
            ))}
          </ul>
        )}
        {record?.note && !noteOpen && (
          <p className="job__note">
            <NotebookPen size={12} aria-hidden="true" /> {record.note}
          </p>
        )}
      </div>

      {job && (
        <button
          type="button"
          className="btn btn--ghost btn--sm job__toggle"
          aria-expanded={open}
          aria-controls={`${id}-details`}
          onClick={() => setOpen((o) => !o)}
        >
          {open ? 'Hide details' : 'Details'}
          <ChevronDown size={14} aria-hidden="true" className={open ? 'rot' : undefined} />
        </button>
      )}

      <div className="job__actions" role="group" aria-label={`Actions for ${s.title}`}>
        {!decision && (
          <>
            {preApplied ? (
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                disabled={busy}
                aria-pressed="true"
                onClick={() => run(() => removeStage(ref.jobId), `Removed ${s.title} from your shortlist`)}
              >
                <BookmarkCheck size={14} aria-hidden="true" /> {stage === 'shortlisted' ? 'Shortlisted' : STAGE_LABEL[stage!]}
              </button>
            ) : (
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                disabled={busy}
                aria-pressed="false"
                onClick={() => run(() => setStage(ref, 'shortlisted'), `Shortlisted ${s.title}`)}
              >
                <Bookmark size={14} aria-hidden="true" /> Shortlist
              </button>
            )}
            <button
              type="button"
              className="btn btn--secondary btn--sm"
              disabled={busy}
              onClick={() => run(() => markApplied(ref), `Marked ${s.title} as applied`)}
            >
              <Check size={14} aria-hidden="true" /> Mark applied
            </button>
            <button type="button" className="btn btn--ghost btn--sm" disabled={busy} onClick={() => setRejectOpen(true)}>
              <ThumbsDown size={14} aria-hidden="true" /> Not interested
            </button>
          </>
        )}
        {decision && (
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            disabled={busy}
            onClick={() => run(() => clearDecision(ref.jobId), `Cleared decision for ${s.title}`)}
          >
            <RotateCcw size={14} aria-hidden="true" /> Undo {decision === 'applied' ? 'applied' : 'not interested'}
          </button>
        )}
        <button
          type="button"
          className="btn btn--ghost btn--sm"
          aria-expanded={noteOpen}
          aria-controls={`${id}-note`}
          onClick={() => setNoteOpen((o) => !o)}
        >
          <NotebookPen size={14} aria-hidden="true" /> {record?.note ? 'Edit note' : 'Add note'}
        </button>
        <span className="sr-only" aria-live="polite">
          {announce}
        </span>
      </div>

      {error && (
        <p className="field__error job__error" role="alert">
          {error}
        </p>
      )}

      {noteOpen && (
        <NoteEditor
          id={`${id}-note`}
          initial={record?.note ?? ''}
          appliedOn={decision === 'applied' ? record?.appliedOn : undefined}
          onCancel={() => setNoteOpen(false)}
          onSave={async (note, on) =>
            run(async () => {
              await setNote(ref, note)
              if (on && decision === 'applied' && on !== record?.appliedOn) await setAppliedOn(ref.jobId, on)
              setNoteOpen(false)
            }, 'Note saved')
          }
        />
      )}

      {open && job && (
        <div id={`${id}-details`} className="job__details">
          {match && <MatchBreakdown match={match} />}
          {job.requirements.length > 0 && (
            <>
              <h4 className="eyebrow">Requirements as listed</h4>
              <ul>
                {job.requirements.map((r, i) => (
                  <li key={i}>
                    {r}
                    {job.preferred?.includes(r) && <span className="badge job__pref">preferred</span>}
                  </li>
                ))}
              </ul>
            </>
          )}
          <h4 className="eyebrow">Description excerpt</h4>
          <p className="job__desc">{job.description || 'No description provided by the source.'}</p>
          <p className="field__hint">
            Excerpt from the public posting. Read the{' '}
            <a href={job.url} target="_blank" rel="noopener noreferrer">
              original listing
            </a>{' '}
            for full details before applying.
          </p>
        </div>
      )}

      <RejectDialog
        open={rejectOpen}
        title={s.title}
        company={s.company}
        onClose={() => setRejectOpen(false)}
        onConfirm={async (reasons, note) => {
          await run(async () => {
            await markRejected(ref, reasons)
            if (note.trim()) await setNote(ref, note)
          }, `Marked ${s.title} as not interested`)
          setRejectOpen(false)
        }}
      />
    </article>
  )
}

function NoteEditor({
  id,
  initial,
  appliedOn,
  onSave,
  onCancel,
}: {
  id: string
  initial: string
  appliedOn?: string
  onSave: (note: string, appliedOn?: string) => void
  onCancel: () => void
}) {
  const [text, setText] = useState(initial)
  const [on, setOn] = useState(appliedOn ?? '')
  return (
    <div id={id} className="job__noteedit">
      {appliedOn !== undefined && (
        <label className="field job__date">
          <span className="field__label">Applied on</span>
          <input className="input" type="date" value={on} max={localDate()} onChange={(e) => setOn(e.target.value)} />
        </label>
      )}
      <div className="field">
        <label className="field__label" htmlFor={`-text`}>
          Private note
        </label>
        <textarea
          id={`-text`}
          className="textarea"
          rows={3}
          maxLength={NOTE_MAX}
          value={text}
          placeholder="e.g. Applied with resume v3, referred by…, recruiter call on Friday"
          onChange={(e) => setText(e.target.value)}
        />
        <span className="field__hint">Stored only in this browser and included in encrypted backups.</span>
      </div>
      <div className="job__noteactions">
        <button type="button" className="btn btn--ghost btn--sm" onClick={onCancel}>
          Cancel
        </button>
        <button type="button" className="btn btn--primary btn--sm" onClick={() => onSave(text, on || undefined)}>
          Save note
        </button>
      </div>
    </div>
  )
}

function RejectDialog({
  open,
  title,
  company,
  onClose,
  onConfirm,
}: {
  open: boolean
  title: string
  company: string
  onClose: () => void
  onConfirm: (reasons: RejectReason[], note: string) => Promise<void>
}) {
  const [reasons, setReasons] = useState<RejectReason[]>([])
  const [note, setNoteText] = useState('')
  const [busy, setBusy] = useState(false)
  const close = () => {
    setReasons([])
    setNoteText('')
    onClose()
  }
  return (
    <Dialog
      open={open}
      title="Not interested"
      onClose={close}
      busy={busy}
      footer={
        <>
          <button type="button" className="btn btn--ghost" onClick={close} disabled={busy}>
            Cancel
          </button>
          <button
            type="button"
            className="btn btn--primary"
            disabled={busy}
            onClick={async () => {
              setBusy(true)
              try {
                await onConfirm(reasons, note)
                setReasons([])
                setNoteText('')
              } finally {
                setBusy(false)
              }
            }}
          >
            Mark not interested
          </button>
        </>
      }
    >
      <p>
        <strong>{title}</strong> at {company}
      </p>
      <fieldset className="field choices-field">
        <legend className="field__label">Why? (optional, improves future results)</legend>
        <div className="choices">
          {REJECT_REASONS.map((r) => (
            <label key={r.id} className="choice">
              <input
                type="checkbox"
                checked={reasons.includes(r.id)}
                onChange={() => setReasons((xs) => (xs.includes(r.id) ? xs.filter((x) => x !== r.id) : [...xs, r.id]))}
              />
              <span>
                <Check className="choice__check" aria-hidden="true" />
                {r.label}
              </span>
            </label>
          ))}
        </div>
        <span className="field__hint">
          "Not interested in this company" hides all {company} jobs. "Too senior/junior", "Wrong tech stack" and "Not my kind
          of role" push similar jobs down.
        </span>
      </fieldset>
      <label className="field">
        <span className="field__label">Note (optional)</span>
        <textarea className="textarea" rows={2} maxLength={NOTE_MAX} value={note} onChange={(e) => setNoteText(e.target.value)} />
      </label>
    </Dialog>
  )
}
