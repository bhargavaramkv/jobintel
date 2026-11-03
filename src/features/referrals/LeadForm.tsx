import { useState, type FormEvent } from 'react'
import { Dialog } from '../../components/ui/Dialog'
import { TextAreaField, TextField } from '../../components/ui/Field'
import { TagInput } from '../../components/ui/TagInput'
import { CONTACT_LIMITS, contactSchema, newContactId, relationshipsOf, type Contact } from '../../domain/referrals/contacts'
import type { CandidateProfile } from '../../domain/profile/schema'

interface Draft {
  name: string
  company: string
  role: string
  profileUrl: string
  sourceUrl: string
  pastCompanies: string[]
  schools: string[]
  knowsPersonally: boolean
  workedTogether: boolean
  mutualName: string
  mutualEvidence: string
  note: string
}

const asString = (s: string) => s
const PREVIEW_TIME = '1970-01-01T00:00:00.000Z'
const nowIso = () => new Date().toISOString()

function draftOf(c: Contact | undefined, company = ''): Draft {
  return {
    name: c?.name ?? '',
    company: c?.company ?? company,
    role: c?.role ?? '',
    profileUrl: c?.profileUrl ?? '',
    sourceUrl: c?.sourceUrl ?? '',
    pastCompanies: c?.pastCompanies ?? [],
    schools: c?.schools ?? [],
    knowsPersonally: c?.knowsPersonally ?? false,
    workedTogether: c?.workedTogether ?? false,
    mutualName: c?.mutual?.name ?? '',
    mutualEvidence: c?.mutual?.evidence ?? '',
    note: c?.note ?? '',
  }
}

export function LeadForm({
  open,
  existing,
  company,
  profile,
  onClose,
  onSave,
}: {
  open: boolean
  existing?: Contact
  company?: string
  profile: CandidateProfile | null
  onClose: () => void
  onSave: (c: Contact) => Promise<void>
}) {
  const [draft, setDraft] = useState<Draft>(() => draftOf(existing, company))
  const [errors, setErrors] = useState<Partial<Record<keyof Draft | 'form', string>>>({})
  const [busy, setBusy] = useState(false)
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setDraft((d) => ({ ...d, [k]: v }))

  const candidate = (now = PREVIEW_TIME): Contact => {
    const opt = (s: string) => (s.trim() ? s.trim() : undefined)
    const c: Contact = {
      id: existing?.id ?? newContactId(),
      name: draft.name.trim(),
      company: draft.company.trim(),
      sourceUrl: draft.sourceUrl.trim(),
      pastCompanies: draft.pastCompanies,
      schools: draft.schools,
      knowsPersonally: draft.knowsPersonally,
      workedTogether: draft.workedTogether,
      status: existing?.status ?? 'new',
      note: draft.note,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    }
    if (opt(draft.role)) c.role = opt(draft.role)
    if (opt(draft.profileUrl)) c.profileUrl = opt(draft.profileUrl)
    if (opt(draft.mutualName) || opt(draft.mutualEvidence))
      c.mutual = { name: draft.mutualName.trim(), evidence: draft.mutualEvidence.trim() }
    return c
  }

  // Live preview of what the facts support, so the user sees no claim is made without evidence.
  const preview = (() => {
    try {
      return relationshipsOf(candidate(), profile)
    } catch {
      return []
    }
  })()
  const mine = [...(profile?.pastEmployers ?? []), ...(profile?.currentCompany ? [profile.currentCompany] : [])]
  const canConfirmColleague = preview.some((r) => r.kind === 'former-colleague')

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const c = candidate(nowIso())
    if (!canConfirmColleague) c.workedTogether = false
    const parsed = contactSchema.safeParse(c)
    if (!parsed.success) {
      const next: typeof errors = {}
      for (const issue of parsed.error.issues) {
        const k = String(issue.path[0])
        const field = (k === 'mutual' ? (issue.path[1] === 'name' ? 'mutualName' : 'mutualEvidence') : k) as keyof Draft
        if (!next[field]) next[field] = k === 'sourceUrl' ? 'Add the link where you found this person (http/https)' : issue.message
      }
      setErrors(next)
      return
    }
    setBusy(true)
    try {
      await onSave(parsed.data)
      setDraft(draftOf(undefined))
      setErrors({})
    } catch (err) {
      setErrors({ form: err instanceof Error ? err.message : String(err) })
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog
      open={open}
      title={existing ? 'Edit referral lead' : 'Add referral lead'}
      onClose={onClose}
      busy={busy}
      footer={
        <>
          <button type="button" className="btn btn--ghost" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button type="submit" form="lead-form" className="btn btn--primary" disabled={busy}>
            Save lead
          </button>
        </>
      }
    >
      <form id="lead-form" className="stack" onSubmit={submit} noValidate>
        <p className="field__hint">
          Record only what you saw on a public page. Don’t store emails or phone numbers; JobIntel has no field for them.
        </p>
        <div className="field-grid">
          <TextField label="Name" value={draft.name} onChange={(v) => set('name', v)} error={errors.name} maxLength={CONTACT_LIMITS.name} autoComplete="off" />
          <TextField label="Company" value={draft.company} onChange={(v) => set('company', v)} error={errors.company} autoComplete="off" />
          <TextField label="Role" optional value={draft.role} onChange={(v) => set('role', v)} error={errors.role} placeholder="e.g. Senior Backend Engineer, Technical Recruiter" autoComplete="off" />
          <TextField
            label="Where you found them"
            value={draft.sourceUrl}
            onChange={(v) => set('sourceUrl', v)}
            error={errors.sourceUrl}
            type="url"
            placeholder="https://…"
            hint="Required. A public page: company team page, talk, blog post or public profile."
          />
          <TextField label="Public profile link" optional value={draft.profileUrl} onChange={(v) => set('profileUrl', v)} error={errors.profileUrl} type="url" placeholder="https://…" />
        </div>
        <TagInput<string>
          label="Companies they list"
          optional
          items={draft.pastCompanies}
          getLabel={asString}
          create={asString}
          onChange={(v) => set('pastCompanies', v)}
          placeholder="Add a past employer from their public profile"
          hint={mine.length ? `Compared with your employers: ${mine.join(', ')}` : 'Add your past employers in your profile to spot shared history.'}
        />
        <TagInput<string>
          label="Colleges they list"
          optional
          items={draft.schools}
          getLabel={asString}
          create={asString}
          onChange={(v) => set('schools', v)}
          placeholder="Add a college from their public profile"
          hint={profile?.schools?.length ? `Compared with: ${profile.schools.join(', ')}` : 'Add your colleges in your profile to spot alumni.'}
        />
        <fieldset className="field">
          <legend className="field__label">What you know first-hand</legend>
          <label className="ack">
            <input type="checkbox" checked={draft.knowsPersonally} onChange={(e) => set('knowsPersonally', e.target.checked)} />
            <span>I know this person personally</span>
          </label>
          <label className="ack">
            <input
              type="checkbox"
              checked={draft.workedTogether && canConfirmColleague}
              disabled={!canConfirmColleague}
              onChange={(e) => set('workedTogether', e.target.checked)}
            />
            <span>We actually worked together {canConfirmColleague ? '' : '(needs a shared employer above)'}</span>
          </label>
        </fieldset>
        <div className="field-grid">
          <TextField
            label="Mutual connection"
            optional
            value={draft.mutualName}
            onChange={(v) => set('mutualName', v)}
            error={errors.mutualName}
            placeholder="Who could introduce you"
            autoComplete="off"
          />
          <TextField
            label="Evidence for the mutual connection"
            optional={!draft.mutualName.trim()}
            value={draft.mutualEvidence}
            onChange={(v) => set('mutualEvidence', v)}
            error={errors.mutualEvidence}
            placeholder="e.g. Shown as a shared connection on their profile"
            maxLength={CONTACT_LIMITS.evidence}
          />
        </div>
        <TextAreaField label="Private note" optional value={draft.note} onChange={(v) => set('note', v)} rows={2} maxLength={CONTACT_LIMITS.note} />
        <div className="lead-preview" aria-live="polite">
          <span className="field__label">What JobIntel will show</span>
          <ul>
            {preview.map((r) => (
              <li key={r.kind}>
                <ConfidenceBadge confidence={r.confidence} /> {r.kind === 'cold' ? 'No shared context' : r.kind.replace('-', ' ')} · {r.evidence}
              </li>
            ))}
          </ul>
        </div>
        {errors.form && (
          <p className="field__error" role="alert">
            {errors.form}
          </p>
        )}
      </form>
    </Dialog>
  )
}

export function ConfidenceBadge({ confidence }: { confidence: 'verified' | 'inferred' | 'unknown' }) {
  const cls = confidence === 'verified' ? 'badge badge--success' : confidence === 'inferred' ? 'badge badge--accent' : 'badge'
  return <span className={cls}>{confidence === 'verified' ? 'Verified' : confidence === 'inferred' ? 'Inferred' : 'Unknown'}</span>
}
