import { useState } from 'react'
import { useApp } from '../../app/appContext'
import { PageHeader } from '../../components/layout/PageHeader'
import { TextField } from '../../components/ui/Field'
import { draftFromProfile, profileFromDraft, type DraftErrors, type ProfileDraft } from '../../domain/profile/form'
import { createEmptyProfile } from '../../domain/profile/schema'
import { AboutFields, CompanyFields, PlaceFields, RoleFields, SalaryFields, SkillFields } from '../profile/ProfileFields'

/** Whole number within [0, 100], from a text input. */
function parseScore(raw: string): { value?: number; error?: string } {
  const t = raw.trim()
  if (!/^\d+$/.test(t) || Number(t) > 100) return { error: 'Minimum match score must be a whole number from 0 to 100' }
  return { value: Number(t) }
}

export function SettingsPage() {
  const { profile, prefs, saveProfile, notify } = useApp()
  const [base] = useState(() => profile ?? createEmptyProfile())
  const [draft, setDraft] = useState<ProfileDraft>(() => draftFromProfile(base))
  const [minScore, setMinScore] = useState(String(prefs.minScore))
  const [errors, setErrors] = useState<DraftErrors>({})
  const [scoreError, setScoreError] = useState<string>()

  const set = <K extends keyof ProfileDraft>(key: K, value: ProfileDraft[K]) => setDraft((d) => ({ ...d, [key]: value }))
  const fields = { draft, errors, set }

  const save = () => {
    const score = parseScore(minScore)
    const result = profileFromDraft(draft, base)
    setScoreError(score.error)
    setErrors(result.ok ? {} : result.errors)
    if (score.error || !result.ok) return
    saveProfile(result.profile, { minScore: score.value! })
    notify('Settings saved in this browser')
  }

  return (
    <div className="stack">
      <PageHeader title="Settings" subtitle="Your profile and how jobs are matched. Saved in this browser only." />
      <section className="panel" aria-labelledby="match-title">
        <div className="panel__header">
          <h2 id="match-title" className="panel__title">Match preferences</h2>
        </div>
        <div className="panel__body stack">
          <TextField
            label="Minimum match score"
            inputMode="numeric"
            value={minScore}
            onChange={setMinScore}
            error={scoreError}
            hint="Jobs below this score are hidden on the Jobs page by default and are not counted as matches on the Dashboard."
          />
          <PlaceFields {...fields} />
        </div>
      </section>
      <section className="panel" aria-labelledby="profile-title">
        <div className="panel__header">
          <h2 id="profile-title" className="panel__title">Profile</h2>
        </div>
        <div className="panel__body stack">
          <AboutFields {...fields} />
          <RoleFields {...fields} />
          <SkillFields {...fields} />
          <CompanyFields {...fields} />
          <SalaryFields {...fields} />
        </div>
      </section>
      <div className="row">
        <button type="button" className="btn btn--primary" onClick={save}>
          Save changes
        </button>
      </div>
    </div>
  )
}
