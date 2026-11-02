import { Briefcase, CalendarClock, ChevronDown, ExternalLink, History, Plus, Trash2, X } from 'lucide-react'
import { useMemo, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Dialog } from '../../components/ui/Dialog'
import { TextField } from '../../components/ui/Field'
import {
  applicationsOf,
  daysBetween,
  dueApplicationFollowUps,
  findDuplicate,
  groupByStage,
  manualRef,
  upcomingInterviews,
} from '../../domain/applications/pipeline'
import {
  INTERVIEW_KINDS,
  isActiveStage,
  localDate,
  NOTE_MAX,
  SHORT_MAX,
  STAGE_LABEL,
  STAGES,
  stageOf,
  type ApplicationDetails,
  type Interview,
  type JobAction,
  type Stage,
} from '../../domain/jobs/actions'
import { useJobActions } from '../jobs/useJobActions'
import { useContacts } from '../referrals/useContacts'
import './applications.css'

const today = () => localDate()
const newId = () => globalThis.crypto?.randomUUID?.() ?? `i-${Math.random().toString(36).slice(2, 10)}`

export function ApplicationsPage() {
  const { actions } = useJobActions()
  const [adding, setAdding] = useState(false)
  const [showClosed, setShowClosed] = useState(false)
  const apps = useMemo(() => applicationsOf(actions.values()), [actions])
  const groups = useMemo(() => groupByStage(apps), [apps])
  const day = today()
  const due = useMemo(() => dueApplicationFollowUps(actions.values(), day), [actions, day])
  const interviews = useMemo(() => upcomingInterviews(actions.values(), day).slice(0, 5), [actions, day])
  const active = apps.filter((a) => isActiveStage(stageOf(a))).length

  return (
    <div className="applications">
      <header className="profile__header">
        <div>
          <p className="eyebrow">Applications</p>
          <h1 className="profile__title">Application tracker</h1>
          <p className="secondary profile__lede">
            Every job you’re pursuing, from shortlist to offer, with its full status history. Stored only in this browser.
          </p>
        </div>
        <button type="button" className="btn btn--primary" onClick={() => setAdding(true)}>
          <Plus size={15} aria-hidden="true" /> Add application
        </button>
      </header>

      <section aria-label="Pipeline summary" className="pipe">
        {STAGES.map((s) => {
          const n = groups.find((g) => g.stage === s.id)!.items.length
          return (
            <a key={s.id} href={`#stage-${s.id}`} className={`pipe__step ${n ? '' : 'is-empty'}`} onClick={(e) => {
              e.preventDefault()
              document.getElementById(`stage-${s.id}`)?.scrollIntoView?.({ behavior: 'smooth' })
            }}>
              <span className="pipe__n mono">{n}</span>
              <span className="pipe__label">{s.label}</span>
            </a>
          )
        })}
      </section>

      {(due.length > 0 || interviews.length > 0) && (
        <section className="panel" aria-labelledby="attention-title">
          <div className="panel__header">
            <h2 id="attention-title" className="panel__title">
              <CalendarClock size={15} aria-hidden="true" /> Needs attention
            </h2>
          </div>
          <ul className="panel__body attention">
            {due.map((f) => (
              <li key={`f-${f.jobId}`}>
                <span className="badge badge--warning">Follow-up {f.dueOn < day ? `overdue ${daysBetween(f.dueOn, day)}d` : 'today'}</span> {f.what} ·{' '}
                <strong>{f.title}</strong> at {f.company}
              </li>
            ))}
            {interviews.map(({ a, i }) => (
              <li key={`i-${i.id}`}>
                <span className="badge badge--accent">Interview {i.on === day ? 'today' : i.on}</span> {i.kind} · <strong>{a.snapshot.title}</strong> at{' '}
                {a.snapshot.company}
              </li>
            ))}
          </ul>
        </section>
      )}

      {apps.length === 0 ? (
        <section className="panel">
          <div className="empty">
            <Briefcase size={36} className="muted" aria-hidden="true" />
            <h2 className="empty__title">No applications yet</h2>
            <p className="empty__text">
              Shortlist or mark jobs applied in <Link to="/jobs">Job Discovery</Link>, or add an application for a job found elsewhere.
            </p>
          </div>
        </section>
      ) : (
        <>
          <label className="ack">
            <input type="checkbox" checked={showClosed} onChange={(e) => setShowClosed(e.target.checked)} />
            <span>Show closed (offers, rejections, withdrawn)</span>
          </label>
          <p className="mono muted">{active} active</p>
          {groups
            .filter((g) => g.items.length > 0 && (showClosed || isActiveStage(g.stage)))
            .map((g) => (
              <section key={g.stage} id={`stage-${g.stage}`} aria-labelledby={`h-${g.stage}`} className="stage">
                <h2 id={`h-${g.stage}`} className="stage__title">
                  {g.label} <span className="mono muted">{g.items.length}</span>
                </h2>
                <ul className="apps">
                  {g.items.map((a) => (
                    <li key={a.jobId}>
                      <ApplicationCard app={a} />
                    </li>
                  ))}
                </ul>
              </section>
            ))}
        </>
      )}

      {adding && <AddApplicationDialog onClose={() => setAdding(false)} />}
    </div>
  )
}

function ApplicationCard({ app }: { app: JobAction }) {
  const { setStage, updateDetails, removeStage } = useJobActions()
  const { contacts } = useContacts()
  const [open, setOpen] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const stage = stageOf(app)!
  const ref = { jobId: app.jobId, snapshot: app.snapshot }
  const s = app.snapshot
  const linked = (app.contactIds ?? []).map((id) => contacts.get(id)).filter((c) => !!c)
  const day = today()

  const run = async (fn: () => Promise<void>) => {
    setError(null)
    try {
      await fn()
    } catch (err) {
      setError(`Could not save: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  return (
    <article className="app" aria-labelledby={`app-${app.jobId}`}>
      <div className="app__head">
        <h3 id={`app-${app.jobId}`} className="job__title">
          <a href={s.url} target="_blank" rel="noopener noreferrer">
            {s.title} <ExternalLink size={12} aria-hidden="true" />
          </a>
        </h3>
        <label className="filters__select">
          <span className="sr-only">Stage for {s.title}</span>
          <select className="select select--sm" value={stage} onChange={(e) => void run(() => setStage(ref, e.target.value as Stage))}>
            {STAGES.map((x) => (
              <option key={x.id} value={x.id}>
                {x.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <p className="job__company">
        {s.company}
        {s.ats === 'manual' && <span className="badge app__manual">added by you</span>}
      </p>
      <p className="app__facts mono muted">
        {app.appliedOn && <span>applied {app.appliedOn}</span>}
        {app.resumeVersion && <span>resume: {app.resumeVersion}</span>}
        {linked.length > 0 && <span>referral: {linked.map((c) => c.name).join(', ')}</span>}
        {(app.interviews?.length ?? 0) > 0 && <span>{app.interviews!.length} interview{app.interviews!.length > 1 ? 's' : ''}</span>}
      </p>
      {app.nextAction || app.followUpOn ? (
        <p className={`app__next ${app.followUpOn && app.followUpOn <= day ? 'is-due' : ''}`}>
          Next: {app.nextAction ?? 'Follow up'}
          {app.followUpOn && ` · by ${app.followUpOn}`}
        </p>
      ) : null}
      {app.note && <p className="job__note">{app.note}</p>}

      <div className="app__actions">
        <button type="button" className="btn btn--ghost btn--sm" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
          Edit details <ChevronDown size={13} aria-hidden="true" className={open ? 'rot' : undefined} />
        </button>
        <button type="button" className="btn btn--ghost btn--sm" aria-expanded={historyOpen} onClick={() => setHistoryOpen((o) => !o)}>
          <History size={13} aria-hidden="true" /> History ({app.history?.length ?? 0})
        </button>
        <button
          type="button"
          className="btn btn--ghost btn--sm"
          onClick={() => {
            if (window.confirm(`Remove ${s.title} from your applications? Its note is kept.`)) void run(() => removeStage(app.jobId))
          }}
        >
          <Trash2 size={13} aria-hidden="true" /> Remove
        </button>
      </div>
      {error && (
        <p className="field__error" role="alert">
          {error}
        </p>
      )}

      {historyOpen && (
        <ol className="timeline" aria-label={`Status history for ${s.title}`}>
          {(app.history ?? []).length === 0 && <li className="secondary">Applied before status history was recorded.</li>}
          {(app.history ?? []).map((h, i) => (
            <li key={i}>
              <span className="mono">{h.at.slice(0, 10)}</span> {STAGE_LABEL[h.stage]}
              {h.note && <span className="secondary"> · {h.note}</span>}
            </li>
          ))}
        </ol>
      )}

      {open && (
        <DetailsEditor
          app={app}
          companyContacts={[...contacts.values()].filter((c) => c.company.toLowerCase() === s.company.toLowerCase())}
          onCancel={() => setOpen(false)}
          onSave={async (d) => {
            await run(() => updateDetails(app.jobId, d))
            setOpen(false)
          }}
        />
      )}
    </article>
  )
}

function DetailsEditor({
  app,
  companyContacts,
  onSave,
  onCancel,
}: {
  app: JobAction
  companyContacts: Array<{ id: string; name: string; role?: string }>
  onSave: (d: ApplicationDetails) => Promise<void>
  onCancel: () => void
}) {
  const [nextAction, setNextAction] = useState(app.nextAction ?? '')
  const [followUpOn, setFollowUpOn] = useState(app.followUpOn ?? '')
  const [resumeVersion, setResumeVersion] = useState(app.resumeVersion ?? '')
  const [feedback, setFeedback] = useState(app.feedback ?? '')
  const [contactIds, setContactIds] = useState<string[]>(app.contactIds ?? [])
  const [interviews, setInterviews] = useState<Interview[]>(app.interviews ?? [])

  const submit = (e: FormEvent) => {
    e.preventDefault()
    void onSave({ nextAction, followUpOn, resumeVersion, feedback, contactIds, interviews: interviews.filter((i) => i.on) })
  }
  const setI = (idx: number, patch: Partial<Interview>) => setInterviews((xs) => xs.map((x, i) => (i === idx ? { ...x, ...patch } : x)))

  return (
    <form className="app__editor stack" onSubmit={submit}>
      <div className="field-grid">
        <TextField label="Next action" optional value={nextAction} onChange={setNextAction} maxLength={SHORT_MAX} placeholder="e.g. Send thank-you note" />
        <TextField label="Follow up by" optional type="date" value={followUpOn} onChange={setFollowUpOn} />
        <TextField
          label="Resume version"
          optional
          value={resumeVersion}
          onChange={setResumeVersion}
          maxLength={120}
          placeholder="e.g. backend-v3"
          hint="A label only. Keep the file on your device."
        />
      </div>
      {companyContacts.length > 0 && (
        <fieldset className="field">
          <legend className="field__label">Referral contacts at {app.snapshot.company}</legend>
          <div className="choices">
            {companyContacts.map((c) => (
              <label key={c.id} className="ack">
                <input
                  type="checkbox"
                  checked={contactIds.includes(c.id)}
                  onChange={() => setContactIds((xs) => (xs.includes(c.id) ? xs.filter((x) => x !== c.id) : [...xs, c.id]))}
                />
                <span>
                  {c.name}
                  {c.role ? ` · ${c.role}` : ''}
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      )}
      <fieldset className="field">
        <legend className="field__label">Interviews</legend>
        {interviews.map((iv, idx) => (
          <div key={iv.id} className="interview">
            <label>
              <span className="sr-only">Interview date</span>
              <input className="input" type="date" value={iv.on} onChange={(e) => setI(idx, { on: e.target.value })} />
            </label>
            <label>
              <span className="sr-only">Interview type</span>
              <select className="select" value={iv.kind} onChange={(e) => setI(idx, { kind: e.target.value as Interview['kind'] })}>
                {INTERVIEW_KINDS.map((k) => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span className="sr-only">Outcome</span>
              <select
                className="select"
                value={iv.outcome ?? 'pending'}
                onChange={(e) => setI(idx, { outcome: e.target.value as Interview['outcome'] })}
              >
                <option value="pending">pending</option>
                <option value="passed">passed</option>
                <option value="failed">not passed</option>
              </select>
            </label>
            <input
              className="input"
              aria-label="Interview note"
              placeholder="Note"
              maxLength={SHORT_MAX}
              value={iv.note ?? ''}
              onChange={(e) => setI(idx, { note: e.target.value || undefined })}
            />
            <button type="button" className="btn btn--ghost btn--sm" aria-label="Remove interview" onClick={() => setInterviews((xs) => xs.filter((_, i) => i !== idx))}>
              <X size={13} aria-hidden="true" />
            </button>
          </div>
        ))}
        <button
          type="button"
          className="btn btn--ghost btn--sm"
          onClick={() => setInterviews((xs) => [...xs, { id: newId(), on: today(), kind: 'technical', outcome: 'pending' }])}
        >
          <Plus size={13} aria-hidden="true" /> Add interview
        </button>
      </fieldset>
      <label className="field">
        <span className="field__label">
          Rejection / feedback notes <span className="field__optional">Optional</span>
        </span>
        <textarea className="textarea" rows={3} maxLength={NOTE_MAX} value={feedback} onChange={(e) => setFeedback(e.target.value)} />
      </label>
      <div className="job__noteactions">
        <button type="button" className="btn btn--ghost btn--sm" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="btn btn--primary btn--sm">
          Save details
        </button>
      </div>
    </form>
  )
}

function AddApplicationDialog({ onClose }: { onClose: () => void }) {
  const { actions, setStage } = useJobActions()
  const [title, setTitle] = useState('')
  const [company, setCompany] = useState('')
  const [url, setUrl] = useState('')
  const [stage, setStageChoice] = useState<Stage>('applied')
  const [errors, setErrors] = useState<{ title?: string; company?: string; url?: string; form?: string }>({})
  const [busy, setBusy] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const next: typeof errors = {}
    if (!title.trim()) next.title = 'Add the job title'
    if (!company.trim()) next.company = 'Add the company'
    if (!/^https?:\/\/\S+$/i.test(url.trim())) next.url = 'Add the link to the posting (http/https)'
    const dup = !next.title && !next.company ? findDuplicate(actions.values(), { title, company }) : undefined
    if (dup) next.form = `You already track “${dup.snapshot.title}” at ${dup.snapshot.company} (${STAGE_LABEL[stageOf(dup)!]}). Update that one instead.`
    setErrors(next)
    if (Object.keys(next).length) return
    setBusy(true)
    try {
      await setStage(manualRef({ title, company, url }), stage)
      onClose()
    } catch (err) {
      setErrors({ form: err instanceof Error ? err.message : String(err) })
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog
      open
      title="Add application"
      onClose={onClose}
      busy={busy}
      footer={
        <>
          <button type="button" className="btn btn--ghost" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button type="submit" form="add-app" className="btn btn--primary" disabled={busy}>
            Add
          </button>
        </>
      }
    >
      <form id="add-app" className="stack" onSubmit={submit} noValidate>
        <p className="field__hint">For a job you found outside JobIntel’s feed. It stays in this browser.</p>
        <TextField label="Job title" value={title} onChange={setTitle} error={errors.title} autoComplete="off" />
        <TextField label="Company" value={company} onChange={setCompany} error={errors.company} autoComplete="off" />
        <TextField label="Posting link" type="url" value={url} onChange={setUrl} error={errors.url} placeholder="https://…" />
        <label className="field">
          <span className="field__label">Stage</span>
          <select className="select" value={stage} onChange={(e) => setStageChoice(e.target.value as Stage)}>
            {STAGES.filter((s) => s.active).map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
        {errors.form && (
          <p className="field__error" role="alert">
            {errors.form}
          </p>
        )}
      </form>
    </Dialog>
  )
}
