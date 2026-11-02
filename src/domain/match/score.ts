import { seniorityOf, titleTokens, LEVELS } from '../jobs/feedback'
import type { Job } from '../jobs/feedSchema'
import { fitsPreferences, preferencesFromProfile } from '../jobs/filters'
import type { CandidateProfile } from '../profile/schema'
import { canonicalSkill, mentionsSkill, skillsIn } from './skills'

/**
 * Deterministic job-fit score, computed in the browser from the local profile and the public
 * posting. Every factor reports its evidence. A factor without data on either side is marked
 * `unknown` and left OUT of the score (never counted as a match); `coverage` says how much of the
 * weight had evidence.
 */

export const FACTORS = [
  { id: 'skills', label: 'Technical skills', weight: 30 },
  { id: 'experience', label: 'Experience', weight: 20 },
  { id: 'responsibility', label: 'Role alignment', weight: 20 },
  { id: 'location', label: 'Location & work mode', weight: 10 },
  { id: 'seniority', label: 'Seniority', weight: 10 },
  { id: 'other', label: 'Other requirements', weight: 10 },
] as const

export type FactorId = (typeof FACTORS)[number]['id']

export interface FactorResult {
  id: FactorId
  label: string
  weight: number
  /** 0..1, or null when there is no evidence to judge. */
  value: number | null
  /** Short plain-language explanation. */
  summary: string
  matched: string[]
  missing: string[]
}

export interface MatchResult {
  /** 0..100 over the factors that had evidence; null when nothing could be judged. */
  score: number | null
  /** Share of total weight (0..100) that had evidence. */
  coverage: number
  band: 'strong' | 'good' | 'partial' | 'weak' | 'unknown'
  factors: FactorResult[]
  /** Skills from the posting the profile doesn't list, mandatory first. */
  gaps: { mandatory: string[]; preferred: string[] }
  /** Caps or caveats applied to the score, in plain language. */
  notes: string[]
}

/** Below this share of required skills, the overall score is capped. */
export const MIN_REQUIRED_SHARE = 1 / 3
export const LOW_SKILL_CAP = 50
/** Below this coverage (% of weight with evidence) the score is shown but not banded. */
export const MIN_COVERAGE = 50

// ---------- requirement parsing ----------

const YEARS =
  /(\d{1,2})(?:\.\d)?\s*(?:\+|plus)?\s*(?:(?:-|–|to)\s*(\d{1,2})\s*\+?)?\s*(?:years?|yrs?)(?!\s*old)/gi

/** Minimum years asked for, from requirement bullets first, then the description. */
export function requiredYears(job: Pick<Job, 'requirements' | 'description'>): { min: number; max?: number; quote: string } | null {
  const scan = (lines: string[]) => {
    let best: { min: number; max?: number; quote: string } | null = null
    for (const line of lines) {
      for (const m of line.matchAll(YEARS)) {
        const min = Number(m[1])
        const max = m[2] ? Number(m[2]) : undefined
        if (min < 0 || min > 20 || (max !== undefined && max < min)) continue
        // The largest lower bound is the binding requirement (e.g. "5+ years overall" beats "2+ years Kafka").
        if (!best || min > best.min) best = { min, max, quote: line.trim().slice(0, 160) }
      }
    }
    return best
  }
  return scan(job.requirements) ?? scan(job.description.split(/\n+/))
}

const PREFERRED_PHRASE = /\b(preferred|nice[- ]to[- ]have|bonus|a plus|is a plus|good to have|desirable|ideally|optional)\b/i

/** Split requirement bullets into mandatory and preferred. */
export function splitRequirements(job: Pick<Job, 'requirements' | 'preferred'>): { mandatory: string[]; preferred: string[] } {
  const pref = new Set(job.preferred ?? [])
  const mandatory: string[] = []
  const preferred: string[] = []
  for (const r of job.requirements) (pref.has(r) || PREFERRED_PHRASE.test(r) ? preferred : mandatory).push(r)
  return { mandatory, preferred }
}

/** Skills the posting asks for, split by mandatory / preferred. */
export function jobSkills(job: Pick<Job, 'title' | 'requirements' | 'preferred' | 'description'>) {
  const { mandatory, preferred } = splitRequirements(job)
  const must = new Set([...skillsIn(job.title), ...skillsIn(mandatory.join('\n'))])
  // Without requirement bullets, fall back to the description and treat mentions as mandatory.
  if (job.requirements.length === 0) for (const s of skillsIn(job.description)) must.add(s)
  const nice = new Set(skillsIn(preferred.join('\n')).filter((s) => !must.has(s)))
  return { mandatory: [...must], preferred: [...nice] }
}

// ---------- role families ----------

const FAMILIES: Array<[string, RegExp]> = [
  ['backend', /\b(back[- ]?end|server[- ]side|api|platform engineer|\.net|java|golang|python developer)\b/i],
  ['frontend', /\b(front[- ]?end|ui engineer|web developer|react developer|angular developer)\b/i],
  ['full stack', /\b(full[- ]?stack)\b/i],
  ['mobile', /\b(mobile|android|ios|flutter|react native)\b/i],
  ['data', /\b(data engineer|data platform|analytics engineer|etl|big data)\b/i],
  ['ml', /\b(machine learning|ml engineer|ai engineer|applied scientist|mlops|llm)\b/i],
  ['devops', /\b(devops|sre|site reliability|infrastructure|cloud engineer|platform reliability)\b/i],
  ['security', /\b(security|appsec|secops)\b/i],
  ['qa', /\b(qa|sdet|test engineer|quality|automation engineer)\b/i],
  ['salesforce', /\bsalesforce\b/i],
  ['embedded', /\b(embedded|firmware)\b/i],
  ['management', /\b(engineering manager|manager|director|head of)\b/i],
]

const RELATED: Record<string, string[]> = {
  backend: ['full stack', 'data', 'devops'],
  frontend: ['full stack', 'mobile'],
  'full stack': ['backend', 'frontend'],
  mobile: ['frontend'],
  data: ['backend', 'ml'],
  ml: ['data'],
  devops: ['backend', 'security'],
  security: ['devops'],
  qa: [],
  salesforce: [],
  embedded: [],
  management: [],
}

export function familiesOf(text: string): string[] {
  return FAMILIES.filter(([, re]) => re.test(text)).map(([f]) => f)
}

// ---------- scoring ----------

const yearsToLevel = (y: number) => (y < 1 ? 0 : y < 2.5 ? 1 : y < 5 ? 2 : y < 8 ? 3 : y < 12 ? 4 : 5)

const DEGREE = /\b(bachelor'?s?|master'?s?|b\.?\s?tech|m\.?\s?tech|b\.?e\.?|b\.?s\.?|m\.?s\.?|ph\.?d|degree)\b/i
const CERT = /\b(certified|certification|certificate)\b/i

function factor(id: FactorId, value: number | null, summary: string, matched: string[] = [], missing: string[] = []): FactorResult {
  const f = FACTORS.find((x) => x.id === id)!
  return { id, label: f.label, weight: f.weight, value: value === null ? null : Math.max(0, Math.min(1, value)), summary, matched, missing }
}

function skillsFactor(job: Job, profile: CandidateProfile, wanted: { mandatory: string[]; preferred: string[] }) {
  const mine = [
    ...profile.primarySkills.map((s) => ({ name: canonicalSkill(s.name), w: s.proficiency === 'familiar' ? 0.6 : s.proficiency === 'working' ? 0.85 : 1 })),
    ...profile.secondarySkills.map((s) => ({ name: canonicalSkill(s.name), w: s.proficiency === 'strong' ? 0.9 : s.proficiency === 'familiar' ? 0.5 : 0.7 })),
  ]
  if (mine.length === 0) return { f: factor('skills', null, 'Add skills to your profile to compare.'), gaps: wanted, requiredShare: null }
  const text = `${job.title}\n${job.requirements.join('\n')}`

  // Profile skills not in the vocabulary are matched literally against the posting.
  const custom = mine.filter((m) => !wanted.mandatory.includes(m.name) && !wanted.preferred.includes(m.name) && mentionsSkill(text, m.name))
  const mandatory = [...wanted.mandatory, ...custom.map((c) => c.name)]
  const preferred = wanted.preferred
  if (mandatory.length + preferred.length === 0) {
    return { f: factor('skills', null, 'The posting names no recognisable skills.'), gaps: { mandatory: [], preferred: [] }, requiredShare: null }
  }
  const have = new Map(mine.map((m) => [m.name.toLowerCase(), m.w]))
  const w = (s: string) => have.get(s.toLowerCase()) ?? 0
  const total = mandatory.length * 2 + preferred.length
  const got = mandatory.reduce((a, s) => a + 2 * w(s), 0) + preferred.reduce((a, s) => a + w(s), 0)
  const matched = [...mandatory, ...preferred].filter((s) => w(s) > 0)
  const missM = mandatory.filter((s) => w(s) === 0)
  const missP = preferred.filter((s) => w(s) === 0)
  const summary =
    `${mandatory.filter((s) => w(s) > 0).length}/${mandatory.length} required` +
    (preferred.length ? ` · ${preferred.filter((s) => w(s) > 0).length}/${preferred.length} preferred` : '')
  return {
    f: factor('skills', got / total, summary, matched, [...missM, ...missP.map((s) => `${s} (preferred)`)]),
    gaps: { mandatory: missM, preferred: missP },
    requiredShare: mandatory.length >= 3 ? (mandatory.length - missM.length) / mandatory.length : null,
  }
}

function experienceFactor(job: Job, profile: CandidateProfile) {
  const req = requiredYears(job)
  const yrs = profile.yearsExperience
  if (!req) return factor('experience', null, 'The posting doesn’t state years of experience.')
  const range = req.max !== undefined ? `${req.min}–${req.max}` : `${req.min}+`
  if (yrs === undefined) return factor('experience', null, `Asks for ${range} years. Add your years of experience to compare.`)
  if (yrs >= req.min) {
    const over = req.max !== undefined && yrs > req.max + 3
    return factor('experience', over ? 0.7 : 1, over ? `Asks ${range} years; you have ${yrs} (may be over-qualified)` : `Asks ${range} years; you have ${yrs}`, [`${yrs} yrs ≥ ${req.min}`])
  }
  const short = req.min - yrs
  const v = short <= 1 ? 0.6 : short <= 2 ? 0.3 : 0
  return factor('experience', v, `Asks ${range} years; you have ${yrs} (${short} short)`, [], [`${short} more year${short === 1 ? '' : 's'}`])
}

function responsibilityFactor(job: Job, profile: CandidateProfile) {
  const mineText = [...profile.targetRoles, profile.currentTitle ?? ''].join(' | ')
  if (!mineText.replace(/[|\s]/g, '')) return factor('responsibility', null, 'Add target roles to compare.')
  const jf = familiesOf(job.title)
  const mf = familiesOf(mineText)
  const jt = new Set(titleTokens(job.title))
  const overlap = [...new Set(profile.targetRoles.flatMap(titleTokens))].filter((t) => jt.has(t))

  if (jf.length === 0) {
    // Generic title ("Software Engineer"): judge by words in common, else a neutral partial fit.
    const deptF = familiesOf(job.department ?? '')
    if (deptF.length && mf.length && !deptF.some((f) => mf.includes(f)))
      return factor('responsibility', 0.4, `General title in ${job.department}`, [], [`${deptF[0]} team`])
    return factor('responsibility', overlap.length ? 0.85 : 0.6, overlap.length ? `Title shares: ${overlap.join(', ')}` : 'General engineering title', overlap)
  }
  if (mf.length === 0) {
    return factor('responsibility', overlap.length ? 0.8 : 0.3, overlap.length ? `Title shares: ${overlap.join(', ')}` : `A ${jf[0]} role; your targets don’t name this area`, overlap)
  }
  const same = jf.filter((f) => mf.includes(f))
  if (same.length) return factor('responsibility', 1, `${cap(same[0])} role, as you target`, same)
  const related = jf.filter((f) => mf.some((m) => RELATED[m]?.includes(f)))
  if (related.length) return factor('responsibility', 0.55, `${cap(related[0])} role, related to your ${mf[0]} target`, related)
  return factor('responsibility', 0.1, `${cap(jf[0])} role; you target ${mf.join(', ')}`, [], [jf[0]])
}

const FAMILY_LABEL: Record<string, string> = { qa: 'QA', ml: 'ML', devops: 'DevOps / SRE', 'full stack': 'Full-stack' }
const cap = (s: string) => FAMILY_LABEL[s] ?? s.charAt(0).toUpperCase() + s.slice(1)

function locationFactor(job: Job, profile: CandidateProfile) {
  const prefs = preferencesFromProfile(profile)
  if (!prefs.cities.length && !prefs.wantsRemote && !profile.workModes.length) {
    return factor('location', null, 'Add preferred locations to compare.')
  }
  const fits = fitsPreferences(job, { ...prefs, excludedTitles: [] })
  if (!fits) {
    if (profile.willingToRelocate && job.cities.length)
      return factor('location', 0.5, `In ${job.cities.join(', ')}; you’re open to relocating`, [], ['relocation'])
    return factor('location', 0, `Outside your locations or work modes`, [], [job.cities.join(', ') || job.workMode])
  }
  if (job.workMode === 'unknown' && profile.workModes.length > 0 && profile.workModes.length < 3)
    return factor('location', 0.75, 'Location fits; work mode not stated', [job.cities.join(', ')])
  return factor('location', 1, 'Matches your location and work mode', [job.cities.join(', ') || 'Remote'])
}

function seniorityFactor(job: Job, profile: CandidateProfile, targets: number[]) {
  let mine = targets
  let estimated = false
  if (!mine.length && profile.yearsExperience !== undefined) {
    mine = [yearsToLevel(profile.yearsExperience)]
    estimated = true
  }
  if (!mine.length) return factor('seniority', null, 'Add target seniority to compare.')
  let level = seniorityOf(job.title)
  let fromYears = false
  if (level === null) {
    const req = requiredYears(job)
    if (req) {
      level = yearsToLevel(req.min)
      fromYears = true
    }
  }
  if (level === null) return factor('seniority', null, 'The title doesn’t state a level.')
  const d = Math.min(...mine.map((t) => Math.abs(t - level)))
  const lbl = `${LEVELS[level]}${fromYears ? ' (from years asked)' : ''}`
  const yours = estimated ? 'your experience' : 'your target'
  if (d === 0) return factor('seniority', 1, `${lbl} matches ${yours}`, [LEVELS[level]])
  if (d === 1) return factor('seniority', 0.5, `${lbl}: one level from ${yours}`, [], [LEVELS[level]])
  return factor('seniority', 0, `${lbl}: ${d} levels from ${yours}`, [], [LEVELS[level]])
}

function otherFactor(job: Job, profile: CandidateProfile) {
  const matched: string[] = []
  const missing: string[] = []
  let value: number | null = null
  if (profile.excludedTitles.some((t) => job.title.toLowerCase().includes(t.toLowerCase()))) {
    return factor('other', 0, 'Title contains one of your excluded words', [], ['excluded title'])
  }
  if (profile.targetCompanies.some((c) => c.toLowerCase() === job.company.toLowerCase())) {
    matched.push(`${job.company} is a target company`)
    value = 1
  }
  const text = job.requirements.join('\n')
  const certs = job.requirements.filter((r) => CERT.test(r) && !PREFERRED_PHRASE.test(r))
  if (certs.length) missing.push('certification asked (check manually)')
  if (DEGREE.test(text)) missing.push('degree requirement (check manually)')
  if (value === null && missing.length === 0) return factor('other', null, 'No other stated requirements to compare.')
  if (value === null) value = 0.5
  const summary = matched.length ? matched[0] : 'Has requirements JobIntel can’t verify'
  return factor('other', value, summary, matched, missing)
}

export function matchJob(job: Job, profile: CandidateProfile | null, targets: number[] = []): MatchResult {
  const wanted = jobSkills(job)
  if (!profile) {
    return {
      score: null,
      coverage: 0,
      band: 'unknown',
      factors: FACTORS.map((f) => factor(f.id, null, 'Set up your profile to compare.')),
      gaps: { mandatory: [], preferred: [] },
      notes: [],
    }
  }
  const sk = skillsFactor(job, profile, wanted)
  const factors = [
    sk.f,
    experienceFactor(job, profile),
    responsibilityFactor(job, profile),
    locationFactor(job, profile),
    seniorityFactor(job, profile, targets),
    otherFactor(job, profile),
  ]
  const known = factors.filter((f) => f.value !== null)
  const coverage = known.reduce((a, f) => a + f.weight, 0)
  let score = coverage === 0 ? null : Math.round((known.reduce((a, f) => a + f.weight * f.value!, 0) / coverage) * 100)
  const notes: string[] = []
  if (score !== null && sk.requiredShare !== null && sk.requiredShare < MIN_REQUIRED_SHARE && score > LOW_SKILL_CAP) {
    score = LOW_SKILL_CAP
    notes.push(`Capped at ${LOW_SKILL_CAP}: you list fewer than a third of the required skills`)
  }
  if (score !== null && coverage < MIN_COVERAGE) notes.push(`Only ${coverage}% of the score had evidence; treat it as a rough guess`)
  return { score, coverage, band: bandOf(score, coverage), factors, gaps: sk.gaps, notes }
}

export function bandOf(score: number | null, coverage: number): MatchResult['band'] {
  if (score === null || coverage < MIN_COVERAGE) return 'unknown'
  if (score >= 80) return 'strong'
  if (score >= 65) return 'good'
  if (score >= 45) return 'partial'
  return 'weak'
}

export const BAND_LABEL: Record<MatchResult['band'], string> = {
  strong: 'Strong fit',
  good: 'Good fit',
  partial: 'Partial fit',
  weak: 'Weak fit',
  unknown: 'Not enough data',
}

// ---------- duplicates & stale postings ----------

const DAY = 86_400_000
export const STALE_POSTED_DAYS = 60

/** True when the source says the job was posted long ago (it may be filled but still listed). */
export function isStalePosting(job: Pick<Job, 'postedAt'>, now: Date = new Date()): boolean {
  return !!job.postedAt && now.getTime() - new Date(job.postedAt).getTime() > STALE_POSTED_DAYS * DAY
}

/** Sort key for "Best match": scored jobs with enough evidence first, then by score. */
export function matchRank(m: MatchResult): number {
  if (m.score === null) return -1
  return (m.coverage >= MIN_COVERAGE ? 1000 : 0) + m.score
}

/** Groups of open jobs at the same company with the same normalised title (e.g. one role per city). */
export function similarPostings(jobs: Job[]): Map<string, string[]> {
  const norm = (s: string) => s.toLowerCase().replace(/\(.*?\)/g, ' ').replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim()
  const groups = new Map<string, string[]>()
  for (const j of jobs) {
    if (j.status !== 'open') continue
    const k = `${j.company.toLowerCase()}::${norm(j.title)}`
    groups.set(k, [...(groups.get(k) ?? []), j.id])
  }
  const byJob = new Map<string, string[]>()
  for (const ids of groups.values()) if (ids.length > 1) for (const id of ids) byJob.set(id, ids.filter((x) => x !== id))
  return byJob
}
