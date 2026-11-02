import { z } from 'zod'
import type { CandidateProfile } from '../profile/schema'
import { familiesOf } from '../match/score'

/**
 * Referral leads (Phase 4). The user records people they found on public pages; JobIntel never
 * scrapes or searches on its own. Relationships are DERIVED from recorded facts, never typed in
 * as a claim: e.g. "former colleague" appears only when the lead's listed past companies overlap
 * the user's own employers. Stored only in this browser.
 */

export const LEAD_STATUSES = [
  { id: 'new', label: 'New' },
  { id: 'known', label: 'I know them' },
  { id: 'unknown', label: 'I don’t know them' },
  { id: 'contacted', label: 'Contacted' },
  { id: 'dismissed', label: 'Dismissed' },
] as const

export type LeadStatus = (typeof LEAD_STATUSES)[number]['id']
const STATUS_IDS = LEAD_STATUSES.map((s) => s.id) as [LeadStatus, ...LeadStatus[]]

export const CONTACT_LIMITS = { name: 120, role: 160, note: 1000, evidence: 500, list: 20 } as const

const httpUrl = z
  .string()
  .trim()
  .url()
  .refine((u) => /^https?:\/\//i.test(u), { message: 'Use an http(s) link' })

const nameList = z.array(z.string().trim().min(1).max(120)).max(CONTACT_LIMITS.list)

export const contactSchema = z
  .object({
    id: z.string().min(1),
    name: z.string().trim().min(1).max(CONTACT_LIMITS.name),
    company: z.string().trim().min(1).max(120),
    role: z.string().trim().max(CONTACT_LIMITS.role).optional(),
    /** Their public professional profile, if any. No emails or phone numbers are stored. */
    profileUrl: httpUrl.optional(),
    /** Where the user found this person. Required: every lead has a traceable source. */
    sourceUrl: httpUrl,
    /** Companies the lead lists publicly (current company excluded). */
    pastCompanies: nameList,
    /** Colleges the lead lists publicly. */
    schools: nameList,
    /** The user confirms they know this person directly. */
    knowsPersonally: z.boolean(),
    /** The user confirms they actually worked together (not just at the same company). */
    workedTogether: z.boolean(),
    /** A specific person who can introduce the user, with what the user saw. */
    mutual: z
      .object({
        name: z.string().trim().min(1).max(CONTACT_LIMITS.name),
        evidence: z.string().trim().min(1).max(CONTACT_LIMITS.evidence),
      })
      .strict()
      .optional(),
    status: z.enum(STATUS_IDS),
    note: z.string().max(CONTACT_LIMITS.note),
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .strict()

export type Contact = z.infer<typeof contactSchema>

export const RELATIONSHIP_KINDS = {
  'direct-connection': { label: 'Direct connection', strength: 5 },
  'former-colleague': { label: 'Former colleague', strength: 4 },
  alumni: { label: 'Alumni', strength: 2.5 },
  'mutual-connection': { label: 'Mutual connection', strength: 2.5 },
  recruiter: { label: 'Recruiter', strength: 1.5 },
  'hiring-team': { label: 'Engineering team', strength: 1 },
  cold: { label: 'No shared context', strength: 0 },
} as const

export type RelationshipKind = keyof typeof RELATIONSHIP_KINDS
export type Confidence = 'verified' | 'inferred' | 'unknown'

export interface Relationship {
  kind: RelationshipKind
  confidence: Confidence
  /** Plain-language evidence shown next to the label. */
  evidence: string
}

const norm = (s: string) =>
  s
    .toLowerCase()
    .replace(/\b(inc|ltd|llc|pvt|private|limited|technologies|technology|corp|corporation|india|co)\b\.?/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()

const overlap = (a: readonly string[], b: readonly string[]) => {
  const bs = new Map(b.map((x) => [norm(x), x]))
  return a.filter((x) => norm(x) && bs.has(norm(x)))
}

const RECRUITER = /\b(recruit(er|ing|ment)?|talent|sourc(er|ing)|hr\b|people partner|hiring partner)/i
const ENGINEERING = /\b(engineer(ing)?|developer|sde|swe|architect|tech lead|cto|vp engineering|engineering manager)\b/i

/**
 * Every relationship the recorded facts support, strongest first. Never returns a relationship
 * without evidence; `cold` is returned when nothing is shared.
 */
export function relationshipsOf(c: Contact, profile: CandidateProfile | null): Relationship[] {
  const out: Relationship[] = []
  if (c.knowsPersonally) out.push({ kind: 'direct-connection', confidence: 'verified', evidence: 'You confirmed you know them' })

  const mine = [...(profile?.pastEmployers ?? []), ...(profile?.currentCompany ? [profile.currentCompany] : [])]
  const sharedCos = overlap(c.pastCompanies.concat(c.company), mine)
  if (sharedCos.length) {
    out.push({
      kind: 'former-colleague',
      confidence: c.workedTogether ? 'verified' : 'inferred',
      evidence: c.workedTogether
        ? `You confirmed you worked together (${sharedCos.join(', ')})`
        : `Both list ${sharedCos.join(', ')}; dates and teams not checked`,
    })
  }

  const sharedSchools = overlap(c.schools, profile?.schools ?? [])
  if (sharedSchools.length) {
    out.push({ kind: 'alumni', confidence: 'inferred', evidence: `Both list ${sharedSchools.join(', ')}` })
  }

  if (c.mutual) {
    out.push({ kind: 'mutual-connection', confidence: 'inferred', evidence: `Via ${c.mutual.name}: ${c.mutual.evidence}` })
  }

  if (c.role && RECRUITER.test(c.role)) {
    out.push({ kind: 'recruiter', confidence: 'inferred', evidence: `Role: ${c.role}` })
  } else if (c.role && ENGINEERING.test(c.role)) {
    out.push({ kind: 'hiring-team', confidence: 'inferred', evidence: `Role: ${c.role}` })
  }

  if (!out.length) out.push({ kind: 'cold', confidence: 'unknown', evidence: 'No shared employer, school or introducer recorded' })
  return out.sort((a, b) => RELATIONSHIP_KINDS[b.kind].strength - RELATIONSHIP_KINDS[a.kind].strength)
}

export interface LeadRank {
  score: number
  reasons: string[]
  primary: Relationship
}

export interface CompanyFocus {
  /** Companies with shortlisted or active applications. */
  pipeline: Set<string>
  targetCompanies: Set<string>
}

/** Rank by genuine shared context plus relevance to the user's pipeline and target roles. */
export function rankLead(c: Contact, profile: CandidateProfile | null, focus: CompanyFocus): LeadRank {
  const rels = relationshipsOf(c, profile)
  const primary = rels[0]
  const confFactor = (r: Relationship) => (r.confidence === 'verified' ? 1 : r.confidence === 'inferred' ? 0.7 : 0)
  let score = rels.reduce((a, r) => a + RELATIONSHIP_KINDS[r.kind].strength * confFactor(r), 0)
  const reasons: string[] = []
  const co = norm(c.company)
  if ([...focus.pipeline].some((x) => norm(x) === co)) {
    score += 3
    reasons.push('Company is in your pipeline')
  } else if ([...focus.targetCompanies].some((x) => norm(x) === co)) {
    score += 1.5
    reasons.push('Target company')
  }
  if (c.role && profile) {
    const mine = familiesOf([...profile.targetRoles, profile.currentTitle ?? ''].join(' | '))
    const theirs = familiesOf(c.role)
    if (mine.some((f) => theirs.includes(f))) {
      score += 1
      reasons.push(`Works in ${theirs.find((f) => mine.includes(f))}`)
    }
  }
  if (c.status === 'known') score += 0.5
  if (c.status === 'dismissed') score = -1
  return { score: Math.round(score * 10) / 10, reasons, primary }
}

export function newContactId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `c-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

/** Public search helpers. They only build URLs the user opens themselves; nothing is fetched. */
export function searchLinks(company: string, roleHint = 'software engineer'): Array<{ label: string; url: string }> {
  const q = encodeURIComponent
  return [
    {
      label: 'LinkedIn people search',
      url: `https://www.linkedin.com/search/results/people/?keywords=${q(`${company} ${roleHint}`)}`,
    },
    {
      label: 'Web search (public profiles)',
      url: `https://duckduckgo.com/?q=${q(`site:linkedin.com/in "${company}" "${roleHint}"`)}`,
    },
    {
      label: 'Web search (company engineering blog / talks)',
      url: `https://duckduckgo.com/?q=${q(`"${company}" engineering blog author`)}`,
    },
  ]
}
