import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useApp } from '../../app/appContext'
import { PageHeader } from '../../components/layout/PageHeader'
import { draftFromProfile, profileFromDraft, type DraftErrors, type ProfileDraft } from '../../domain/profile/form'
import { calculateReadiness } from '../../domain/profile/readiness'
import { createEmptyProfile, type Skill } from '../../domain/profile/schema'
import { inferFromTex, type ResumeInference } from '../../domain/resume/infer'
import { AboutFields, CompanyFields, PlaceFields, RoleFields, SalaryFields, SkillFields } from '../profile/ProfileFields'
import { MasterUpload } from '../resumes/MasterUpload'

const STEPS = ['resume', 'candidate', 'roles', 'skills', 'location', 'salary'] as const
type Step = (typeof STEPS)[number]

const STEP_LABEL: Record<Step, string> = {
  resume: 'Resume',
  candidate: 'About you',
  roles: 'Roles',
  skills: 'Skills',
  location: 'Location',
  salary: 'Salary',
}

/** Which draft fields belong to which step, so Next only blocks on the visible step's errors. */
const STEP_FIELDS: Record<Step, Array<keyof ProfileDraft>> = {
  resume: [],
  candidate: ['displayName', 'currentTitle', 'currentCompany', 'yearsExperience', 'professionalSummary'],
  roles: ['targetRoles', 'targetSeniority', 'excludedTitles'],
  skills: ['primarySkills', 'secondarySkills'],
  location: ['preferredLocations', 'workModes', 'willingToRelocate', 'companyTypes'],
  salary: ['currency', 'compensationMin', 'compensationMax', 'noticePeriod'],
}

const newSkill = (name: string): Skill => ({ name })

/** Fills roles, seniority and skills from the resume, only where the user has not entered anything yet. */
function fillFromResume(d: ProfileDraft, inferred: ResumeInference): ProfileDraft {
  return {
    ...d,
    targetRoles: d.targetRoles.length ? d.targetRoles : inferred.targetRoles,
    targetSeniority: d.targetSeniority.length ? d.targetSeniority : inferred.targetSeniority,
    primarySkills: d.primarySkills.length ? d.primarySkills : inferred.primarySkills.map(newSkill),
    secondarySkills: d.secondarySkills.length ? d.secondarySkills : inferred.secondarySkills.map(newSkill),
  }
}

export function OnboardingPage() {
  const { profile, resume, saveProfile, notify } = useApp()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const [base] = useState(() => profile ?? createEmptyProfile())
  const [draft, setDraft] = useState<ProfileDraft>(() => {
    const d = draftFromProfile(base)
    return resume ? fillFromResume(d, inferFromTex(resume.tex)) : d
  })
  const [errors, setErrors] = useState<DraftErrors>({})

  const requested = params.get('step') as Step | null
  const step: Step = requested && STEPS.includes(requested) ? requested : 'resume'
  const index = STEPS.indexOf(step)
  const last = index === STEPS.length - 1

  const result = profileFromDraft(draft, base)
  const readiness = calculateReadiness(result.ok ? result.profile : profile)

  const set = <K extends keyof ProfileDraft>(key: K, value: ProfileDraft[K]) => setDraft((d) => ({ ...d, [key]: value }))
  const goto = (s: Step) => setParams({ step: s })
  const fields = { draft, errors, set }

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
        saveProfile(result.profile)
        notify('Profile saved in this browser')
        navigate('/')
      }
      return
    }
    if (step === 'resume' && resume) setDraft((d) => fillFromResume(d, inferFromTex(resume.tex)))
    goto(STEPS[index + 1])
  }

  return (
    <div className="stack">
      <PageHeader title="Setup" subtitle="Six short steps. Your profile is saved in this browser only." />
      <ol className="stepper" aria-label="Setup steps" tabIndex={0}>
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
                {resume ? `Current master resume: ${resume.name}` : 'Add your master resume as LaTeX. Roles and skills are suggested from it.'}
              </p>
              <MasterUpload replace={Boolean(resume)} />
            </>
          )}
          {step === 'candidate' && <AboutFields {...fields} />}
          {step === 'roles' && (
            <>
              <p className="list__meta">{resume ? 'Suggested from your resume. Edit anything that is wrong.' : 'Upload your resume in step 1 and these are suggested for you.'}</p>
              <RoleFields {...fields} />
            </>
          )}
          {step === 'skills' && (
            <>
              <p className="list__meta">{resume ? 'Found in your resume. Add or remove skills as needed.' : 'Upload your resume in step 1 and skills are found for you.'}</p>
              <SkillFields {...fields} />
            </>
          )}
          {step === 'location' && (
            <>
              <PlaceFields {...fields} />
              <CompanyFields {...fields} />
            </>
          )}
          {step === 'salary' && <SalaryFields {...fields} />}
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
