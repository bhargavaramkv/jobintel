import {
  isActiveStage,
  localDate,
  NOTE_MAX,
  refOf,
  STAGE_LABEL,
  stageOf,
  withDetails,
  withNote,
  withRejected,
  withStage,
  type JobAction,
  type JobRef,
} from '../jobs/actions'
import type { Job } from '../jobs/feedSchema'
import { contactSchema, type Contact } from '../referrals/contacts'
import type { StoredRecommendation } from './schema'

/**
 * Turns an ACCEPTED recommendation into at most one change to a job record, using the same pure
 * helpers the Jobs and Applications screens use. The record is re-read at this moment, so a
 * recommendation made last week can't overwrite a decision you made since: if the live state no
 * longer fits, it refuses with a reason and changes nothing.
 */

export interface ApplyContext {
  actions: ReadonlyMap<string, JobAction>
  jobs: ReadonlyMap<string, Job>
  now: Date
  /** Referral leads, for `add-lead` de-duplication. */
  contacts?: ReadonlyMap<string, Contact>
  /** Id generator for new leads (injected so planning stays pure in tests). */
  newId?: () => string
}

export type ApplyPlan =
  | { ok: true; summary: string; next: JobAction | null; contact?: Contact }
  | { ok: false; reason: string }

const normName = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
const normUrl = (s: string) => s.toLowerCase().replace(/[?#].*$/, '').replace(/\/+$/, '')
/** Pipeline order; `rejected` (by the company) can follow any active stage. */
const STAGE_RANK: Record<string, number> = { shortlisted: 0, 'referral-requested': 1, referred: 2, applied: 3, interview: 4, offer: 5, rejected: 5 }

const refuse = (reason: string): ApplyPlan => ({ ok: false, reason })

function refFor(jobId: string, ctx: ApplyContext): { ref: JobRef; job?: Job } | null {
  const job = ctx.jobs.get(jobId)
  if (job) return { ref: refOf(job), job }
  const existing = ctx.actions.get(jobId)
  return existing ? { ref: { jobId, snapshot: existing.snapshot } } : null
}

export function planApply(rec: StoredRecommendation, ctx: ApplyContext): ApplyPlan {
  const { action } = rec
  if (action.type === 'none') return { ok: true, summary: 'Acknowledged. No records were changed.', next: null }

  if (action.type === 'add-lead') {
    const existing = [...(ctx.contacts?.values() ?? [])]
    const urls = new Set(existing.flatMap((c) => [c.sourceUrl, c.profileUrl].filter((u): u is string => !!u).map(normUrl)))
    if (urls.has(normUrl(action.sourceUrl)) || (action.profileUrl && urls.has(normUrl(action.profileUrl)))) {
      return refuse('You already have a lead with this link.')
    }
    if (existing.some((c) => normName(c.name) === normName(action.name) && normName(c.company) === normName(action.company))) {
      return refuse(`You already have ${action.name} at ${action.company} as a lead.`)
    }
    const at = ctx.now.toISOString()
    const parsed = contactSchema.safeParse({
      id: (ctx.newId ?? (() => `ai-${ctx.now.getTime().toString(36)}`))(),
      name: action.name,
      company: action.company,
      ...(action.role ? { role: action.role } : {}),
      ...(action.profileUrl ? { profileUrl: action.profileUrl } : {}),
      sourceUrl: action.sourceUrl,
      pastCompanies: [],
      schools: [],
      // Never asserted by AI: the user confirms relationships themselves.
      knowsPersonally: false,
      workedTogether: false,
      status: 'new',
      note: `Suggested by AI: ${action.reason}`.slice(0, 1000),
      createdAt: at,
      updatedAt: at,
    })
    if (!parsed.success) return refuse('The suggested lead is not valid.')
    return { ok: true, summary: `Added ${action.name} (${action.company}) as a referral lead.`, next: null, contact: parsed.data }
  }

  const jobId = rec.jobId
  if (!jobId) return refuse('The recommendation names no job.')
  const found = refFor(jobId, ctx)
  if (!found) return refuse('That job is no longer in the feed or your records, so nothing can be changed.')
  const { ref, job } = found
  const existing = ctx.actions.get(jobId)
  const stage = stageOf(existing)
  const label = `${ref.snapshot.title} at ${ref.snapshot.company}`

  switch (action.type) {
    case 'shortlist': {
      if (job && job.status !== 'open') return refuse('This posting has closed.')
      if (stage) return refuse(`Already in your pipeline (${STAGE_LABEL[stage]}).`)
      if (existing?.decision === 'rejected') return refuse('You marked this Not interested. Undo that first if you changed your mind.')
      return {
        ok: true,
        summary: `Shortlisted ${label}.`,
        next: withStage(ref, existing, 'shortlisted', ctx.now, 'Suggested by an AI recommendation'),
      }
    }
    case 'not-interested': {
      if (stage) return refuse(`This job is in your pipeline (${STAGE_LABEL[stage]}); move it out of the pipeline first.`)
      if (existing?.decision === 'rejected') return refuse('Already marked Not interested.')
      return { ok: true, summary: `Marked ${label} Not interested.`, next: withRejected(ref, existing, [...action.reasons], ctx.now) }
    }
    case 'add-note': {
      const stamped = `AI suggestion (${localDate(ctx.now)}): ${action.note}`
      const current = existing?.note.trim() ?? ''
      const combined = current ? `${current}\n\n${stamped}` : stamped
      if (combined.length > NOTE_MAX) return refuse('Adding this would make the note longer than the allowed length.')
      return { ok: true, summary: `Added a note to ${label}.`, next: withNote(ref, existing, combined, ctx.now) }
    }
    case 'set-stage': {
      if (stage === action.stage) return refuse(`Already at ${STAGE_LABEL[stage]}.`)
      if (stage && !isActiveStage(stage)) return refuse(`This application is closed (${STAGE_LABEL[stage]}).`)
      if (existing?.decision === 'rejected' && !stage) return refuse('You marked this Not interested.')
      if (stage && STAGE_RANK[action.stage] <= STAGE_RANK[stage]) {
        return refuse(`That would move it backwards (from ${STAGE_LABEL[stage]} to ${STAGE_LABEL[action.stage]}).`)
      }
      return {
        ok: true,
        summary: `Moved ${label} to ${STAGE_LABEL[action.stage]}.`,
        next: withStage(ref, existing, action.stage, ctx.now, action.note ?? 'From an AI-detected update'),
      }
    }
    case 'set-follow-up': {
      if (!existing || !isActiveStage(stage)) return refuse('Follow-ups can only be set on a job in your active pipeline.')
      if (action.followUpOn < localDate(ctx.now)) return refuse(`The suggested date (${action.followUpOn}) is already in the past.`)
      // withDetails deletes keys that are present but empty, so only pass what is being set.
      const details = { followUpOn: action.followUpOn, ...(action.nextAction ? { nextAction: action.nextAction } : {}) }
      return {
        ok: true,
        summary: `Set a follow-up for ${label} on ${action.followUpOn}.`,
        next: withDetails(existing, details, ctx.now),
      }
    }
  }
}
