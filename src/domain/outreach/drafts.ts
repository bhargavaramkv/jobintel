import type { CandidateProfile } from '../profile/schema'
import type { Contact, Relationship } from '../referrals/contacts'

/**
 * Outreach drafts (Phase 5), generated from templates in the browser. A draft uses ONLY facts
 * already recorded: the lead, the derived relationships with their evidence, the job snapshot
 * and the user's own profile. It never invents familiarity, and nothing is ever sent: the user
 * copies the text and sends it themselves.
 */

export const CHANNELS = [
  { id: 'linkedin-note', label: 'LinkedIn connection note', limit: 300 },
  { id: 'linkedin-message', label: 'LinkedIn message', limit: 1900 },
  { id: 'email', label: 'Email', limit: 5000 },
] as const
export type Channel = (typeof CHANNELS)[number]['id']

export const TONES = [
  { id: 'concise', label: 'Concise' },
  { id: 'warm', label: 'Warm' },
  { id: 'formal', label: 'Formal' },
] as const
export type Tone = (typeof TONES)[number]['id']

export type StrategyId = 'direct' | 'colleague' | 'shared-employer' | 'alumni' | 'mutual' | 'recruiter' | 'advice'

export interface Strategy {
  id: StrategyId
  label: string
  /** Whether a referral may be asked for directly in the first message. */
  asksReferral: boolean
  why: string
}

export const STRATEGIES: Record<StrategyId, Omit<Strategy, 'id'>> = {
  direct: { label: 'Direct connection: ask for a referral', asksReferral: true, why: 'You confirmed you know them.' },
  colleague: { label: 'Former colleague: ask for a referral', asksReferral: true, why: 'You confirmed you worked together.' },
  'shared-employer': {
    label: 'Shared employer: ask for advice first',
    asksReferral: false,
    why: 'You both list the same company, but you haven’t confirmed working together. Ask about the team before asking for a referral.',
  },
  alumni: {
    label: 'Alumni: ask for advice first',
    asksReferral: false,
    why: 'A shared college is a reason to reach out, not a relationship. Ask for perspective first.',
  },
  mutual: {
    label: 'Mutual connection: mention the introducer',
    asksReferral: false,
    why: 'Mention the person you both know only because you recorded evidence for it. Ask for a short conversation.',
  },
  recruiter: { label: 'Recruiter: point to the role', asksReferral: false, why: 'Recruiters want a clear role and a short fit summary.' },
  advice: {
    label: 'No shared context: ask for advice, not a referral',
    asksReferral: false,
    why: 'Cold referral asks rarely work and can feel pushy. A specific question about the team is more respectful.',
  },
}

export function strategyFor(rels: readonly Relationship[]): Strategy {
  const has = (k: Relationship['kind'], c?: Relationship['confidence']) => rels.some((r) => r.kind === k && (!c || r.confidence === c))
  const id: StrategyId = has('direct-connection')
    ? 'direct'
    : has('former-colleague', 'verified')
      ? 'colleague'
      : has('former-colleague')
        ? 'shared-employer'
        : has('mutual-connection')
          ? 'mutual'
          : has('alumni')
            ? 'alumni'
            : has('recruiter')
              ? 'recruiter'
              : 'advice'
  return { id, ...STRATEGIES[id] }
}

/** Strategies the recorded facts can support. A user may pick a softer approach, never an unsupported one. */
export function allowedStrategies(rels: readonly Relationship[]): StrategyId[] {
  const out = new Set<StrategyId>([strategyFor(rels).id])
  for (const r of rels) {
    if (r.kind === 'direct-connection') out.add('direct')
    if (r.kind === 'former-colleague') out.add(r.confidence === 'verified' ? 'colleague' : 'shared-employer')
    if (r.kind === 'former-colleague' && r.confidence === 'verified') out.add('shared-employer')
    if (r.kind === 'alumni') out.add('alumni')
    if (r.kind === 'mutual-connection') out.add('mutual')
    if (r.kind === 'recruiter') out.add('recruiter')
  }
  out.add('advice')
  const order: StrategyId[] = ['direct', 'colleague', 'shared-employer', 'mutual', 'alumni', 'recruiter', 'advice']
  return order.filter((s) => out.has(s))
}

export interface DraftJob {
  title: string
  company: string
  url: string
}

export interface DraftInput {
  lead: Contact
  rels: readonly Relationship[]
  profile: CandidateProfile | null
  job?: DraftJob
  /** Skills the posting asks for that the profile lists (from the match engine). */
  matchedSkills?: string[]
  channel: Channel
  tone: Tone
  strategy?: StrategyId
}

export interface Draft {
  subject?: string
  body: string
  strategy: Strategy
  /** Every fact the draft relies on, so the user can check it. */
  usedFacts: string[]
  /** Things to check or fill in before sending. */
  warnings: string[]
}

const firstName = (name: string) => name.trim().split(/\s+/)[0]

function greeting(tone: Tone, name: string) {
  return tone === 'formal' ? `Dear ${name},` : tone === 'warm' ? `Hi ${firstName(name)},` : `Hi ${firstName(name)},`
}

function signOff(tone: Tone, profile: CandidateProfile | null) {
  const me = profile?.displayName?.trim()
  const line = tone === 'formal' ? 'Kind regards,' : tone === 'warm' ? 'Thanks so much,' : 'Thanks,'
  return me ? `${line}\n${me}` : line
}

function aboutMe(profile: CandidateProfile | null, matched: string[], facts: string[]): string | null {
  if (!profile) return null
  const parts: string[] = []
  if (profile.currentTitle) {
    const at = profile.currentCompany ? ` at ${profile.currentCompany}` : ''
    const yrs = profile.yearsExperience !== undefined ? ` with ${trimYears(profile.yearsExperience)} of experience` : ''
    parts.push(`I'm a ${profile.currentTitle}${at}${yrs}`)
    facts.push(`Your profile: ${profile.currentTitle}${at}${yrs}`)
  }
  const skills = matched.length ? matched.slice(0, 3) : profile.primarySkills.slice(0, 3).map((s) => s.name)
  if (skills.length) {
    parts.push(`${parts.length ? 'working mostly with' : 'I work mostly with'} ${list(skills)}`)
    facts.push(matched.length ? `Skills you share with the posting: ${list(skills)}` : `Your primary skills: ${list(skills)}`)
  }
  return parts.length ? parts.join(', ') + '.' : null
}

const trimYears = (y: number) => `${y} year${y === 1 ? '' : 's'}`
const list = (xs: string[]) => (xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`)

function contextLine(strategy: StrategyId, input: DraftInput, facts: string[]): string | null {
  const { lead, rels } = input
  const rel = (k: Relationship['kind']) => rels.find((r) => r.kind === k)
  switch (strategy) {
    case 'direct':
      facts.push('You confirmed you know them')
      return null
    case 'colleague': {
      const r = rel('former-colleague')!
      facts.push(r.evidence)
      return `It's been a while since we worked together${r.detail ? ` at ${r.detail}` : ''}.`
    }
    case 'shared-employer': {
      const r = rel('former-colleague')!
      facts.push(r.evidence)
      return r.detail ? `I noticed we've both worked at ${r.detail}.` : null
    }
    case 'alumni': {
      const r = rel('alumni')!
      facts.push(r.evidence)
      return `I saw that we both studied at ${r.detail}.`
    }
    case 'mutual': {
      const m = lead.mutual!
      facts.push(`Mutual connection: ${m.name} (${m.evidence})`)
      return `I saw we're both connected with ${m.name}.`
    }
    case 'recruiter':
      facts.push(`Their role: ${lead.role}`)
      return null
    default:
      if (lead.role) facts.push(`Their role: ${lead.role}`)
      return lead.role ? `I came across your work as ${withArticle(lead.role)} at ${lead.company}.` : `I came across your work at ${lead.company}.`
  }
}

const withArticle = (role: string) => (/^[aeiou]/i.test(role) ? `an ${role}` : `a ${role}`)

function askLine(strategy: Strategy, input: DraftInput): string {
  const { job, lead } = input
  const role = job ? `the ${job.title} role` : `engineering roles at ${lead.company}`
  if (strategy.id === 'recruiter') {
    return job
      ? `I'd like to be considered for the ${job.title} role. Would you be the right person to talk to, or could you point me to them?`
      : `Are you hiring for engineering roles that might fit this background? I'd be glad to share my resume.`
  }
  if (strategy.asksReferral) {
    return job
      ? `I'm applying for ${role} and would be grateful if you'd consider referring me, if you're comfortable doing so. Happy to send my resume and a short summary.`
      : `I'm looking at ${role}. Would you be open to referring me if a suitable opening comes up?`
  }
  return job
    ? `I'm interested in ${role}. Could I ask you a couple of questions about the team and what they look for? Even a short reply would help.`
    : `Could I ask you a couple of questions about engineering at ${lead.company}? Even a short reply would help.`
}

export function generateDraft(input: DraftInput): Draft {
  // An override is honoured only when the facts support it.
  const chosen = input.strategy && allowedStrategies(input.rels).includes(input.strategy) ? input.strategy : undefined
  const strategy = chosen ? { id: chosen, ...STRATEGIES[chosen] } : strategyFor(input.rels)
  const facts: string[] = [`${input.lead.name}, ${input.lead.role ? `${input.lead.role} at ` : ''}${input.lead.company}`]
  const warnings: string[] = []
  if (input.job) facts.push(`Job: ${input.job.title} at ${input.job.company} (${input.job.url})`)

  const ctx = contextLine(strategy.id, input, facts)
  const me = aboutMe(input.profile, input.matchedSkills ?? [], facts)
  if (!me) warnings.push('Add your current title and skills to your profile so the draft can say who you are.')
  const ask = askLine(strategy, input)
  const { channel, tone } = input

  let body: string
  if (channel === 'linkedin-note') {
    // Connection notes are short: context + one-line ask.
    const shortAsk = strategy.asksReferral
      ? input.job
        ? `I'm applying for the ${input.job.title} role and would value a referral if you're comfortable.`
        : `I'd value your advice on roles at ${input.lead.company}.`
      : input.job
        ? `I'm interested in the ${input.job.title} role and would value a quick word about the team.`
        : `I'd value a quick word about engineering at ${input.lead.company}.`
    body = [`Hi ${firstName(input.lead.name)},`, ctx, shortAsk, tone === 'formal' ? 'Thank you.' : 'Thanks!'].filter(Boolean).join(' ')
  } else {
    const paras = [
      greeting(tone, input.lead.name),
      [ctx, me].filter(Boolean).join(' '),
      ask,
      input.job ? `Job link: ${input.job.url}` : null,
      tone === 'warm' ? 'No worries at all if now isn’t a good time.' : tone === 'formal' ? 'I understand if you are not able to help.' : null,
      signOff(tone, input.profile),
    ]
    body = paras.filter(Boolean).join('\n\n')
  }

  const limit = CHANNELS.find((c) => c.id === channel)!.limit
  if (body.length > limit) warnings.push(`Longer than the ${limit}-character limit for this channel. Shorten it before sending.`)
  if (!strategy.asksReferral && strategy.id !== 'recruiter') warnings.push('This draft asks for advice, not a referral. That suits the context you have.')

  const subject =
    channel === 'email'
      ? input.job
        ? `${strategy.asksReferral ? 'Referral request' : 'Question'}: ${input.job.title} at ${input.job.company}`
        : `Quick question about engineering at ${input.lead.company}`
      : undefined

  return { subject, body, strategy, usedFacts: facts, warnings }
}

// ---------- follow-ups ----------

export const FOLLOW_UP_AFTER_DAYS = 7
export const MAX_FOLLOW_UPS = 2

export interface FollowUpState {
  /** Date (YYYY-MM-DD) the next follow-up is due, or null when none should be sent. */
  dueOn: string | null
  /** Plain explanation. */
  reason: string
  sentCount: number
}

/**
 * Follow-up policy: at most two follow-ups, a week apart, and none after a reply.
 * `sent` are the dates (YYYY-MM-DD) messages were sent to this person, oldest first.
 */
export function followUpState(sent: readonly string[], replied: boolean): FollowUpState {
  if (sent.length === 0) return { dueOn: null, reason: 'Nothing sent yet', sentCount: 0 }
  if (replied) return { dueOn: null, reason: 'They replied: continue the conversation, no follow-up needed', sentCount: sent.length }
  const followUps = sent.length - 1
  if (followUps >= MAX_FOLLOW_UPS)
    return { dueOn: null, reason: `No reply after ${MAX_FOLLOW_UPS} follow-ups. Stop here; don’t send more.`, sentCount: sent.length }
  const last = sent[sent.length - 1]
  return { dueOn: addDays(last, FOLLOW_UP_AFTER_DAYS), reason: `Follow-up ${followUps + 1} of ${MAX_FOLLOW_UPS}`, sentCount: sent.length }
}

export function addDays(isoDay: string, days: number): string {
  const [y, m, d] = isoDay.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d + days))
  return dt.toISOString().slice(0, 10)
}

export function followUpDraft(lead: Contact, n: number, tone: Tone, job?: DraftJob): string {
  const about = job ? `the ${job.title} role` : `engineering at ${lead.company}`
  const lines =
    n <= 1
      ? [`Hi ${firstName(lead.name)},`, `Following up on my note about ${about}, in case it got buried. Any pointer would help.`, tone === 'formal' ? 'Thank you for your time.' : 'Thanks!']
      : [`Hi ${firstName(lead.name)},`, `One last follow-up on ${about}. I won't message again on this; thanks for considering it.`]
  return lines.join('\n\n')
}
