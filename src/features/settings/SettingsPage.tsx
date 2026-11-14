import { useState, type ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { PageHeader } from '../../components/layout/PageHeader'
import { AsyncView } from '../../components/ui/AsyncView'
import { ChoiceGroup } from '../../components/ui/ChoiceGroup'
import { TextAreaField, TextField } from '../../components/ui/Field'
import { TagInput } from '../../components/ui/TagInput'
import { draftFromProfile, profileFromDraft, type DraftErrors, type ProfileDraft } from '../../domain/profile/form'
import { SENIORITY_OPTIONS, WORK_MODES, type Skill } from '../../domain/profile/schema'
import { usePrototype, useSimulatedQuery } from '../../prototype/usePrototype'
import type { AutomationMode, PrototypeSettings } from '../../prototype/types'

const SECTIONS = [
  { id: 'profile', label: 'Profile' },
  { id: 'automation', label: 'Automation' },
  { id: 'limits', label: 'Limits' },
  { id: 'permissions', label: 'Permissions' },
  { id: 'notifications', label: 'Notifications' },
] as const
type SectionId = (typeof SECTIONS)[number]['id']

const text = (s: string) => s
const skillName = (s: Skill) => s.name
const newSkill = (name: string): Skill => ({ name })
const SENIORITY = SENIORITY_OPTIONS.map((s) => ({ value: s, label: s }))
const MODES = WORK_MODES.map((m) => ({ value: m, label: m[0].toUpperCase() + m.slice(1) }))

/** Whole number within [min, max], from a text input. */
function parseInt0(raw: string, min: number, max: number, label: string): { value?: number; error?: string } {
  const t = raw.trim()
  if (!/^\d+$/.test(t)) return { error: `${label} must be a whole number` }
  const n = Number(t)
  if (n < min || n > max) return { error: `${label} must be between ${min} and ${max}` }
  return { value: n }
}

function SaveBar({ onSave }: { onSave: () => void }) {
  return (
    <div className="row">
      <button type="button" className="btn btn--primary" onClick={onSave}>
        Save changes
      </button>
    </div>
  )
}

function Switch({ label, hint, checked, onChange }: { label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="stack" style={{ gap: 2 }}>
      <label className="switch">
        <input type="checkbox" role="switch" checked={checked} onChange={(e) => onChange(e.target.checked)} />
        {label}
      </label>
      {hint && <span className="field__hint">{hint}</span>}
    </div>
  )
}

function ProfileSection() {
  const { state, dispatch } = usePrototype()
  const [draft, setDraft] = useState<ProfileDraft>(() => draftFromProfile(state.profile))
  const [errors, setErrors] = useState<DraftErrors>({})
  const set = <K extends keyof ProfileDraft>(key: K, value: ProfileDraft[K]) => setDraft((d) => ({ ...d, [key]: value }))
  const save = () => {
    const result = profileFromDraft(draft, state.profile)
    if (!result.ok) return setErrors(result.errors)
    setErrors({})
    dispatch({ type: 'profile/save', profile: result.profile })
  }
  return (
    <div className="stack">
      <TextField label="Name" value={draft.displayName} onChange={(v) => set('displayName', v)} error={errors.displayName} />
      <TextField label="Current title" value={draft.currentTitle} onChange={(v) => set('currentTitle', v)} error={errors.currentTitle} />
      <TextField label="Years of experience" inputMode="decimal" value={draft.yearsExperience} onChange={(v) => set('yearsExperience', v)} error={errors.yearsExperience} />
      <TextAreaField label="Professional summary" value={draft.professionalSummary} onChange={(v) => set('professionalSummary', v)} error={errors.professionalSummary} />
      <TagInput label="Primary skills" items={draft.primarySkills} getLabel={skillName} create={newSkill} onChange={(v) => set('primarySkills', v)} error={errors.primarySkills} />
      <TagInput
        label="Secondary skills"
        items={draft.secondarySkills}
        getLabel={skillName}
        create={newSkill}
        onChange={(v) => set('secondarySkills', v)}
        reserved={draft.primarySkills.map(skillName)}
        error={errors.secondarySkills}
        optional
      />
      <TagInput label="Target roles" items={draft.targetRoles} getLabel={text} create={text} onChange={(v) => set('targetRoles', v)} />
      <ChoiceGroup legend="Target seniority" options={SENIORITY} selected={draft.targetSeniority} onChange={(v) => set('targetSeniority', v)} />
      <TagInput label="Preferred locations" items={draft.preferredLocations} getLabel={text} create={text} onChange={(v) => set('preferredLocations', v)} />
      <ChoiceGroup legend="Work modes" options={MODES} selected={draft.workModes} onChange={(v) => set('workModes', v)} />
      <SaveBar onSave={save} />
    </div>
  )
}

function AutomationSection({ settings }: { settings: PrototypeSettings }) {
  const { dispatch } = usePrototype()
  const a = settings.automation
  const [mode, setMode] = useState<AutomationMode>(a.mode)
  const [min, setMin] = useState(String(a.minMatchScore))
  const [autoMin, setAutoMin] = useState(String(a.autoApplyMinScore))
  const [enabled, setEnabled] = useState(a.autoApplyEnabled)
  const [noScreening, setNoScreening] = useState(a.requireNoScreeningQuestions)
  const [ask, setAsk] = useState(a.alwaysAskFor)
  const [errors, setErrors] = useState<{ min?: string; autoMin?: string }>({})

  const save = () => {
    const m = parseInt0(min, 0, 100, 'Minimum match score')
    const am = parseInt0(autoMin, 0, 100, 'Auto-apply score')
    const next: typeof errors = { min: m.error, autoMin: am.error }
    if (!m.error && !am.error && am.value! < m.value!) next.autoMin = 'Auto-apply score must not be below the minimum match score'
    setErrors(next)
    if (next.min || next.autoMin) return
    dispatch({
      type: 'settings/save',
      section: 'automation',
      settings: { ...settings, automation: { mode, minMatchScore: m.value!, autoApplyMinScore: am.value!, autoApplyEnabled: enabled, requireNoScreeningQuestions: noScreening, alwaysAskFor: ask } },
    })
  }
  return (
    <div className="stack">
      <div className="field">
        <label className="field__label" htmlFor="mode">Default behaviour</label>
        <select id="mode" className="input" value={mode} onChange={(e) => setMode(e.target.value as AutomationMode)}>
          <option value="auto">Auto-submit above my score</option>
          <option value="approval">Ask me before every application</option>
          <option value="tailor">Tailor resumes only</option>
        </select>
      </div>
      <TextField label="Minimum match score" inputMode="numeric" value={min} onChange={setMin} error={errors.min} hint="Postings below this are rejected." />
      <Switch label="Auto-apply to strong matches" checked={enabled} onChange={setEnabled} hint="Matches that qualify are Automatic. Everything else Needs approval." />
      <TextField label="Auto-apply when score is at least" inputMode="numeric" value={autoMin} onChange={setAutoMin} error={errors.autoMin} />
      <Switch label="Only when the form has no screening questions" checked={noScreening} onChange={setNoScreening} />
      <TagInput label="Always ask me about" items={ask} getLabel={text} create={text} onChange={setAsk} hint="These topics always make an application Needs approval." />
      <SaveBar onSave={save} />
    </div>
  )
}

function LimitsSection({ settings }: { settings: PrototypeSettings }) {
  const { dispatch } = usePrototype()
  const [daily, setDaily] = useState(String(settings.limits.daily))
  const [weekly, setWeekly] = useState(String(settings.limits.weekly))
  const [perCompany, setPerCompany] = useState(String(settings.limits.perCompany))
  const [errors, setErrors] = useState<Record<string, string | undefined>>({})

  const save = () => {
    const d = parseInt0(daily, 1, 100, 'Daily limit')
    const w = parseInt0(weekly, 1, 500, 'Weekly limit')
    const c = parseInt0(perCompany, 1, 20, 'Per-company limit')
    const next = { daily: d.error, weekly: w.error, perCompany: c.error }
    if (!d.error && !w.error && w.value! < d.value!) next.weekly = 'Weekly limit must be at least the daily limit'
    setErrors(next)
    if (next.daily || next.weekly || next.perCompany) return
    dispatch({ type: 'settings/save', section: 'limits', settings: { ...settings, limits: { daily: d.value!, weekly: w.value!, perCompany: c.value! } } })
  }
  return (
    <div className="stack">
      <TextField label="Daily application limit" inputMode="numeric" value={daily} onChange={setDaily} error={errors.daily} hint="1 to 100" />
      <TextField label="Weekly application limit" inputMode="numeric" value={weekly} onChange={setWeekly} error={errors.weekly} />
      <TextField label="Applications per company" inputMode="numeric" value={perCompany} onChange={setPerCompany} error={errors.perCompany} />
      <SaveBar onSave={save} />
    </div>
  )
}

function PermissionsSection({ settings }: { settings: PrototypeSettings }) {
  const { dispatch } = usePrototype()
  const [p, setP] = useState(settings.permissions)
  const set = (key: keyof typeof p) => (v: boolean) => setP({ ...p, [key]: v })
  return (
    <div className="stack">
      <Switch label="Tailor resumes" checked={p.tailorResumes} onChange={set('tailorResumes')} hint="Off: no resume versions are created, so applications stay Needs approval." />
      <Switch label="Submit applications" checked={p.submitApplications} onChange={set('submitApplications')} hint="On: strong matches can be Automatic. Off: every application is Needs approval." />
      <Switch label="Answer screening questions" checked={p.answerScreening} onChange={set('answerScreening')} hint="Off: forms with screening questions are Needs approval." />
      <Switch label="Create accounts on job portals" checked={p.createPortalAccounts} onChange={set('createPortalAccounts')} hint="Off: portals that require an account are Blocked until you sign in." />
      <SaveBar onSave={() => dispatch({ type: 'settings/save', section: 'permissions', settings: { ...settings, permissions: p } })} />
    </div>
  )
}

function NotificationsSection({ settings }: { settings: PrototypeSettings }) {
  const { dispatch } = usePrototype()
  const [n, setN] = useState(settings.notifications)
  const set = (key: keyof typeof n) => (v: boolean) => setN({ ...n, [key]: v })
  return (
    <div className="stack">
      <Switch label="When an application needs approval" checked={n.needsApproval} onChange={set('needsApproval')} />
      <Switch label="When the agent is blocked" checked={n.blocked} onChange={set('blocked')} />
      <Switch label="When an application fails" checked={n.failures} onChange={set('failures')} />
      <Switch label="Daily summary" checked={n.dailySummary} onChange={set('dailySummary')} />
      <p className="muted">Prototype: no notifications are ever sent.</p>
      <SaveBar onSave={() => dispatch({ type: 'settings/save', section: 'notifications', settings: { ...settings, notifications: n } })} />
    </div>
  )
}

export function SettingsPage() {
  const [params] = useSearchParams()
  const { state } = usePrototype()
  const q = useSimulatedQuery((s) => s.settings)
  const requested = params.get('section')
  const section: SectionId = SECTIONS.some((s) => s.id === requested) ? (requested as SectionId) : 'profile'
  const body: Record<SectionId, ReactNode> = {
    profile: <ProfileSection />,
    automation: <AutomationSection settings={q.data} />,
    limits: <LimitsSection settings={q.data} />,
    permissions: <PermissionsSection settings={q.data} />,
    notifications: <NotificationsSection settings={q.data} />,
  }
  return (
    <div className="stack">
      <PageHeader title="Settings" subtitle="Rules the agent follows. Saved in memory only." />
      <AsyncView status={q.status} onRetry={q.retry} emptyTitle="No settings">
        <div className="stack">
          <nav className="tabs" aria-label="Settings sections">
            {SECTIONS.map((s) => (
              <Link key={s.id} className="tab" to={`/settings?section=${s.id}`} aria-current={s.id === section ? 'true' : undefined}>
                {s.label}
              </Link>
            ))}
          </nav>
          <section key={state.epoch} className="panel" aria-label={SECTIONS.find((s) => s.id === section)!.label}>
            <div className="panel__body">{body[section]}</div>
          </section>
        </div>
      </AsyncView>
    </div>
  )
}
