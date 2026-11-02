import { z } from 'zod'

export const PROFILE_ID = 'current-user' as const

export const LIMITS = {
  shortText: 120,
  summary: 1500,
  tag: 60,
  tagsPerList: 50,
  maxYears: 60,
  maxCompensation: 1_000_000_000,
} as const

export const PROFICIENCIES = ['strong', 'working', 'familiar'] as const
export const WORK_MODES = ['onsite', 'hybrid', 'remote'] as const
export const COMPANY_TYPES = ['product', 'service', 'startup', 'any'] as const
export const SENIORITY_OPTIONS = [
  'Intern',
  'SDE-1',
  'SDE-2',
  'Mid-level',
  'Senior',
  'Staff',
  'Lead',
] as const
export const CURRENCIES = ['INR', 'USD', 'EUR', 'GBP', 'SGD', 'AED'] as const

export type Proficiency = (typeof PROFICIENCIES)[number]
export type WorkMode = (typeof WORK_MODES)[number]
export type CompanyType = (typeof COMPANY_TYPES)[number]

const shortText = z.string().trim().max(LIMITS.shortText)
const tag = z.string().trim().min(1).max(LIMITS.tag)

/** A tag list with no case-insensitive duplicates. */
const tagList = z
  .array(tag)
  .max(LIMITS.tagsPerList)
  .refine((items) => new Set(items.map((t) => t.toLowerCase())).size === items.length, {
    message: 'Duplicate entries are not allowed',
  })

const uniqueEnumList = <T extends readonly [string, ...string[]]>(values: T) =>
  z
    .array(z.enum(values))
    .refine((items) => new Set(items).size === items.length, { message: 'Duplicate entries' })

export const skillSchema = z.object({
  name: tag,
  proficiency: z.enum(PROFICIENCIES).optional(),
})

const skillList = z
  .array(skillSchema)
  .max(LIMITS.tagsPerList)
  .refine((items) => new Set(items.map((s) => s.name.toLowerCase())).size === items.length, {
    message: 'Duplicate skills are not allowed',
  })

export const compensationSchema = z
  .object({
    currency: z.enum(CURRENCIES),
    minimum: z.number().nonnegative().max(LIMITS.maxCompensation).optional(),
    maximum: z.number().nonnegative().max(LIMITS.maxCompensation).optional(),
  })
  .refine(
    (c) => c.minimum === undefined || c.maximum === undefined || c.minimum <= c.maximum,
    { message: 'Minimum must not exceed maximum', path: ['maximum'] },
  )

export const candidateProfileSchema = z
  .object({
    id: z.literal(PROFILE_ID),
    displayName: shortText.optional(),
    currentTitle: shortText.optional(),
    currentCompany: shortText.optional(),
    yearsExperience: z.number().min(0).max(LIMITS.maxYears).optional(),
    professionalSummary: z.string().trim().max(LIMITS.summary).optional(),
    primarySkills: skillList,
    secondarySkills: skillList,
    targetRoles: tagList,
    targetSeniority: tagList,
    excludedTitles: tagList,
    preferredLocations: tagList,
    workModes: uniqueEnumList(WORK_MODES),
    willingToRelocate: z.boolean(),
    companyTypes: uniqueEnumList(COMPANY_TYPES),
    targetCompanies: tagList,
    /** Earlier employers, used only to spot genuine shared context with referral leads (Phase 4). */
    pastEmployers: tagList.optional(),
    /** Colleges / universities attended, for the same purpose. */
    schools: tagList.optional(),
    compensation: compensationSchema.optional(),
    noticePeriod: shortText.optional(),
    createdAt: z.string().min(1),
    updatedAt: z.string().min(1),
  })
  .strict()
  .refine(
    (p) => {
      const primary = new Set(p.primarySkills.map((s) => s.name.toLowerCase()))
      return p.secondarySkills.every((s) => !primary.has(s.name.toLowerCase()))
    },
    { message: 'A skill cannot be both primary and secondary', path: ['secondarySkills'] },
  )

export type Skill = z.infer<typeof skillSchema>
export type Compensation = z.infer<typeof compensationSchema>
export type CandidateProfile = z.infer<typeof candidateProfileSchema>

export function createEmptyProfile(now: Date = new Date()): CandidateProfile {
  const iso = now.toISOString()
  return {
    id: PROFILE_ID,
    primarySkills: [],
    secondarySkills: [],
    targetRoles: [],
    targetSeniority: [],
    excludedTitles: [],
    preferredLocations: [],
    workModes: [],
    willingToRelocate: false,
    companyTypes: [],
    targetCompanies: [],
    createdAt: iso,
    updatedAt: iso,
  }
}
