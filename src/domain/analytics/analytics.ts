import { daysBetween } from '../applications/pipeline'
import { stageOf, type JobAction, type Stage } from '../jobs/actions'
import type { Job } from '../jobs/feedSchema'
import { matchJob } from '../match/score'
import type { OutreachMessage } from '../outreach/messages'
import type { CandidateProfile } from '../profile/schema'
import { relationshipsOf, type Contact } from '../referrals/contacts'

/**
 * Analytics (Phase 8), computed in the browser from the user's own records. Every number
 * carries the ids of the records behind it so the UI can show them. No benchmarks, no
 * outside data.
 */

export interface Metric {
  id: string
  label: string
  value: number
  /** Record ids (job ids, contact ids or message ids) the value was counted from. */
  ids: string[]
  hint?: string
}

/** Below this many records, a rate is shown with a small-sample warning. */
export const SMALL_SAMPLE = 5

/** Stages a record has ever reached: its history, plus its current stage. */
export function stagesReached(a: JobAction): Set<Stage> {
  const s = new Set<Stage>((a.history ?? []).map((h) => h.stage))
  const now = stageOf(a)
  if (now) s.add(now)
  if (a.decision === 'applied') s.add('applied')
  return s
}

const RESPONSE_STAGES: readonly Stage[] = ['interview', 'offer', 'rejected']

export interface FunnelStep extends Metric {
  /** Share of the previous step (0..1), when that step is non-zero. */
  conversion: number | null
}

export function funnel(actions: JobAction[], openFeedJobs: number): FunnelStep[] {
  const reached = (st: Stage) => actions.filter((a) => a.decision !== 'rejected' && stagesReached(a).has(st)).map((a) => a.jobId)
  const pipeline = actions.filter((a) => a.decision !== 'rejected' && stagesReached(a).size > 0).map((a) => a.jobId)
  const steps: Array<Omit<FunnelStep, 'conversion'>> = [
    { id: 'discovered', label: 'Open jobs in feed', value: openFeedJobs, ids: [], hint: 'Public feed, all companies' },
    { id: 'pipeline', label: 'Shortlisted or applied', value: pipeline.length, ids: pipeline },
    { id: 'applied', label: 'Applied', value: 0, ids: reached('applied') },
    { id: 'responded', label: 'Company responded', value: 0, ids: [], hint: 'Interview, offer or rejection' },
    { id: 'interview', label: 'Interviewed', value: 0, ids: reached('interview') },
    { id: 'offer', label: 'Offer', value: 0, ids: reached('offer') },
  ]
  const responded = actions.filter((a) => a.decision !== 'rejected' && RESPONSE_STAGES.some((s) => stagesReached(a).has(s))).map((a) => a.jobId)
  steps[3].ids = responded
  for (const s of steps) if (s.id !== 'discovered') s.value = s.ids.length
  return steps.map((s, i) => {
    const prev = steps[i - 1]
    return { ...s, conversion: i > 1 && prev.value > 0 ? s.value / prev.value : null }
  })
}

export interface OutreachStats {
  sent: Metric
  people: Metric
  replies: Metric
  referralRequests: Metric
  referred: Metric
  recruiterReplies: Metric
  replyRate: number | null
}

export function outreachStats(actions: JobAction[], contacts: Contact[], messages: OutreachMessage[], profile: CandidateProfile | null): OutreachStats {
  const sent = messages.filter((m) => m.status === 'sent')
  const peopleIds = [...new Set(sent.map((m) => m.contactId))]
  const repliedPeople = [...new Set(messages.filter((m) => m.repliedOn).map((m) => m.contactId))]
  const byId = new Map(contacts.map((c) => [c.id, c]))
  const recruiterReplies = repliedPeople.filter((id) => {
    const c = byId.get(id)
    return c && relationshipsOf(c, profile).some((r) => r.kind === 'recruiter')
  })
  const reqs = actions.filter((a) => stagesReached(a).has('referral-requested')).map((a) => a.jobId)
  const referred = actions.filter((a) => stagesReached(a).has('referred')).map((a) => a.jobId)
  return {
    sent: { id: 'sent', label: 'Messages sent', value: sent.length, ids: sent.map((m) => m.id) },
    people: { id: 'people', label: 'People contacted', value: peopleIds.length, ids: peopleIds },
    replies: { id: 'replies', label: 'People who replied', value: repliedPeople.length, ids: repliedPeople },
    referralRequests: { id: 'referral-requests', label: 'Referral requests', value: reqs.length, ids: reqs },
    referred: { id: 'referred', label: 'Confirmed referrals', value: referred.length, ids: referred },
    recruiterReplies: { id: 'recruiter-replies', label: 'Recruiter replies', value: recruiterReplies.length, ids: recruiterReplies },
    replyRate: peopleIds.length ? repliedPeople.length / peopleIds.length : null,
  }
}

export interface CompanyRow {
  company: string
  applied: number
  responded: number
  interviews: number
  offers: number
  rejections: number
  responseRate: number | null
  ids: string[]
}

export function byCompany(actions: JobAction[]): CompanyRow[] {
  const m = new Map<string, JobAction[]>()
  for (const a of actions) {
    if (a.decision === 'rejected' || !stagesReached(a).has('applied')) continue
    const k = a.snapshot.company
    m.set(k, [...(m.get(k) ?? []), a])
  }
  return [...m.entries()]
    .map(([company, xs]) => {
      const has = (s: Stage) => xs.filter((a) => stagesReached(a).has(s)).length
      const responded = xs.filter((a) => RESPONSE_STAGES.some((s) => stagesReached(a).has(s))).length
      return {
        company,
        applied: xs.length,
        responded,
        interviews: has('interview'),
        offers: has('offer'),
        rejections: has('rejected'),
        responseRate: xs.length ? responded / xs.length : null,
        ids: xs.map((a) => a.jobId),
      }
    })
    .sort((a, b) => b.applied - a.applied || a.company.localeCompare(b.company))
}

export interface ResponseTimes {
  /** Days from applying to the first company response, per application. */
  samples: Array<{ jobId: string; days: number }>
  median: number | null
  /** Applied with no response yet, and how long they've waited. */
  waiting: Array<{ jobId: string; days: number }>
}

export function responseTimes(actions: JobAction[], today: string): ResponseTimes {
  const samples: ResponseTimes['samples'] = []
  const waiting: ResponseTimes['waiting'] = []
  for (const a of actions) {
    if (a.decision === 'rejected' || !a.appliedOn) continue
    const first = (a.history ?? []).find((h) => RESPONSE_STAGES.includes(h.stage))
    if (first) samples.push({ jobId: a.jobId, days: Math.max(0, daysBetween(a.appliedOn, first.at.slice(0, 10))) })
    else if (stageOf(a) === 'applied') waiting.push({ jobId: a.jobId, days: daysBetween(a.appliedOn, today) })
  }
  const sorted = samples.map((s) => s.days).sort((x, y) => x - y)
  const median = sorted.length ? (sorted.length % 2 ? sorted[(sorted.length - 1) / 2] : (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2) : null
  return { samples, median, waiting: waiting.sort((a, b) => b.days - a.days) }
}

export interface SkillGap {
  skill: string
  /** Relevant jobs that list it as required. */
  jobIds: string[]
  share: number
}

/**
 * Required skills missing from the profile, counted across RELEVANT jobs: jobs in the pipeline
 * that are still in the feed, plus open jobs with at least a partial fit.
 */
export function skillGaps(feedJobs: Job[], actions: JobAction[], profile: CandidateProfile | null, targets: number[]): { gaps: SkillGap[]; relevant: number } {
  if (!profile || profile.primarySkills.length + profile.secondarySkills.length === 0) return { gaps: [], relevant: 0 }
  const inPipeline = new Set(actions.filter((a) => a.decision !== 'rejected' && stagesReached(a).size > 0).map((a) => a.jobId))
  const relevant = feedJobs
    .map((j) => ({ j, m: matchJob(j, profile, targets) }))
    .filter(({ j, m }) => inPipeline.has(j.id) || (j.status === 'open' && (m.band === 'partial' || m.band === 'good' || m.band === 'strong')))
  const count = new Map<string, string[]>()
  for (const { j, m } of relevant) for (const s of m.gaps.mandatory) count.set(s, [...(count.get(s) ?? []), j.id])
  const gaps = [...count.entries()]
    .map(([skill, jobIds]) => ({ skill, jobIds, share: relevant.length ? jobIds.length / relevant.length : 0 }))
    .sort((a, b) => b.jobIds.length - a.jobIds.length || a.skill.localeCompare(b.skill))
  return { gaps, relevant: relevant.length }
}

export interface Recommendation {
  text: string
  evidence: string
  /** 'correlation' findings compare groups of your records; they don't prove cause. */
  basis: 'rule' | 'correlation'
  ids: string[]
}

export function recommendations(input: {
  actions: JobAction[]
  funnel: FunnelStep[]
  outreach: OutreachStats
  gaps: { gaps: SkillGap[]; relevant: number }
  times: ResponseTimes
  today: string
}): Recommendation[] {
  const out: Recommendation[] = []
  const { actions, outreach, gaps, times, today } = input
  const applied = actions.filter((a) => a.decision !== 'rejected' && stagesReached(a).has('applied'))

  // Shortlist going stale.
  const staleShortlist = actions.filter(
    (a) => stageOf(a) === 'shortlisted' && a.decision !== 'rejected' && daysBetween(a.updatedAt.slice(0, 10), today) >= 7,
  )
  if (staleShortlist.length)
    out.push({
      text: `Act on or clear ${staleShortlist.length} shortlisted job${staleShortlist.length > 1 ? 's' : ''} untouched for a week or more.`,
      evidence: 'Shortlisted with no change for 7+ days.',
      basis: 'rule',
      ids: staleShortlist.map((a) => a.jobId),
    })

  // Referred vs not referred response rates (correlation, needs enough of each).
  const referred = applied.filter((a) => stagesReached(a).has('referred'))
  const cold = applied.filter((a) => !stagesReached(a).has('referred'))
  const rate = (xs: JobAction[]) => xs.filter((a) => RESPONSE_STAGES.some((s) => stagesReached(a).has(s))).length / xs.length
  if (referred.length >= SMALL_SAMPLE && cold.length >= SMALL_SAMPLE) {
    const r1 = rate(referred)
    const r0 = rate(cold)
    if (Math.abs(r1 - r0) >= 0.15)
      out.push({
        text: r1 > r0 ? 'Referred applications got responses more often. Prioritise referrals for roles you care about.' : 'Referred applications did not get more responses than direct ones in your records.',
        evidence: `Response rate ${pct(r1)} with a referral (${referred.length}) vs ${pct(r0)} without (${cold.length}). This is a correlation in your own records, not proof that referrals caused it.`,
        basis: 'correlation',
        ids: [...referred, ...cold].map((a) => a.jobId),
      })
  }

  // Repeated skill gap.
  const top = gaps.gaps[0]
  if (top && gaps.relevant >= 3 && top.jobIds.length >= 3 && top.share >= 0.3)
    out.push({
      text: `${top.skill} is required in ${top.jobIds.length} of ${gaps.relevant} relevant jobs and isn't in your profile. If you have it, add it; if not, it's the most common gap to close.`,
      evidence: 'Counted from required-skill bullets of jobs in your pipeline and open jobs with at least a partial fit.',
      basis: 'rule',
      ids: top.jobIds,
    })

  // Outreach reply rate.
  if (outreach.people.value >= SMALL_SAMPLE && (outreach.replyRate ?? 0) < 0.2)
    out.push({
      text: 'Few people replied to your outreach. Try advice-first messages with a specific question, and prefer people you share real context with.',
      evidence: `${outreach.replies.value} of ${outreach.people.value} people replied (${pct(outreach.replyRate ?? 0)}).`,
      basis: 'rule',
      ids: outreach.people.ids,
    })

  // Long silence after applying.
  const longWait = times.waiting.filter((w) => w.days >= 14)
  if (longWait.length)
    out.push({
      text: `${longWait.length} application${longWait.length > 1 ? 's have' : ' has'} had no response for 2+ weeks. A short follow-up or a referral may help; otherwise move on.`,
      evidence: 'Applied, no interview/offer/rejection recorded, 14+ days.',
      basis: 'rule',
      ids: longWait.map((w) => w.jobId),
    })

  if (applied.length < SMALL_SAMPLE)
    out.push({
      text: 'Keep recording outcomes. With fewer than 5 applications, rates swing a lot and patterns may be noise.',
      evidence: `${applied.length} application${applied.length === 1 ? '' : 's'} recorded so far.`,
      basis: 'rule',
      ids: applied.map((a) => a.jobId),
    })
  return out
}

export const pct = (x: number) => `${Math.round(x * 100)}%`

/** CSV export of the per-application records analytics uses (user-initiated download only). */
export function applicationsCsv(actions: JobAction[]): string {
  const esc = (v: string | number | undefined) => {
    const s = v === undefined ? '' : String(v)
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const rows = actions
    .filter((a) => a.decision !== 'rejected' && stagesReached(a).size > 0)
    .map((a) => [a.snapshot.company, a.snapshot.title, stageOf(a) ?? '', a.appliedOn ?? '', (a.history ?? []).map((h) => `${h.at.slice(0, 10)}:${h.stage}`).join(' '), a.snapshot.url])
  return [['company', 'title', 'stage', 'applied_on', 'history', 'url'], ...rows].map((r) => r.map(esc).join(',')).join('\n') + '\n'
}
