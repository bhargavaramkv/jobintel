import { ChoiceGroup } from '../../components/ui/ChoiceGroup'
import { FieldShell, TextAreaField, TextField } from '../../components/ui/Field'
import { TagInput } from '../../components/ui/TagInput'
import type { DraftErrors, ProfileDraft } from '../../domain/profile/form'
import {
  COMPANY_TYPES,
  CURRENCIES,
  LIMITS,
  PROFICIENCIES,
  SENIORITY_OPTIONS,
  WORK_MODES,
  type Proficiency,
  type Skill,
} from '../../domain/profile/schema'

export interface SectionProps {
  draft: ProfileDraft
  errors: DraftErrors
  update: <K extends keyof ProfileDraft>(key: K, value: ProfileDraft[K]) => void
}

function SectionHeader({ id, title, description }: { id: string; title: string; description: string }) {
  return (
    <div className="section-head">
      <h2 id={`section-${id}`} className="panel__title">
        {title}
      </h2>
      <p className="panel__subtitle">{description}</p>
    </div>
  )
}

const asString = (s: string) => s

export function IdentitySection({ draft, errors, update }: SectionProps) {
  return (
    <section>
      <SectionHeader
        id="identity"
        title="Professional identity"
        description="Who you are today. Used later to rank roles against your experience."
      />
      <div className="field-grid">
        <TextField
          label="Display name"
          optional
          value={draft.displayName}
          onChange={(v) => update('displayName', v)}
          error={errors.displayName}
          hint="Used only for the dashboard greeting."
          autoComplete="off"
          maxLength={LIMITS.shortText + 10}
        />
        <TextField
          label="Current job title"
          value={draft.currentTitle}
          onChange={(v) => update('currentTitle', v)}
          error={errors.currentTitle}
          placeholder="e.g. Software Engineer"
          autoComplete="off"
          maxLength={LIMITS.shortText + 10}
        />
        <TextField
          label="Current company"
          optional
          value={draft.currentCompany}
          onChange={(v) => update('currentCompany', v)}
          error={errors.currentCompany}
          autoComplete="off"
          maxLength={LIMITS.shortText + 10}
        />
        <TextField
          label="Years of experience"
          value={draft.yearsExperience}
          onChange={(v) => update('yearsExperience', v)}
          error={errors.yearsExperience}
          inputMode="decimal"
          placeholder="e.g. 2.5"
          hint="Whole or one decimal place, 0–60."
          autoComplete="off"
        />
        <TextAreaField
          fieldClassName="field--full"
          label="Professional summary"
          value={draft.professionalSummary}
          onChange={(v) => update('professionalSummary', v)}
          error={errors.professionalSummary}
          placeholder="Two or three sentences on what you build and what you want next."
          hint={`${draft.professionalSummary.trim().length}/${LIMITS.summary} characters`}
          rows={5}
        />
      </div>
      <div className="stack">
        <TagInput<string>
          label="Past employers"
          optional
          items={draft.pastEmployers}
          getLabel={asString}
          create={asString}
          onChange={(v) => update('pastEmployers', v)}
          error={errors.pastEmployers}
          placeholder="Add a company you worked at"
          hint="Used only to spot genuine shared history with referral leads. Never published."
        />
        <TagInput<string>
          label="Colleges / universities"
          optional
          items={draft.schools}
          getLabel={asString}
          create={asString}
          onChange={(v) => update('schools', v)}
          error={errors.schools}
          placeholder="Add a college or university"
          hint="Used only to suggest alumni connections. Never published."
        />
      </div>
    </section>
  )
}

const PROFICIENCY_LABEL: Record<Proficiency, string> = { strong: 'strong', working: 'working', familiar: 'familiar' }

function nextProficiency(p: Proficiency | undefined): Proficiency | undefined {
  if (!p) return PROFICIENCIES[0]
  const i = PROFICIENCIES.indexOf(p)
  return i === PROFICIENCIES.length - 1 ? undefined : PROFICIENCIES[i + 1]
}

function SkillList({
  label,
  items,
  onChange,
  reserved,
  reservedLabel,
  error,
  hint,
}: {
  label: string
  items: Skill[]
  onChange: (s: Skill[]) => void
  reserved: Skill[]
  reservedLabel: string
  error?: string
  hint: string
}) {
  return (
    <TagInput<Skill>
      label={label}
      items={items}
      getLabel={(s) => s.name}
      create={(name) => ({ name })}
      onChange={onChange}
      error={error}
      hint={hint}
      reserved={reserved.map((s) => s.name)}
      reservedMessage={(n) => `“${n}” is already in ${reservedLabel}`}
      placeholder="e.g. C#, React, PostgreSQL"
      renderExtra={(skill, index) => (
        <button
          type="button"
          className="tag__level"
          onClick={() =>
            onChange(
              items.map((s, i) => {
                if (i !== index) return s
                const next = nextProficiency(s.proficiency)
                return next ? { name: s.name, proficiency: next } : { name: s.name }
              }),
            )
          }
          aria-label={`Proficiency for ${skill.name}: ${skill.proficiency ?? 'not set'}. Change`}
          title="Click to cycle proficiency: strong → working → familiar → none"
        >
          {skill.proficiency ? PROFICIENCY_LABEL[skill.proficiency] : '+lvl'}
        </button>
      )}
    />
  )
}

export function SkillsSection({ draft, errors, update }: SectionProps) {
  return (
    <section>
      <SectionHeader
        id="skills"
        title="Technical skills"
        description="Primary skills are what you'd lead an interview with. Duplicates are ignored regardless of case."
      />
      <div className="stack">
        <SkillList
          label="Primary skills"
          items={draft.primarySkills}
          onChange={(s) => update('primarySkills', s)}
          reserved={draft.secondarySkills}
          reservedLabel="secondary skills"
          error={errors.primarySkills}
          hint="Press Enter or comma to add. Backspace on an empty field removes the last one. Use the level button to mark proficiency."
        />
        <SkillList
          label="Secondary skills"
          items={draft.secondarySkills}
          onChange={(s) => update('secondarySkills', s)}
          reserved={draft.primarySkills}
          reservedLabel="primary skills"
          error={errors.secondarySkills}
          hint="Tools you've used but wouldn't headline."
        />
      </div>
    </section>
  )
}

export function RolesSection({ draft, errors, update }: SectionProps) {
  return (
    <section>
      <SectionHeader
        id="roles"
        title="Target roles"
        description="The titles and level you want. Excluded titles will be filtered out once discovery exists."
      />
      <div className="stack">
        <TagInput<string>
          label="Preferred job titles"
          items={draft.targetRoles}
          getLabel={asString}
          create={asString}
          onChange={(v) => update('targetRoles', v)}
          error={errors.targetRoles}
          placeholder="e.g. Backend Engineer"
          reserved={draft.excludedTitles}
          reservedMessage={(n) => `“${n}” is in excluded titles`}
        />
        <TagInput<string>
          label="Target seniority"
          items={draft.targetSeniority}
          getLabel={asString}
          create={asString}
          onChange={(v) => update('targetSeniority', v)}
          error={errors.targetSeniority}
          placeholder="Pick or type a level"
          suggestions={SENIORITY_OPTIONS}
          hint={`Suggestions: ${SENIORITY_OPTIONS.join(', ')}.`}
        />
        <TagInput<string>
          label="Excluded titles"
          optional
          items={draft.excludedTitles}
          getLabel={asString}
          create={asString}
          onChange={(v) => update('excludedTitles', v)}
          error={errors.excludedTitles}
          placeholder="e.g. QA Engineer"
          reserved={draft.targetRoles}
          reservedMessage={(n) => `“${n}” is a preferred title`}
        />
      </div>
    </section>
  )
}

const WORK_MODE_LABEL: Record<(typeof WORK_MODES)[number], string> = {
  onsite: 'Onsite',
  hybrid: 'Hybrid',
  remote: 'Remote',
}

export function LocationSection({ draft, errors, update }: SectionProps) {
  return (
    <section>
      <SectionHeader id="location" title="Location & work preferences" description="Where and how you want to work." />
      <div className="stack">
        <TagInput<string>
          label="Preferred locations"
          items={draft.preferredLocations}
          getLabel={asString}
          create={asString}
          onChange={(v) => update('preferredLocations', v)}
          error={errors.preferredLocations}
          placeholder="e.g. Bengaluru, Remote India"
        />
        <ChoiceGroup
          legend="Work modes"
          options={WORK_MODES.map((m) => ({ value: m, label: WORK_MODE_LABEL[m] }))}
          selected={draft.workModes}
          onChange={(v) => update('workModes', v)}
        />
        <label className="switch">
          <input
            type="checkbox"
            role="switch"
            checked={draft.willingToRelocate}
            onChange={(e) => update('willingToRelocate', e.target.checked)}
          />
          Willing to relocate
        </label>
      </div>
    </section>
  )
}

const COMPANY_TYPE_LABEL: Record<(typeof COMPANY_TYPES)[number], string> = {
  product: 'Product',
  service: 'Service',
  startup: 'Startup',
  any: 'Any',
}

export function CompanySection({ draft, errors, update }: SectionProps) {
  return (
    <section>
      <SectionHeader
        id="company"
        title="Company & compensation"
        description="All optional. Compensation stays in this browser and is never published."
      />
      <div className="stack">
        <ChoiceGroup
          legend="Company type preference"
          options={COMPANY_TYPES.map((t) => ({ value: t, label: COMPANY_TYPE_LABEL[t] }))}
          selected={draft.companyTypes}
          onChange={(v) => update('companyTypes', v)}
        />
        <TagInput<string>
          label="Target companies"
          optional
          items={draft.targetCompanies}
          getLabel={asString}
          create={asString}
          onChange={(v) => update('targetCompanies', v)}
          error={errors.targetCompanies}
          placeholder="Add a company name"
        />
        <div className="field-grid field-grid--3">
          <FieldShell label="Currency" optional>
            {({ id }) => (
              <select
                id={id}
                className="select"
                value={draft.currency}
                onChange={(e) => update('currency', e.target.value as ProfileDraft['currency'])}
              >
                {CURRENCIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            )}
          </FieldShell>
          <TextField
            label={`Minimum annual (${draft.currency})`}
            optional
            value={draft.compensationMin}
            onChange={(v) => update('compensationMin', v)}
            error={errors.compensationMin}
            inputMode="numeric"
            placeholder="e.g. 1800000"
            autoComplete="off"
          />
          <TextField
            label={`Maximum annual (${draft.currency})`}
            optional
            value={draft.compensationMax}
            onChange={(v) => update('compensationMax', v)}
            error={errors.compensationMax}
            inputMode="numeric"
            autoComplete="off"
          />
        </div>
        <TextField
          label="Notice period"
          optional
          value={draft.noticePeriod}
          onChange={(v) => update('noticePeriod', v)}
          error={errors.noticePeriod}
          placeholder="e.g. 30 days, serving notice, immediate"
          autoComplete="off"
          maxLength={LIMITS.shortText + 10}
        />
      </div>
    </section>
  )
}
