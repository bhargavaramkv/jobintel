import type { JobAction } from './actions.ts'
import type { Job } from './feedSchema.ts'

/**
 * Learns from the user's own Applied / Not-interested decisions, entirely in the browser.
 * Deterministic and explainable: every adjustment carries a human-readable reason.
 * It never sees or changes the public feed; it re-ranks whatever the latest scan published.
 */

export const LEVELS = ['Intern', 'Junior / SDE-1', 'Mid / SDE-2', 'Senior', 'Staff / Lead', 'Principal'] as const

/** Seniority implied by a job title, or null when the title doesn't say. */
export function seniorityOf(title: string): number | null {
  const t = title.toLowerCase()
  if (/\bintern(ship)?\b/.test(t)) return 0
  if (/\b(principal|distinguished|fellow)\b/.test(t)) return 5
  if (/\b(staff|lead|architect)\b|\biv\b|\bl6\b/.test(t)) return 4
  if (/\b(senior|sr\.?)\b|\biii\b|\bsde[- ]?3\b|\bl5\b|\b(engineer|developer|sde) 3\b/.test(t)) return 3
  if (/\bii\b|\bsde[- ]?2\b|\bl4\b|\bmid\b|\b(engineer|developer) 2\b/.test(t)) return 2
  if (/\b(junior|jr\.?|associate|graduate|new grad|entry)\b|\bsde[- ]?1\b|\bl3\b|\b(engineer|developer) (i|1)\b/.test(t)) return 1
  return null
}

const STOP = new Set(
  (
    'a an and the of for in on at to with by from as is are be - & ' +
    'engineer engineers engineering software developer development dev sde swe mts member technical staff ' +
    'senior sr junior jr lead principal associate intern ii iii iv i 1 2 3 4 l3 l4 l5 l6 level ' +
    'team role position job opening india bengaluru bangalore hyderabad remote hybrid onsite based office'
  ).split(/\s+/),
)

/** Meaningful words in a title, e.g. "Senior Backend Engineer (Go, Kubernetes)" -> backend, go, kubernetes. */
export function titleTokens(title: string): string[] {
  const words = title
    .toLowerCase()
    .replace(/[()[\]/,|:;]+/g, ' ')
    .split(/\s+/)
    .map((w) => w.replace(/^[^a-z0-9#.+]+|[^a-z0-9#+]+$/g, ''))
    .map((w) => (w === 'fullstack' || w === 'full-stack' ? 'full stack' : w))
    .flatMap((w) => w.split(' '))
    .filter((w) => w.length > 1 && !STOP.has(w) && !/^\d+$/.test(w))
  return [...new Set(words)]
}

export interface Learned {
  /** Number of decisions the model learned from. */
  decisions: number
  applied: number
  rejected: number
  hiddenCompanies: string[]
  /** Jobs at or above this level get demoted (from "too senior"). */
  tooSeniorFrom: number | null
  /** Jobs at or below this level get demoted (from "too junior"). */
  tooJuniorUpTo: number | null
  /** Word weights from titles: + from applied, - from tech/role rejections. */
  tokenWeights: Map<string, number>
  appliedCompanies: Set<string>
}

const ROLE_REASONS = new Set(['tech-stack', 'role-type'])

export function learnFromActions(actions: Iterable<JobAction>): Learned {
  const tokenWeights = new Map<string, number>()
  const hidden = new Set<string>()
  const appliedCompanies = new Set<string>()
  let tooSeniorFrom: number | null = null
  let tooJuniorUpTo: number | null = null
  let applied = 0
  let rejected = 0

  const bump = (tokens: string[], by: number) => {
    for (const t of tokens) tokenWeights.set(t, (tokenWeights.get(t) ?? 0) + by)
  }

  for (const a of actions) {
    if (!a.decision) continue
    const tokens = titleTokens(a.snapshot.title)
    const level = seniorityOf(a.snapshot.title)
    if (a.decision === 'applied') {
      applied++
      appliedCompanies.add(a.snapshot.company)
      bump(tokens, 1)
      continue
    }
    rejected++
    if (a.rejectReasons.includes('company')) hidden.add(a.snapshot.company)
    if (a.rejectReasons.some((r) => ROLE_REASONS.has(r))) bump(tokens, -1)
    if (level !== null && a.rejectReasons.includes('too-senior')) {
      tooSeniorFrom = tooSeniorFrom === null ? level : Math.min(tooSeniorFrom, level)
    }
    if (level !== null && a.rejectReasons.includes('too-junior')) {
      tooJuniorUpTo = tooJuniorUpTo === null ? level : Math.max(tooJuniorUpTo, level)
    }
  }

  // Remove words that cancel out.
  for (const [t, w] of tokenWeights) if (w === 0) tokenWeights.delete(t)

  return {
    decisions: applied + rejected,
    applied,
    rejected,
    hiddenCompanies: [...hidden].sort((a, b) => a.localeCompare(b)),
    tooSeniorFrom,
    tooJuniorUpTo,
    tokenWeights,
    appliedCompanies,
  }
}

export interface Assessment {
  /** Higher ranks first. 0 = neutral. */
  score: number
  hidden: boolean
  reasons: Array<{ text: string; tone: 'up' | 'down' }>
}

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n))

/** Levels the user targets, from the profile's 'Target seniority' (e.g. SDE-2 -> 2). */
export function targetLevels(targetSeniority: readonly string[]): number[] {
  return [...new Set(targetSeniority.map((s) => seniorityOf(s)).filter((l): l is number => l !== null))].sort()
}

/** True when the assessment has anything to say (learned feedback or a seniority target). */
export const hasSignals = (model: Learned, targets: readonly number[]) => model.decisions > 0 || targets.length > 0

export function assessJob(job: Pick<Job, 'title' | 'company'>, model: Learned, targets: readonly number[] = []): Assessment {
  const reasons: Assessment['reasons'] = []
  let score = 0

  if (model.hiddenCompanies.includes(job.company)) {
    return { score: -10, hidden: true, reasons: [{ text: `You hid ${job.company}`, tone: 'down' }] }
  }

  const tokens = titleTokens(job.title)
  const ups = tokens.filter((t) => (model.tokenWeights.get(t) ?? 0) > 0)
  const downs = tokens.filter((t) => (model.tokenWeights.get(t) ?? 0) < 0)
  const tokenScore = clamp(
    tokens.reduce((s, t) => s + (model.tokenWeights.get(t) ?? 0), 0),
    -3,
    3,
  )
  score += tokenScore
  if (ups.length) reasons.push({ text: `Like roles you applied to: ${ups.slice(0, 3).join(', ')}`, tone: 'up' })
  if (downs.length) reasons.push({ text: `Like roles you passed on: ${downs.slice(0, 3).join(', ')}`, tone: 'down' })

  if (model.appliedCompanies.has(job.company)) {
    score += 0.5
    reasons.push({ text: `You applied at ${job.company} before`, tone: 'up' })
  }

  const level = seniorityOf(job.title)
  // Profile prior: two or more levels away from every stated target.
  if (level !== null && targets.length) {
    const maxT = Math.max(...targets)
    const minT = Math.min(...targets)
    const learnedSenior = model.tooSeniorFrom !== null && level >= model.tooSeniorFrom
    const learnedJunior = model.tooJuniorUpTo !== null && level <= model.tooJuniorUpTo
    if (level >= maxT + 2 && !learnedSenior) {
      score -= 1.5
      reasons.push({ text: ` level: above your target seniority`, tone: 'down' })
    } else if (level <= minT - 2 && !learnedJunior) {
      score -= 1.5
      reasons.push({ text: ` level: below your target seniority`, tone: 'down' })
    } else if (targets.includes(level)) {
      score += 0.5
      reasons.push({ text: `Matches your target seniority`, tone: 'up' })
    }
  }
  if (level !== null && model.tooSeniorFrom !== null && level >= model.tooSeniorFrom) {
    score -= 2
    reasons.push({ text: `${LEVELS[level]} level: you marked similar roles too senior`, tone: 'down' })
  }
  if (level !== null && model.tooJuniorUpTo !== null && level <= model.tooJuniorUpTo) {
    score -= 2
    reasons.push({ text: `${LEVELS[level]} level: you marked similar roles too junior`, tone: 'down' })
  }

  return { score, hidden: false, reasons }
}

/** Plain-language summary of what was learned, for the "Learned from your feedback" panel. */
export function describeLearning(model: Learned): string[] {
  const out: string[] = []
  if (model.hiddenCompanies.length) out.push(`Hiding jobs from: ${model.hiddenCompanies.join(', ')}`)
  if (model.tooSeniorFrom !== null) out.push(`Demoting ${LEVELS[model.tooSeniorFrom]} level and above`)
  if (model.tooJuniorUpTo !== null) out.push(`Demoting ${LEVELS[model.tooJuniorUpTo]} level and below`)
  const sorted = [...model.tokenWeights].sort((a, b) => b[1] - a[1])
  const up = sorted.filter(([, w]) => w > 0).slice(0, 8).map(([t]) => t)
  const down = sorted.filter(([, w]) => w < 0).reverse().slice(0, 8).map(([t]) => t)
  if (up.length) out.push(`Promoting titles with: ${up.join(', ')}`)
  if (down.length) out.push(`Demoting titles with: ${down.join(', ')}`)
  return out
}
