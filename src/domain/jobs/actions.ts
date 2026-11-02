import { z } from 'zod'
import { ATS_KINDS, CITY_VALUES, type Job } from './feedSchema.ts'

/**
 * The user's private decisions about jobs. Stored only in this browser (IndexedDB),
 * included in encrypted backups, never published.
 */
export const REJECT_REASONS = [
  { id: 'too-senior', label: 'Too senior' },
  { id: 'too-junior', label: 'Too junior' },
  { id: 'tech-stack', label: 'Wrong tech stack' },
  { id: 'role-type', label: 'Not my kind of role' },
  { id: 'company', label: 'Not interested in this company' },
  { id: 'location', label: 'Location / work mode' },
  { id: 'other', label: 'Other' },
] as const

export type RejectReason = (typeof REJECT_REASONS)[number]['id']
const REASON_IDS = REJECT_REASONS.map((r) => r.id) as [RejectReason, ...RejectReason[]]

export const DECISIONS = ['applied', 'rejected'] as const
export type Decision = (typeof DECISIONS)[number]

/** Enough of the posting to show the record after the job leaves the feed. */
export const jobSnapshotSchema = z.object({
  title: z.string(),
  company: z.string(),
  url: z.string(),
  ats: z.enum(ATS_KINDS),
  cities: z.array(z.enum(CITY_VALUES)),
  locations: z.array(z.string()),
  department: z.string().optional(),
})

export type JobSnapshot = z.infer<typeof jobSnapshotSchema>

export const NOTE_MAX = 4000

export const jobActionSchema = z
  .object({
    jobId: z.string().min(1),
    snapshot: jobSnapshotSchema,
    decision: z.enum(DECISIONS).optional(),
    /** Date the user applied (YYYY-MM-DD, local). */
    appliedOn: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
    rejectReasons: z.array(z.enum(REASON_IDS)),
    note: z.string().max(NOTE_MAX),
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .strict()

export type JobAction = z.infer<typeof jobActionSchema>

export function snapshotOf(job: Job): JobSnapshot {
  return {
    title: job.title,
    company: job.company,
    url: job.url,
    ats: job.ats,
    cities: job.cities,
    locations: job.locations,
    ...(job.department ? { department: job.department } : {}),
  }
}

export function localDate(d: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** What an action is about: a live feed job, or a stored record whose job left the feed. */
export type JobRef = { jobId: string; snapshot: JobSnapshot }

export const refOf = (job: Job): JobRef => ({ jobId: job.id, snapshot: snapshotOf(job) })

function base(ref: JobRef, existing: JobAction | undefined, now: Date): JobAction {
  const b = existing ?? {
    jobId: ref.jobId,
    snapshot: ref.snapshot,
    rejectReasons: [],
    note: '',
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  }
  // Refresh the snapshot so a re-titled posting stays current.
  return { ...b, snapshot: ref.snapshot }
}

export function withApplied(ref: JobRef, existing: JobAction | undefined, now = new Date(), on = localDate(now)): JobAction {
  return { ...base(ref, existing, now), decision: 'applied', appliedOn: on, rejectReasons: [], updatedAt: now.toISOString() }
}

export function withRejected(ref: JobRef, existing: JobAction | undefined, reasons: RejectReason[], now = new Date()): JobAction {
  const { appliedOn: _drop, ...rest } = base(ref, existing, now)
  void _drop
  return { ...rest, decision: 'rejected', rejectReasons: [...new Set(reasons)], updatedAt: now.toISOString() }
}

export function withNote(ref: JobRef, existing: JobAction | undefined, note: string, now = new Date()): JobAction {
  return { ...base(ref, existing, now), note: note.slice(0, NOTE_MAX), updatedAt: now.toISOString() }
}

export function withAppliedOn(existing: JobAction, on: string, now = new Date()): JobAction {
  return { ...existing, appliedOn: on, updatedAt: now.toISOString() }
}

/** Remove the decision but keep the note. Returns null when nothing is left to store. */
export function withoutDecision(existing: JobAction, now = new Date()): JobAction | null {
  if (!existing.note.trim()) return null
  const { decision: _d, appliedOn: _a, ...rest } = existing
  void _d
  void _a
  return { ...rest, rejectReasons: [], updatedAt: now.toISOString() }
}