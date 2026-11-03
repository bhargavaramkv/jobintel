import { CalendarClock, Check, Copy, MessageSquareReply, Save, Send, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { localDate, stageOf, type JobAction } from '../../domain/jobs/actions'
import { targetLevels } from '../../domain/jobs/feedback'
import {
  allowedStrategies,
  CHANNELS,
  followUpDraft,
  followUpState,
  generateDraft,
  STRATEGIES,
  TONES,
  type Channel,
  type DraftJob,
  type StrategyId,
  type Tone,
} from '../../domain/outreach/drafts'
import { newMessageId, threadOf, type OutreachMessage } from '../../domain/outreach/messages'
import { matchJob } from '../../domain/match/score'
import { RELATIONSHIP_KINDS, relationshipsOf, type Contact } from '../../domain/referrals/contacts'
import { useJobActions } from '../jobs/useJobActions'
import { useJobFeed } from '../jobs/jobFeed'
import { useProfile } from '../profile/useProfile'
import { ConfidenceBadge } from '../referrals/LeadForm'
import { useContacts } from '../referrals/useContacts'
import { useOutreach } from './outreachContext'
import './outreach.css'

const nowIso = () => new Date().toISOString()
const today = () => localDate()
const norm = (s: string) => s.trim().toLowerCase()

export function OutreachPage() {
  const [params, setParams] = useSearchParams()
  const { contacts, save: saveContact } = useContacts()
  const { messages } = useOutreach()

  const leads = useMemo(
    () => [...contacts.values()].filter((c) => c.status !== 'dismissed').sort((a, b) => a.name.localeCompare(b.name)),
    [contacts],
  )
  const leadId = params.get('lead') ?? ''
  const lead = leadId ? contacts.get(leadId) : undefined

  const due = useMemo(() => {
    const day = today()
    return [...contacts.values()]
      .map((c) => ({ c, t: threadOf(messages.values(), c.id) }))
      .map(({ c, t }) => ({ c, f: followUpState(t.sent, t.replied) }))
      .filter(({ c, f }) => c.status !== 'dismissed' && f.dueOn && f.dueOn <= day)
      .sort((a, b) => a.f.dueOn!.localeCompare(b.f.dueOn!))
  }, [contacts, messages])

  const pick = (id: string, job?: string) => {
    const next = new URLSearchParams()
    if (id) next.set('lead', id)
    if (job) next.set('job', job)
    setParams(next)
  }

  return (
    <div className="outreach">
      <header className="profile__header">
        <div>
          <p className="eyebrow">Outreach</p>
          <h1 className="profile__title">Outreach strategist</h1>
          <p className="secondary profile__lede">
            Drafts built only from what you’ve recorded about a person and a job. JobIntel never sends anything: copy the text, send
            it yourself, then log it here.
          </p>
        </div>
      </header>

      {due.length > 0 && (
        <section className="panel" aria-labelledby="due-title">
          <div className="panel__header">
            <h2 id="due-title" className="panel__title">
              <CalendarClock size={15} aria-hidden="true" /> Follow-ups due
            </h2>
          </div>
          <ul className="panel__body due">
            {due.map(({ c, f }) => (
              <li key={c.id}>
                <span>
                  <strong>{c.name}</strong> · {c.company} <span className="mono muted">due {f.dueOn} · {f.reason}</span>
                </span>
                <button type="button" className="btn btn--secondary btn--sm" onClick={() => pick(c.id)}>
                  Open
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {leads.length === 0 ? (
        <section className="panel">
          <div className="empty">
            <Send size={36} className="muted" aria-hidden="true" />
            <h2 className="empty__title">No one to write to yet</h2>
            <p className="empty__text">
              Add referral leads first in <Link to="/referrals">Referrals</Link>. Drafts use what you record there.
            </p>
          </div>
        </section>
      ) : (
        <>
          <label className="filters__select outreach__pick">
            <span className="field__label">Person</span>
            <select className="select" value={lead?.id ?? ''} onChange={(e) => pick(e.target.value)}>
              <option value="">Choose a referral lead…</option>
              {leads.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} · {c.company}
                </option>
              ))}
            </select>
          </label>
          {lead && <Composer key={lead.id} lead={lead} jobParam={params.get('job') ?? ''} onPickJob={(j) => pick(lead.id, j)} onContacted={() => saveContact({ ...lead, status: 'contacted', updatedAt: nowIso() })} />}
        </>
      )}
    </div>
  )
}

function Composer({
  lead,
  jobParam,
  onPickJob,
  onContacted,
}: {
  lead: Contact
  jobParam: string
  onPickJob: (jobId: string) => void
  onContacted: () => Promise<void>
}) {
  const { profile } = useProfile()
  const { actions, setStage } = useJobActions()
  const { state: feedState } = useJobFeed()
  const { messages, save, remove } = useOutreach()
  const rels = useMemo(() => relationshipsOf(lead, profile), [lead, profile])
  const allowed = useMemo(() => allowedStrategies(rels), [rels])

  // Jobs at this person's company that you're pursuing, plus open feed jobs there.
  const feedJobs = useMemo(() => (feedState.status === 'ready' ? feedState.feed.jobs : []), [feedState])
  const jobOptions = useMemo(() => {
    const m = new Map<string, { id: string; job: DraftJob; record?: JobAction }>()
    for (const a of actions.values()) {
      if (norm(a.snapshot.company) === norm(lead.company) && a.decision !== 'rejected' && stageOf(a))
        m.set(a.jobId, { id: a.jobId, job: { title: a.snapshot.title, company: a.snapshot.company, url: a.snapshot.url }, record: a })
    }
    for (const j of feedJobs) {
      if (j.status === 'open' && norm(j.company) === norm(lead.company) && !m.has(j.id))
        m.set(j.id, { id: j.id, job: { title: j.title, company: j.company, url: j.url }, record: actions.get(j.id) })
    }
    return [...m.values()].sort((a, b) => Number(!!b.record) - Number(!!a.record) || a.job.title.localeCompare(b.job.title))
  }, [actions, feedJobs, lead])
  const selected = jobOptions.find((o) => o.id === jobParam)

  const matched = useMemo(() => {
    const live = selected && feedJobs.find((j) => j.id === selected.id)
    if (!live || !profile) return { skills: [] as string[], score: null as number | null }
    const m = matchJob(live, profile, targetLevels(profile.targetSeniority))
    return { skills: m.factors[0].matched, score: m.score }
  }, [selected, feedJobs, profile])

  const thread = useMemo(() => threadOf(messages.values(), lead.id), [messages, lead.id])
  const follow = followUpState(thread.sent, thread.replied)

  const [channel, setChannel] = useState<Channel>('linkedin-message')
  const [tone, setTone] = useState<Tone>('concise')
  const [strategyChoice, setStrategyChoice] = useState<StrategyId | ''>('')
  const [kind, setKind] = useState<'initial' | 'follow-up'>(thread.sent.length && !thread.replied ? 'follow-up' : 'initial')
  const draft = useMemo(
    () =>
      generateDraft({
        lead,
        rels,
        profile,
        job: selected?.job,
        matchedSkills: matched.skills,
        channel,
        tone,
        strategy: strategyChoice || undefined,
      }),
    [lead, rels, profile, selected, matched.skills, channel, tone, strategyChoice],
  )
  const generated = kind === 'follow-up' ? followUpDraft(lead, Math.max(1, thread.sent.length), tone, selected?.job) : draft.body
  const [edited, setEdited] = useState<{ base: string; text: string; subject?: string } | null>(null)
  // Regenerate when inputs change, unless the user edited this exact draft.
  const text = edited && edited.base === generated ? edited.text : generated
  const subject = edited && edited.base === generated && edited.subject !== undefined ? edited.subject : draft.subject
  const limit = CHANNELS.find((c) => c.id === channel)!.limit
  const [sentOn, setSentOn] = useState(today())
  const [notice, setNotice] = useState('')

  const persist = async (status: 'draft' | 'sent') => {
    const now = nowIso()
    const m: OutreachMessage = {
      id: newMessageId(),
      contactId: lead.id,
      channel,
      kind,
      body: text.trim(),
      status,
      createdAt: now,
      updatedAt: now,
      ...(selected ? { jobId: selected.id } : {}),
      ...(channel === 'email' && subject ? { subject } : {}),
      ...(status === 'sent' ? { sentOn } : {}),
    }
    await save(m)
    if (status === 'sent') {
      await onContacted()
      // Asking for a referral moves a shortlisted job forward in the pipeline.
      const rec = selected?.record
      if (selected && draft.strategy.asksReferral && kind === 'initial' && stageOf(rec) === 'shortlisted') {
        await setStage({ jobId: selected.id, snapshot: rec!.snapshot }, 'referral-requested', `Asked ${lead.name}`)
      }
    }
    setEdited(null)
    setNotice(status === 'sent' ? `Logged as sent on ${sentOn}.` : 'Draft saved.')
  }

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(channel === 'email' && subject ? `Subject: ${subject}\n\n${text}` : text)
      setNotice('Copied. Paste it into your message and send it yourself.')
    } catch {
      setNotice('Copy failed. Select the text and copy it manually.')
    }
  }

  return (
    <div className="composer">
      <section className="panel composer__context" aria-labelledby="ctx-title">
        <div className="panel__header">
          <h2 id="ctx-title" className="panel__title">
            Why {lead.name}
          </h2>
        </div>
        <div className="panel__body stack">
          <p className="secondary">
            {lead.role ? `${lead.role} · ` : ''}
            {lead.company} ·{' '}
            <a href={lead.sourceUrl} target="_blank" rel="noopener noreferrer">
              source
            </a>
          </p>
          <ul className="lead__rels">
            {rels.map((r) => (
              <li key={r.kind}>
                <ConfidenceBadge confidence={r.confidence} /> <strong>{RELATIONSHIP_KINDS[r.kind].label}</strong>{' '}
                <span className="secondary">· {r.evidence}</span>
              </li>
            ))}
          </ul>
          <div>
            <p className="field__label">Approach</p>
            <p>
              <strong>{draft.strategy.label}.</strong> <span className="secondary">{draft.strategy.why}</span>
            </p>
          </div>
          {selected && matched.score !== null && (
            <p className="mono muted">
              Your fit for {selected.job.title}: {matched.score}/100
              {matched.skills.length ? ` · shared skills: ${matched.skills.slice(0, 4).join(', ')}` : ''}
            </p>
          )}
          <div>
            <p className="field__label">Message history</p>
            {thread.messages.length === 0 ? (
              <p className="secondary">Nothing sent yet.</p>
            ) : (
              <ul className="history">
                {thread.messages.map((m) => (
                  <HistoryItem key={m.id} m={m} onSave={save} onRemove={remove} onLoad={(t) => setEdited({ base: generated, text: t, subject: m.subject })} />
                ))}
              </ul>
            )}
            <p className="field__hint">{follow.dueOn ? `Next follow-up due ${follow.dueOn} (${follow.reason}).` : follow.reason}</p>
          </div>
        </div>
      </section>

      <section className="panel composer__draft" aria-labelledby="draft-title">
        <div className="panel__header">
          <h2 id="draft-title" className="panel__title">
            Draft
          </h2>
        </div>
        <div className="panel__body stack">
          <div className="composer__opts">
            <label className="filters__select">
              <span className="field__label">Job</span>
              <select className="select" value={selected?.id ?? ''} onChange={(e) => onPickJob(e.target.value)}>
                <option value="">No specific job</option>
                {jobOptions.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.job.title}
                    {o.record ? ' (in your pipeline)' : ''}
                  </option>
                ))}
              </select>
            </label>
            <label className="filters__select">
              <span className="field__label">Message</span>
              <select className="select" value={kind} onChange={(e) => setKind(e.target.value as 'initial' | 'follow-up')}>
                <option value="initial">First message</option>
                <option value="follow-up" disabled={!thread.sent.length}>
                  Follow-up
                </option>
              </select>
            </label>
            <label className="filters__select">
              <span className="field__label">Channel</span>
              <select className="select" value={channel} onChange={(e) => setChannel(e.target.value as Channel)}>
                {CHANNELS.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="filters__select">
              <span className="field__label">Tone</span>
              <select className="select" value={tone} onChange={(e) => setTone(e.target.value as Tone)}>
                {TONES.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </select>
            </label>
            {allowed.length > 1 && kind === 'initial' && (
              <label className="filters__select">
                <span className="field__label">Approach</span>
                <select className="select" value={strategyChoice || draft.strategy.id} onChange={(e) => setStrategyChoice(e.target.value as StrategyId)}>
                  {allowed.map((s) => (
                    <option key={s} value={s}>
                      {STRATEGIES[s].label}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>

          {channel === 'email' && kind === 'initial' && (
            <label className="field">
              <span className="field__label">Subject</span>
              <input className="input" value={subject ?? ''} onChange={(e) => setEdited({ base: generated, text, subject: e.target.value })} />
            </label>
          )}
          <label className="field">
            <span className="field__label">Message (edit freely)</span>
            <textarea className="textarea composer__text" rows={channel === 'linkedin-note' ? 5 : 12} value={text} onChange={(e) => setEdited({ base: generated, text: e.target.value, subject })} />
            <span className={`field__hint mono ${text.length > limit ? 'over' : ''}`}>
              {text.length}/{limit} characters
            </span>
          </label>
          {kind === 'initial' &&
            draft.warnings.map((w) => (
              <p key={w} className="field__hint composer__warn">
                {w}
              </p>
            ))}
          <details>
            <summary className="field__hint">Facts this draft uses ({draft.usedFacts.length})</summary>
            <ul className="field__hint">
              {draft.usedFacts.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
          </details>

          <div className="composer__actions">
            <button type="button" className="btn btn--secondary" onClick={() => void copy()}>
              <Copy size={14} aria-hidden="true" /> Copy
            </button>
            <button type="button" className="btn btn--ghost" onClick={() => void persist('draft')} disabled={!text.trim()}>
              <Save size={14} aria-hidden="true" /> Save draft
            </button>
            <label className="composer__date">
              <span className="field__label">Sent on</span>
              <input className="input" type="date" value={sentOn} max={today()} onChange={(e) => setSentOn(e.target.value)} />
            </label>
            <button type="button" className="btn btn--primary" onClick={() => void persist('sent')} disabled={!text.trim() || !sentOn}>
              <Check size={14} aria-hidden="true" /> I sent it
            </button>
          </div>
          <p className="field__hint" role="status" aria-live="polite">
            {notice}
          </p>
        </div>
      </section>
    </div>
  )
}

function HistoryItem({
  m,
  onSave,
  onRemove,
  onLoad,
}: {
  m: OutreachMessage
  onSave: (m: OutreachMessage) => Promise<void>
  onRemove: (id: string) => Promise<void>
  onLoad: (text: string) => void
}) {
  const label = CHANNELS.find((c) => c.id === m.channel)!.label
  return (
    <li className="history__item">
      <span className="mono">
        {m.status === 'sent' ? `Sent ${m.sentOn}` : 'Draft'} · {m.kind === 'follow-up' ? 'follow-up' : 'first message'} · {label}
        {m.repliedOn ? ` · replied ${m.repliedOn}` : ''}
      </span>
      <span className="history__actions">
        {m.status === 'draft' && (
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => onLoad(m.body)}>
            Load
          </button>
        )}
        {m.status === 'sent' && !m.repliedOn && (
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            onClick={() => void onSave({ ...m, repliedOn: localDate(), updatedAt: nowIso() })}
          >
            <MessageSquareReply size={13} aria-hidden="true" /> They replied
          </button>
        )}
        <button
          type="button"
          className="btn btn--ghost btn--sm"
          aria-label={`Delete ${m.status === 'sent' ? 'logged message' : 'draft'}`}
          onClick={() => void onRemove(m.id)}
        >
          <Trash2 size={13} aria-hidden="true" />
        </button>
      </span>
    </li>
  )
}
