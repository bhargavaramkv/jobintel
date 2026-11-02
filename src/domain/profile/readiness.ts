import type { CandidateProfile } from './schema'

/**
 * Profile readiness is a deterministic, weighted completion score.
 * Each rule is binary, except primary skills, which scale up to MIN_PRIMARY_SKILLS.
 * Weights sum to 100. Optional preferences (company, compensation, notice period,
 * excluded titles, display name) do not affect the score.
 */
export const MIN_PRIMARY_SKILLS = 3

export interface ReadinessRule {
  id: string
  label: string
  weight: number
  group: ChecklistGroupId
  /** Returns completion in [0, 1]. */
  evaluate: (p: CandidateProfile) => number
}

export type ChecklistGroupId = 'basics' | 'skills' | 'roles' | 'location'

const has = (s: string | undefined) => (s?.trim().length ?? 0) > 0

export const READINESS_RULES: readonly ReadinessRule[] = [
  { id: 'title', label: 'Current job title', weight: 10, group: 'basics', evaluate: (p) => (has(p.currentTitle) ? 1 : 0) },
  { id: 'experience', label: 'Years of experience', weight: 10, group: 'basics', evaluate: (p) => (p.yearsExperience !== undefined ? 1 : 0) },
  { id: 'summary', label: 'Professional summary', weight: 10, group: 'basics', evaluate: (p) => (has(p.professionalSummary) ? 1 : 0) },
  {
    id: 'primarySkills',
    label: `At least ${MIN_PRIMARY_SKILLS} primary skills`,
    weight: 20,
    group: 'skills',
    evaluate: (p) => Math.min(p.primarySkills.length, MIN_PRIMARY_SKILLS) / MIN_PRIMARY_SKILLS,
  },
  { id: 'secondarySkills', label: 'At least 1 secondary skill', weight: 5, group: 'skills', evaluate: (p) => (p.secondarySkills.length > 0 ? 1 : 0) },
  { id: 'targetRoles', label: 'At least 1 target job title', weight: 15, group: 'roles', evaluate: (p) => (p.targetRoles.length > 0 ? 1 : 0) },
  { id: 'seniority', label: 'Target seniority', weight: 5, group: 'roles', evaluate: (p) => (p.targetSeniority.length > 0 ? 1 : 0) },
  { id: 'locations', label: 'At least 1 preferred location', weight: 10, group: 'location', evaluate: (p) => (p.preferredLocations.length > 0 ? 1 : 0) },
  { id: 'workModes', label: 'At least 1 work mode', weight: 10, group: 'location', evaluate: (p) => (p.workModes.length > 0 ? 1 : 0) },
  { id: 'companyTypes', label: 'Company type preference', weight: 5, group: 'location', evaluate: (p) => (p.companyTypes.length > 0 ? 1 : 0) },
]

export const CHECKLIST_GROUPS: ReadonlyArray<{ id: ChecklistGroupId; label: string; section: string }> = [
  { id: 'basics', label: 'Profile basics', section: 'identity' },
  { id: 'skills', label: 'Skills', section: 'skills' },
  { id: 'roles', label: 'Target roles', section: 'roles' },
  { id: 'location', label: 'Location & work preferences', section: 'location' },
]

export interface RuleResult {
  id: string
  label: string
  weight: number
  earned: number
  complete: boolean
  group: ChecklistGroupId
}

export interface Readiness {
  /** Integer 0–100. */
  score: number
  rules: RuleResult[]
  groups: Array<{ id: ChecklistGroupId; label: string; section: string; complete: boolean }>
  complete: boolean
}

export function calculateReadiness(profile: CandidateProfile | null): Readiness {
  const rules: RuleResult[] = READINESS_RULES.map((rule) => {
    const ratio = profile ? Math.max(0, Math.min(1, rule.evaluate(profile))) : 0
    return {
      id: rule.id,
      label: rule.label,
      weight: rule.weight,
      earned: rule.weight * ratio,
      complete: ratio >= 1,
      group: rule.group,
    }
  })
  const score = Math.round(rules.reduce((sum, r) => sum + r.earned, 0))
  const groups = CHECKLIST_GROUPS.map((g) => ({
    ...g,
    complete: rules.filter((r) => r.group === g.id).every((r) => r.complete),
  }))
  return { score, rules, groups, complete: score === 100 }
}
