import { AlertCircle, CircleCheck, Loader2, RotateCcw, Save } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useBlocker, useSearchParams } from 'react-router-dom'
import { isProfileSection, PROFILE_SECTIONS, type ProfileSectionId } from '../../app/navigation'
import { Dialog } from '../../components/ui/Dialog'
import {
  draftFromProfile,
  draftsEqual,
  profileFromDraft,
  type DraftErrors,
  type ProfileDraft,
} from '../../domain/profile/form'
import { calculateReadiness } from '../../domain/profile/readiness'
import { createEmptyProfile, type CandidateProfile } from '../../domain/profile/schema'
import { readUiPreference, writeUiPreference } from '../../storage/uiPreferences'
import { DataPrivacySection, type Notice } from './DataPrivacySection'
import { useProfile } from './useProfile'
import {
  CompanySection,
  IdentitySection,
  LocationSection,
  RolesSection,
  SkillsSection,
  type SectionProps,
} from './sections'
import './profile.css'

type SaveState = { kind: 'idle' } | { kind: 'saving' } | { kind: 'saved'; at: string } | { kind: 'error'; message: string }

/** Which section owns each draft field, used to point the user at errors. */
const FIELD_SECTION: Record<keyof ProfileDraft, ProfileSectionId> = {
  displayName: 'identity',
  currentTitle: 'identity',
  currentCompany: 'identity',
  yearsExperience: 'identity',
  professionalSummary: 'identity',
  primarySkills: 'skills',
  secondarySkills: 'skills',
  targetRoles: 'roles',
  targetSeniority: 'roles',
  excludedTitles: 'roles',
  preferredLocations: 'location',
  workModes: 'location',
  willingToRelocate: 'location',
  companyTypes: 'company',
  targetCompanies: 'company',
  currency: 'company',
  compensationMin: 'company',
  compensationMax: 'company',
  noticePeriod: 'company',
}

export function ProfilePage() {
  const { state, save, revision } = useProfile()
  const [dataNotice, setDataNotice] = useState<Notice>(null)

  if (state.status === 'loading') {
    return (
      <div className="profile-loading" role="status">
        <Loader2 size={18} className="spin" aria-hidden="true" /> Loading your local profile…
      </div>
    )
  }

  const stored = state.status === 'ready' ? state.profile : null
  return (
    <ProfileEditor
      // Reset the editor when the record is replaced wholesale (import / clear).
      key={revision}
      stored={stored}
      loadError={state.status === 'error' ? state.message : null}
      save={save}
      dataNotice={dataNotice}
      setDataNotice={setDataNotice}
    />
  )
}

interface EditorProps {
  stored: CandidateProfile | null
  loadError: string | null
  save: (p: CandidateProfile) => Promise<CandidateProfile>
  dataNotice: Notice
  setDataNotice: (n: Notice) => void
}

function ProfileEditor({ stored, loadError, save, dataNotice, setDataNotice }: EditorProps) {
  const [base, setBase] = useState<CandidateProfile>(() => stored ?? createEmptyProfile())
  const [saved, setSaved] = useState<ProfileDraft>(() => draftFromProfile(base))
  const [draft, setDraft] = useState<ProfileDraft>(saved)
  const [errors, setErrors] = useState<DraftErrors>({})
  const [saveState, setSaveState] = useState<SaveState>(() =>
    stored ? { kind: 'saved', at: stored.updatedAt } : { kind: 'idle' },
  )
  const [params, setParams] = useSearchParams()

  const dirty = !draftsEqual(draft, saved)

  const paramSection = params.get('section')
  const section: ProfileSectionId = isProfileSection(paramSection)
    ? paramSection
    : (() => {
        const remembered = readUiPreference('profileSection')
        return isProfileSection(remembered) ? remembered : 'identity'
      })()

  useEffect(() => {
    writeUiPreference('profileSection', section)
  }, [section])

  const selectSection = useCallback(
    (id: ProfileSectionId) => setParams({ section: id }, { replace: true }),
    [setParams],
  )

  const update = useCallback(<K extends keyof ProfileDraft>(key: K, value: ProfileDraft[K]) => {
    setDraft((d) => ({ ...d, [key]: value }))
    setErrors((e) => {
      if (!e[key]) return e
      const next = { ...e }
      delete next[key]
      return next
    })
  }, [])

  const handleSave = useCallback(async () => {
    const result = profileFromDraft(draft, base)
    if (!result.ok) {
      setErrors(result.errors)
      const first = Object.keys(result.errors)[0] as keyof ProfileDraft
      setSaveState({ kind: 'error', message: 'Fix the highlighted fields before saving.' })
      if (first) selectSection(FIELD_SECTION[first])
      return
    }
    setSaveState({ kind: 'saving' })
    try {
      const persisted = await save(result.profile)
      const nextDraft = draftFromProfile(persisted)
      setBase(persisted)
      setSaved(nextDraft)
      setDraft(nextDraft)
      setErrors({})
      setSaveState({ kind: 'saved', at: persisted.updatedAt })
    } catch (err) {
      setSaveState({
        kind: 'error',
        message: `Could not save to browser storage: ${err instanceof Error ? err.message : String(err)}`,
      })
    }
  }, [draft, base, save, selectSection])

  const discard = () => {
    setDraft(saved)
    setErrors({})
    setSaveState(stored ? { kind: 'saved', at: base.updatedAt } : { kind: 'idle' })
  }

  // Ctrl/Cmd+S saves.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault()
        if (dirty) void handleSave()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [dirty, handleSave])

  // Warn before closing or reloading the tab with unsaved edits.
  useEffect(() => {
    if (!dirty) return
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [dirty])

  // Warn before in-app navigation away from the profile with unsaved edits.
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) => dirty && currentLocation.pathname !== nextLocation.pathname,
  )

  const preview = useMemo(() => {
    const r = profileFromDraft(draft, base)
    return calculateReadiness(r.ok ? r.profile : base)
  }, [draft, base])

  const sectionErrors = useMemo(() => {
    const set = new Set<ProfileSectionId>()
    for (const k of Object.keys(errors) as Array<keyof ProfileDraft>) set.add(FIELD_SECTION[k])
    return set
  }, [errors])

  const sectionProps: SectionProps = { draft, errors, update }

  return (
    <div className="profile">
      <header className="profile__header">
        <div>
          <p className="eyebrow">Candidate workspace</p>
          <h1 className="profile__title">Profile &amp; Preferences</h1>
          <p className="secondary profile__lede">
            Every field is optional. Fill in what you know; the profile is stored only in this browser.
          </p>
        </div>
        <div className="profile__readiness" aria-live="polite">
          <span className="mono muted">Readiness</span>
          <span className="readiness__score">{preview.score}%</span>
        </div>
      </header>

      {loadError && (
        <div className="alert alert--danger" role="alert">
          <AlertCircle size={16} aria-hidden="true" />
          <span>
            {loadError} Saving will overwrite the unreadable record. You can also restore a backup under Data &amp;
            privacy.
          </span>
        </div>
      )}

      <div className="profile__layout">
        <nav className="section-nav" aria-label="Profile sections">
          <ul>
            {PROFILE_SECTIONS.map((s) => (
              <li key={s.id}>
                <button
                  type="button"
                  className={s.id === section ? 'section-nav__item is-active' : 'section-nav__item'}
                  aria-current={s.id === section ? 'true' : undefined}
                  onClick={() => selectSection(s.id)}
                >
                  <span>{s.label}</span>
                  {sectionErrors.has(s.id) && (
                    <>
                      <AlertCircle size={14} className="section-nav__error" aria-hidden="true" />
                      <span className="sr-only">(has errors)</span>
                    </>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        <form
          className="panel profile__form"
          noValidate
          onSubmit={(e) => {
            e.preventDefault()
            void handleSave()
          }}
          aria-labelledby={`section-${section}`}
        >
          <div className="panel__body">
            {section === 'identity' && <IdentitySection {...sectionProps} />}
            {section === 'skills' && <SkillsSection {...sectionProps} />}
            {section === 'roles' && <RolesSection {...sectionProps} />}
            {section === 'location' && <LocationSection {...sectionProps} />}
            {section === 'company' && <CompanySection {...sectionProps} />}
            {section === 'data' && <DataPrivacySection dirty={dirty} notice={dataNotice} setNotice={setDataNotice} />}
          </div>

          {section !== 'data' && (
            <div className="savebar">
              <SaveStatus state={saveState} dirty={dirty} />
              <div className="savebar__actions">
                <button type="button" className="btn btn--ghost" onClick={discard} disabled={!dirty}>
                  <RotateCcw size={15} aria-hidden="true" />
                  Discard
                </button>
                <button
                  type="submit"
                  className="btn btn--primary"
                  disabled={!dirty || saveState.kind === 'saving'}
                >
                  <Save size={15} aria-hidden="true" />
                  {saveState.kind === 'saving' ? 'Saving…' : 'Save profile'}
                </button>
              </div>
            </div>
          )}
        </form>
      </div>

      <Dialog
        open={blocker.state === 'blocked'}
        title="Leave without saving?"
        role="alertdialog"
        onClose={() => blocker.reset?.()}
        footer={
          <>
            <button type="button" className="btn btn--secondary" onClick={() => blocker.reset?.()}>
              Keep editing
            </button>
            <button type="button" className="btn btn--danger" onClick={() => blocker.proceed?.()}>
              Discard changes
            </button>
          </>
        }
      >
        <p>You have unsaved profile changes. If you leave now they will be lost.</p>
      </Dialog>
    </div>
  )
}

function SaveStatus({ state, dirty }: { state: SaveState; dirty: boolean }) {
  let content
  if (state.kind === 'error') {
    content = (
      <span className="savebar__status savebar__status--error">
        <AlertCircle size={15} aria-hidden="true" />
        {state.message}
      </span>
    )
  } else if (state.kind === 'saving') {
    content = <span className="savebar__status">Saving to this browser…</span>
  } else if (dirty) {
    content = (
      <span className="savebar__status savebar__status--dirty">
        <span className="dot" aria-hidden="true" />
        Unsaved changes
      </span>
    )
  } else if (state.kind === 'saved') {
    const when = new Date(state.at).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
    content = (
      <span className="savebar__status savebar__status--saved">
        <CircleCheck size={15} aria-hidden="true" />
        Saved locally · {when}
      </span>
    )
  } else {
    content = <span className="savebar__status">Nothing saved yet</span>
  }
  return (
    <div role="status" aria-live="polite">
      {content}
    </div>
  )
}
