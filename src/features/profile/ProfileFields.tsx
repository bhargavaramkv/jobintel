import { ChoiceGroup } from '../../components/ui/ChoiceGroup'
import { TextAreaField, TextField } from '../../components/ui/Field'
import { TagInput } from '../../components/ui/TagInput'
import type { DraftErrors, ProfileDraft } from '../../domain/profile/form'
import { COMPANY_TYPES, CURRENCIES, SENIORITY_OPTIONS, WORK_MODES, type Skill } from '../../domain/profile/schema'

/** Groups of profile form fields, shared by Setup (one group per step) and Settings (all groups on one page). */
export interface FieldsProps {
  draft: ProfileDraft
  errors: DraftErrors
  set: <K extends keyof ProfileDraft>(key: K, value: ProfileDraft[K]) => void
}

const WORK_MODE_OPTIONS = WORK_MODES.map((m) => ({ value: m, label: m[0].toUpperCase() + m.slice(1) }))
const COMPANY_OPTIONS = COMPANY_TYPES.map((m) => ({ value: m, label: m[0].toUpperCase() + m.slice(1) }))
const SENIORITY_CHOICES = SENIORITY_OPTIONS.map((s) => ({ value: s, label: s }))
const skillName = (s: Skill) => s.name
const newSkill = (name: string): Skill => ({ name })
const text = (s: string) => s

export function AboutFields({ draft, errors, set }: FieldsProps) {
  return (
    <>
      <TextField label="Name" value={draft.displayName} onChange={(v) => set('displayName', v)} error={errors.displayName} />
      <TextField label="Current title" value={draft.currentTitle} onChange={(v) => set('currentTitle', v)} error={errors.currentTitle} />
      <TextField label="Current company" value={draft.currentCompany} onChange={(v) => set('currentCompany', v)} error={errors.currentCompany} optional />
      <TextField label="Years of experience" inputMode="decimal" value={draft.yearsExperience} onChange={(v) => set('yearsExperience', v)} error={errors.yearsExperience} />
      <TextAreaField label="Professional summary" value={draft.professionalSummary} onChange={(v) => set('professionalSummary', v)} error={errors.professionalSummary} />
    </>
  )
}

export function RoleFields({ draft, errors, set }: FieldsProps) {
  return (
    <>
      <TagInput label="Target roles" items={draft.targetRoles} getLabel={text} create={text} onChange={(v) => set('targetRoles', v)} error={errors.targetRoles} />
      <ChoiceGroup legend="Target seniority" options={SENIORITY_CHOICES} selected={draft.targetSeniority} onChange={(v) => set('targetSeniority', v)} />
      <TagInput label="Excluded title words" items={draft.excludedTitles} getLabel={text} create={text} onChange={(v) => set('excludedTitles', v)} error={errors.excludedTitles} optional />
    </>
  )
}

export function SkillFields({ draft, errors, set }: FieldsProps) {
  return (
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
  )
}

/** Where and how you want to work. These drive the location part of every match score. */
export function PlaceFields({ draft, errors, set }: FieldsProps) {
  return (
    <>
      <TagInput
        label="Preferred cities and locations"
        items={draft.preferredLocations}
        getLabel={text}
        create={text}
        onChange={(v) => set('preferredLocations', v)}
        error={errors.preferredLocations}
        hint="For example Bengaluru, Hyderabad or Remote India."
      />
      <ChoiceGroup legend="Work modes" options={WORK_MODE_OPTIONS} selected={draft.workModes} onChange={(v) => set('workModes', v)} />
    </>
  )
}

export function CompanyFields({ draft, set }: FieldsProps) {
  return (
    <>
      <label className="row">
        <input type="checkbox" checked={draft.willingToRelocate} onChange={(e) => set('willingToRelocate', e.target.checked)} />
        Willing to relocate
      </label>
      <ChoiceGroup legend="Company types" options={COMPANY_OPTIONS} selected={draft.companyTypes} onChange={(v) => set('companyTypes', v)} />
    </>
  )
}

export function SalaryFields({ draft, errors, set }: FieldsProps) {
  return (
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
  )
}
