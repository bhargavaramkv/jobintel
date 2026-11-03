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
export const SNAPSHOT_SOURCES = [...ATS_KINDS, 'manual'] as const

export const jobSnapshotSchema = z.object({
  title: z.string(),
  company: z.string(),
  url: z.string(),
  /** 'manual' = an application the user added for a job outside the feed. */
  ats: z.enum(SNAPSHOT_SOURCES),
  cities: z.array(z.enum(CITY_VALUES)),
  locations: z.array(z.string()),
  department: z.string().optional(),
})

export type JobSnapshot = z.infer<typeof jobSnapshotSchema>

export const NOTE_MAX = 4000
export const SHORT_MAX = 300

/**
 * Application lifecycle (Phase 6). Shortlisting (Phase 3) is the first stage.
 * `rejected` here means the company declined, unlike the "Not interested" decision.
 */
export const STAGES = [
  { id: 'shortlisted', label: 'Shortlisted', active: true },
  { id: 'referral-requested', label: 'Referral requested', active: true },
  { id: 'referred', label: 'Referred', active: true },
  { id: 'applied', label: 'Applied', active: true },
  { id: 'interview', label: 'Interviewing', active: true },
  { id: 'offer', label: 'Offer', active: false },
  { id: 'rejected', label: 'Rejected by company', active: false },
  { id: 'withdrawn', label: 'Withdrawn', active: false },
] as const

export type Stage = (typeof STAGES)[number]['id']
const STAGE_IDS = STAGES.map((s) => s.id) as [Stage, ...Stage[]]
export const STAGE_LABEL = Object.fromEntries(STAGES.map((s) => [s.id, s.label])) as Record<Stage, string>
export const isActiveStage = (s: Stage | undefined) => !!s && STAGES.find((x) => x.id === s)!.active
/** Stages that mean an application was actually submitted. */
export const SUBMITTED_STAGES: readonly Stage[] = ['applied', 'interview', 'offer', 'rejected']

const isoDay = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)

export const stageEventSchema = z
  .object({
    stage: z.enum(STAGE_IDS),
    /** ISO timestamp of the change. */
    at: z.string(),
    note: z.string().max(SHORT_MAX).optional(),
  })
  .strict()

export type StageEvent = z.infer<typeof stageEventSchema>

export const INTERVIEW_KINDS = ['recruiter screen', 'technical', 'system design', 'hiring manager', 'take-home', 'onsite / loop', 'HR', 'other'] as const

export const interviewSchema = z
  .object({
    id: z.string().min(1),
    on: isoDay,
    kind: z.enum(INTERVIEW_KINDS),
    note: z.string().max(SHORT_MAX).optional(),
    outcome: z.enum(['pending', 'passed', 'failed']).optional(),
  })
  .strict()

export type Interview = z.infer<typeof interviewSchema>

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
    /** Current application stage, if the job is in the pipeline. */
    stage: z.enum(STAGE_IDS).optional(),
    /** Every stage change, oldest first. Never rewritten. */
    history: z.array(stageEventSchema).optional(),
    interviews: z.array(interviewSchema).optional(),
    nextAction: z.string().max(SHORT_MAX).optional(),
    followUpOn: isoDay.optional(),
    /** Label of the resume version used (the file itself stays on the user's device). */
    resumeVersion: z.string().max(120).optional(),
    /** Referral contacts linked to this application (ids in the contacts store). */
    contactIds: z.array(z.string()).optional(),
    /** Rejection / feedback notes from the company. */
    feedback: z.string().max(NOTE_MAX).optional(),
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

/** Current stage; legacy "applied" records without a stage count as Applied. */
export function stageOf(a: JobAction | undefined): Stage | undefined {
  if (!a) return undefined
  return a.stage ?? (a.decision === 'applied' ? 'applied' : undefined)
}

const pushHistory = (a: JobAction, stage: Stage, now: Date, note?: string): StageEvent[] => [
  ...(a.history ?? []),
  { stage, at: now.toISOString(), ...(note?.trim() ? { note: note.trim().slice(0, SHORT_MAX) } : {}) },
]

export function withApplied(ref: JobRef, existing: JobAction | undefined, now = new Date(), on = localDate(now)): JobAction {
  const b = base(ref, existing, now)
  const current = stageOf(existing)
  // Don't move a later stage (e.g. Interviewing) back to Applied.
  const keep = current && SUBMITTED_STAGES.includes(current) && current !== 'applied'
  return {
    ...b,
    decision: 'applied',
    appliedOn: on,
    rejectReasons: [],
    stage: keep ? current : 'applied',
    history: keep || current === 'applied' ? b.history : pushHistory(b, 'applied', now),
    updatedAt: now.toISOString(),
  }
}

/**
 * Move a job to a pipeline stage, recording history. Reaching a submitted stage marks the job
 * applied; going back to an earlier stage keeps the applied date the user already set.
 */
export function withStage(ref: JobRef, existing: JobAction | undefined, stage: Stage, now = new Date(), note?: string): JobAction {
  const b = base(ref, existing, now)
  if (stageOf(existing) === stage && !note?.trim()) return b
  const submitted = SUBMITTED_STAGES.includes(stage)
  const next: JobAction = {
    ...b,
    stage,
    history: pushHistory(b, stage, now, note),
    rejectReasons: [],
    updatedAt: now.toISOString(),
  }
  if (submitted) {
    next.decision = 'applied'
    next.appliedOn = b.appliedOn ?? localDate(now)
  } else if (b.decision === 'rejected') {
    delete next.decision
  }
  return next
}

export function withRejected(ref: JobRef, existing: JobAction | undefined, reasons: RejectReason[], now = new Date()): JobAction {
  const { appliedOn: _drop, stage: _s, ...rest } = base(ref, existing, now)
  void _drop
  void _s
  return { ...rest, decision: 'rejected', rejectReasons: [...new Set(reasons)], updatedAt: now.toISOString() }
}

export type ApplicationDetails = Partial<
  Pick<JobAction, 'nextAction' | 'followUpOn' | 'resumeVersion' | 'feedback' | 'contactIds' | 'interviews'>
>

/** Update the free-form application fields (Phase 6). Empty values are removed. */
export function withDetails(
  existing: JobAction,
  details: ApplicationDetails,
  now = new Date(),
): JobAction {
  const next: JobAction = { ...existing, updatedAt: now.toISOString() }
  for (const [k, v] of Object.entries(details) as Array<[keyof typeof details, unknown]>) {
    const empty = v === undefined || v === '' || (Array.isArray(v) && v.length === 0)
    if (empty) delete next[k]
    else (next as Record<string, unknown>)[k] = typeof v === 'string' ? v.trim() : v
  }
  return next
}

/** True when the record carries anything worth keeping. */
export function hasContent(a: JobAction): boolean {
  return !!(a.decision || a.stage || a.note.trim() || a.history?.length || a.nextAction || a.followUpOn || a.interviews?.length || a.feedback)
}


export function withNote(ref: JobRef, existing: JobAction | undefined, note: string, now = new Date()): JobAction {
  return { ...base(ref, existing, now), note: note.slice(0, NOTE_MAX), updatedAt: now.toISOString() }
}

export function withAppliedOn(existing: JobAction, on: string, now = new Date()): JobAction {
  return { ...existing, appliedOn: on, updatedAt: now.toISOString() }
}

/** Remove the decision and stage but keep the note. Returns null when nothing is left to store. */
export function withoutDecision(existing: JobAction, now = new Date()): JobAction | null {
  if (!existing.note.trim()) return null
  const { decision: _d, appliedOn: _a, stage: _s, ...rest } = existing
  void _d
  void _a
  void _s
  return { ...rest, rejectReasons: [], updatedAt: now.toISOString() }
}

/** Remove only the pipeline stage (e.g. un-shortlist). Returns null when nothing is left. */
export function withoutStage(existing: JobAction, now = new Date()): JobAction | null {
  if (existing.decision === 'applied') return withoutDecision(existing, now)
  const { stage: _s, ...rest } = existing
  void _s
  const next = { ...rest, updatedAt: now.toISOString() }
  return next.decision || next.note.trim() ? next : null
}