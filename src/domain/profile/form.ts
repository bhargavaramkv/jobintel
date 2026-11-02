import {
  candidateProfileSchema,
  CURRENCIES,
  LIMITS,
  type CandidateProfile,
  type CompanyType,
  type Skill,
  type WorkMode,
} from './schema'

/**
 * Editable form state. Text and numeric inputs are kept as raw strings so the
 * user can type freely; conversion and validation happen in `profileFromDraft`.
 */
export interface ProfileDraft {
  displayName: string
  currentTitle: string
  currentCompany: string
  yearsExperience: string
  professionalSummary: string
  primarySkills: Skill[]
  secondarySkills: Skill[]
  targetRoles: string[]
  targetSeniority: string[]
  excludedTitles: string[]
  preferredLocations: string[]
  workModes: WorkMode[]
  willingToRelocate: boolean
  companyTypes: CompanyType[]
  targetCompanies: string[]
  currency: (typeof CURRENCIES)[number]
  compensationMin: string
  compensationMax: string
  noticePeriod: string
}

export type DraftErrors = Partial<Record<keyof ProfileDraft, string>>

export function draftFromProfile(p: CandidateProfile): ProfileDraft {
  return {
    displayName: p.displayName ?? '',
    currentTitle: p.currentTitle ?? '',
    currentCompany: p.currentCompany ?? '',
    yearsExperience: p.yearsExperience === undefined ? '' : String(p.yearsExperience),
    professionalSummary: p.professionalSummary ?? '',
    primarySkills: p.primarySkills.map((s) => ({ ...s })),
    secondarySkills: p.secondarySkills.map((s) => ({ ...s })),
    targetRoles: [...p.targetRoles],
    targetSeniority: [...p.targetSeniority],
    excludedTitles: [...p.excludedTitles],
    preferredLocations: [...p.preferredLocations],
    workModes: [...p.workModes],
    willingToRelocate: p.willingToRelocate,
    companyTypes: [...p.companyTypes],
    targetCompanies: [...p.targetCompanies],
    currency: p.compensation?.currency ?? 'INR',
    compensationMin: p.compensation?.minimum === undefined ? '' : String(p.compensation.minimum),
    compensationMax: p.compensation?.maximum === undefined ? '' : String(p.compensation.maximum),
    noticePeriod: p.noticePeriod ?? '',
  }
}

const optionalText = (s: string) => {
  const t = s.trim()
  return t ? t : undefined
}

type NumberParse = { value?: number; error?: string }

function parseOptionalNumber(raw: string, max: number, label: string): NumberParse {
  const t = raw.trim().replace(/,/g, '')
  if (!t) return {}
  if (!/^\d+(\.\d+)?$/.test(t)) return { error: `${label} must be a non-negative number` }
  const n = Number(t)
  if (!Number.isFinite(n) || n > max) return { error: `${label} must be at most ${max.toLocaleString()}` }
  return { value: n }
}

export type DraftResult =
  | { ok: true; profile: CandidateProfile }
  | { ok: false; errors: DraftErrors }

/** Validate a draft and merge it into the existing record. */
export function profileFromDraft(
  draft: ProfileDraft,
  base: CandidateProfile,
  now: Date = new Date(),
): DraftResult {
  const errors: DraftErrors = {}

  const years = parseOptionalNumber(draft.yearsExperience, LIMITS.maxYears, 'Years of experience')
  if (years.error) errors.yearsExperience = years.error
  else if (years.value !== undefined && Math.round(years.value * 10) !== years.value * 10) {
    errors.yearsExperience = 'Use at most one decimal place (e.g. 3.5)'
  }

  const min = parseOptionalNumber(draft.compensationMin, LIMITS.maxCompensation, 'Minimum')
  const max = parseOptionalNumber(draft.compensationMax, LIMITS.maxCompensation, 'Maximum')
  if (min.error) errors.compensationMin = min.error
  if (max.error) errors.compensationMax = max.error
  if (!min.error && !max.error && min.value !== undefined && max.value !== undefined && min.value > max.value) {
    errors.compensationMax = 'Maximum must be greater than or equal to minimum'
  }

  const textFields = ['displayName', 'currentTitle', 'currentCompany', 'noticePeriod'] as const
  for (const f of textFields) {
    if (draft[f].trim().length > LIMITS.shortText) errors[f] = `Keep this under ${LIMITS.shortText} characters`
  }
  if (draft.professionalSummary.trim().length > LIMITS.summary) {
    errors.professionalSummary = `Keep the summary under ${LIMITS.summary} characters`
  }

  const primary = new Set(draft.primarySkills.map((s) => s.name.toLowerCase()))
  const overlap = draft.secondarySkills.filter((s) => primary.has(s.name.toLowerCase()))
  if (overlap.length) {
    errors.secondarySkills = `Already listed as primary: ${overlap.map((s) => s.name).join(', ')}`
  }

  if (Object.keys(errors).length) return { ok: false, errors }

  const hasComp = min.value !== undefined || max.value !== undefined
  const candidate: CandidateProfile = {
    id: base.id,
    displayName: optionalText(draft.displayName),
    currentTitle: optionalText(draft.currentTitle),
    currentCompany: optionalText(draft.currentCompany),
    yearsExperience: years.value,
    professionalSummary: optionalText(draft.professionalSummary),
    primarySkills: draft.primarySkills,
    secondarySkills: draft.secondarySkills,
    targetRoles: draft.targetRoles,
    targetSeniority: draft.targetSeniority,
    excludedTitles: draft.excludedTitles,
    preferredLocations: draft.preferredLocations,
    workModes: draft.workModes,
    willingToRelocate: draft.willingToRelocate,
    companyTypes: draft.companyTypes,
    targetCompanies: draft.targetCompanies,
    compensation: hasComp
      ? { currency: draft.currency, minimum: min.value, maximum: max.value }
      : undefined,
    noticePeriod: optionalText(draft.noticePeriod),
    createdAt: base.createdAt,
    updatedAt: now.toISOString(),
  }
  // Drop undefined keys so stored records stay compact and comparable.
  const cleaned = JSON.parse(JSON.stringify(candidate)) as CandidateProfile

  const parsed = candidateProfileSchema.safeParse(cleaned)
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? '')
      const field: keyof ProfileDraft | undefined =
        key === 'compensation' ? 'compensationMax' : key in draft ? (key as keyof ProfileDraft) : undefined
      if (field && !errors[field]) errors[field] = issue.message
    }
    return { ok: false, errors }
  }
  return { ok: true, profile: parsed.data }
}

export function draftsEqual(a: ProfileDraft, b: ProfileDraft): boolean {
  return JSON.stringify(a) === JSON.stringify(b)
}
