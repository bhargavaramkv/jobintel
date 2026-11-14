import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { PageHeader } from '../../components/layout/PageHeader'
import { AsyncView } from '../../components/ui/AsyncView'
import { ChoiceGroup } from '../../components/ui/ChoiceGroup'
import { TextAreaField, TextField } from '../../components/ui/Field'
import { TagInput } from '../../components/ui/TagInput'
import { draftFromProfile, profileFromDraft, type DraftErrors, type ProfileDraft } from '../../domain/profile/form'
import { calculateReadiness } from '../../domain/profile/readiness'
import { COMPANY_TYPES, CURRENCIES, SENIORITY_OPTIONS, WORK_MODES, type Skill } from '../../domain/profile/schema'
import { usePrototype, useSimulatedQuery } from '../../prototype/usePrototype'
import type { AutomationMode } from '../../prototype/types'
import { MasterUpload } from '../resumes/MasterUpload'

const STEPS = ['resume', 'candidate', 'roles', 'skills', 'location', 'salary', 'automation'] as const
type Step = (typeof STEPS)[number]

const STEP_LABEL: Record<Step, string> = {
  resume: 'Resume',
  candidate: 'About you',
  roles: 'Roles',
  skills: 'Skills',
  location: 'Location',
  salary: 'Salary',
  automation: 'Automation',
}

/** Which draft fields belong to which step, so Next only blocks on the visible step's errors. */
const STEP_FIELDS: Record<Step, Array<keyof ProfileDraft>> = {
  resume: [],
  candidate: ['displayName', 'currentTitle', 'currentCompany', 'yearsExperience', 'professionalSummary'],
  roles: ['targetRoles', 'targetSeniority', 'excludedTitles'],
  skills: ['primarySkills', 'secondarySkills'],
  location: ['preferredLocations', 'workModes', 'willingToRelocate', 'companyTypes'],
  salary: ['currency', 'compensationMin', 'compensationMax', 'noticePeriod'],
  automation: [],
}

const WORK_MODE_OPTIONS = WORK_MODES.map((m) => ({ value: m, label: m[0].toUpperCase() + m.slice(1) }))
const COMPANY_OPTIONS = COMPANY_TYPES.map((m) => ({ value: m, label: m[0].toUpperCase() + m.slice(1) }))
const SENIORITY_CHOICES = SENIORITY_OPTIONS.map((s) => ({ value: s, label: s }))
const skillName = (s: Skill) => s.name
const newSkill = (name: string): Skill => ({ name })
const text = (s: string) => s

const AUTOMATION_CHOICES: Array<{ value: AutomationMode; title: string; text: string }> = [
  { value: 'auto', title: 'Auto-submit above my score', text: 'Applies on its own when the score is high and the form has no screening questions.' },
  { value: 'approval', title: 'Ask me before every application', text: 'Prepares everything, then waits for your approval.' },
  { value: 'tailor', title: 'Tailor resumes only', text: 'Creates resume versions but never starts an application.' },
]

function OnboardingForm() {
  const { state, dispatch } = usePrototype()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const [draft, setDraft] = useState<ProfileDraft>(() => draftFromProfile(state.profile))
  const [mode, setMode] = useState<AutomationMode>(state.settings.automation.mode)
  const [errors, setErrors] = useState<DraftErrors>({})

  const requested = params.get('step') as Step | null
  const step: Step = requested && STEPS.includes(requested) ? requested : 'resume'
  const index = STEPS.indexOf(step)
  const last = index === STEPS.length - 1

  const result = profileFromDraft(draft, state.profile)
  const readiness = calculateReadiness(result.ok ? result.profile : state.profile)

  const set = <K extends keyof ProfileDraft>(key: K, value: ProfileDraft[K]) => setDraft((d) => ({ ...d, [key]: value }))
  const goto = (s: Step) => setParams({ step: s })

  const next = () => {
    if (!result.ok) {
      const hasError = (s: Step) => STEP_FIELDS[s].some((f) => result.errors[f])
      const bad = last ? STEPS.find(hasError) : hasError(step) ? step : undefined
      if (bad) {
        setErrors(result.errors)
        if (bad !== step) goto(bad)
        return
      }
    }
    setErrors({})
    if (last) {
      if (result.ok) {
        dispatch({ type: 'onboarding/complete', profile: result.profile, mode })
        navigate('/')
      }
      return
    }
    goto(STEPS[index + 1])
  }

  return (
    <div className="stack">
      <ol className="stepper" aria-label="Onboarding steps" tabIndex={0}>
        {STEPS.map((s, i) => (
          <li key={s} className={i < index ? 'stepper__item is-done' : 'stepper__item'} aria-current={s === step ? 'step' : undefined}>
            {i + 1}. {STEP_LABEL[s]}
          </li>
        ))}
      </ol>
      <div className="row">
        <div className="progress" style={{ flex: 1 }} role="progressbar" aria-label="Profile readiness" aria-valuemin={0} aria-valuemax={100} aria-valuenow={readiness.score}>
          <div className="progress__bar" style={{ width: `${readiness.score}%` }} />
        </div>
        <span className="mono muted">Readiness {readiness.score}%</span>
      </div>

      <section className="panel" aria-labelledby="step-title">
        <div className="panel__header">
          <h2 id="step-title" className="panel__title">
            Step {index + 1} of {STEPS.length}: {STEP_LABEL[step]}
          </h2>
        </div>
        <div className="panel__body stack">
          {step === 'resume' && (
            <>
              <p className="secondary">
                {state.resumes.master ? `Current master resume: ${state.resumes.master.name}` : 'Add your master resume as LaTeX. The agent tailors copies of it for each job.'}
              </p>
              <MasterUpload replace={Boolean(state.resumes.master)} />
            </>
          )}
          {step === 'candidate' && (
            <>
              <TextField label="Name" value={draft.displayName} onChange={(v) => set('displayName', v)} error={errors.displayName} />
              <TextField label="Current title" value={draft.currentTitle} onChange={(v) => set('currentTitle', v)} error={errors.currentTitle} />
              <TextField label="Current company" value={draft.currentCompany} onChange={(v) => set('currentCompany', v)} error={errors.currentCompany} optional />
              <TextField label="Years of experience" inputMode="decimal" value={draft.yearsExperience} onChange={(v) => set('yearsExperience', v)} error={errors.yearsExperience} />
              <TextAreaField label="Professional summary" value={draft.professionalSummary} onChange={(v) => set('professionalSummary', v)} error={errors.professionalSummary} />
            </>
          )}
          {step === 'roles' && (
            <>
              <TagInput label="Target roles" items={draft.targetRoles} getLabel={text} create={text} onChange={(v) => set('targetRoles', v)} error={errors.targetRoles} />
              <ChoiceGroup legend="Target seniority" options={SENIORITY_CHOICES} selected={draft.targetSeniority} onChange={(v) => set('targetSeniority', v)} />
              <TagInput label="Excluded title words" items={draft.excludedTitles} getLabel={text} create={text} onChange={(v) => set('excludedTitles', v)} optional />
            </>
          )}
          {step === 'skills' && (
            <>
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
            </>
          )}
          {step === 'location' && (
            <>
              <TagInput label="Preferred locations" items={draft.preferredLocations} getLabel={text} create={text} onChange={(v) => set('preferredLocations', v)} />
              <ChoiceGroup legend="Work modes" options={WORK_MODE_OPTIONS} selected={draft.workModes} onChange={(v) => set('workModes', v)} />
              <label className="row">
                <input type="checkbox" checked={draft.willingToRelocate} onChange={(e) => set('willingToRelocate', e.target.checked)} />
                Willing to relocate
              </label>
              <ChoiceGroup legend="Company types" options={COMPANY_OPTIONS} selected={draft.companyTypes} onChange={(v) => set('companyTypes', v)} />
            </>
          )}
          {step === 'salary' && (
            <>
              <div className="field">
                <label className="field__label" htmlFor="currency">Currency</label>
                <select id="currency" className="input" value={draft.currency} onChange={(e) => set('currency', e.target.value as ProfileDraft['currency'])}>
                  {CURRENCIES.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </div>
              <TextField label="Minimum (per year)" inputMode="numeric" value={draft.compensationMin} onChange={(v) => set('compensationMin', v)} error={errors.compensationMin} optional />
              <TextField label="Maximum (per year)" inputMode="numeric" value={draft.compensationMax} onChange={(v) => set('compensationMax', v)} error={errors.compensationMax} optional />
              <TextField label="Notice period" value={draft.noticePeriod} onChange={(v) => set('noticePeriod', v)} error={errors.noticePeriod} optional />
            </>
          )}
          {step === 'automation' && (
            <fieldset className="field">
              <legend className="field__label">How should the agent apply?</legend>
              <div className="stack">
                {AUTOMATION_CHOICES.map((c) => (
                  <label key={c.value} className="select-row">
                    <span className="row">
                      <input type="radio" name="automation" checked={mode === c.value} onChange={() => setMode(c.value)} />
                      <strong>{c.title}</strong>
                    </span>
                    <span className="list__meta">{c.text}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          )}
        </div>
      </section>

      <div className="row row--between">
        <button type="button" className="btn btn--secondary" disabled={index === 0} onClick={() => goto(STEPS[index - 1])}>
          Back
        </button>
        <button type="button" className="btn btn--primary" onClick={next}>
          {last ? 'Finish' : 'Next'}
        </button>
      </div>
    </div>
  )
}

export function OnboardingPage() {
  const q = useSimulatedQuery((s) => s.profile)
  return (
    <div className="stack">
      <PageHeader title="Onboarding" subtitle="Seven short steps. Everything stays in memory in this prototype." />
      <AsyncView status={q.status} onRetry={q.retry} emptyTitle="Nothing to set up">
        <OnboardingForm />
      </AsyncView>
    </div>
  )
}
