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
}

export type ApplyPlan =
  | { ok: true; summary: string; next: JobAction | null }
  | { ok: false; reason: string }

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
