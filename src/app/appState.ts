import { z } from 'zod'
import type { Job } from '../domain/jobs/feedSchema'
import { candidateProfileSchema, type CandidateProfile } from '../domain/profile/schema'
import { readStored } from './storage-local'

export const TRACK_STATUSES = ['saved', 'applied', 'interview', 'offer', 'rejected'] as const
export type TrackStatus = (typeof TRACK_STATUSES)[number]

export const TRACK_STATUS_LABEL: Record<TrackStatus, string> = {
  saved: 'Saved',
  applied: 'Applied',
  interview: 'Interview',
  offer: 'Offer',
  rejected: 'Rejected',
}

export const MAX_NOTES = 2000
export const DEFAULT_MIN_SCORE = 50

const resumeSchema = z.object({
  name: z.string().min(1),
  size: z.number().nonnegative(),
  uploadedAt: z.string().min(1),
  tex: z.string(),
})

/** A job the user chose to track. Title, company and link are copied so the row survives the job leaving the feed. */
const trackedSchema = z.object({
  jobId: z.string().min(1),
  title: z.string().min(1),
  company: z.string().min(1),
  url: z.string(),
  trackedAt: z.string().min(1),
  status: z.enum(TRACK_STATUSES),
  notes: z.string().max(MAX_NOTES),
})

const prefsSchema = z.object({ minScore: z.number().int().min(0).max(100) })

export type StoredResume = z.infer<typeof resumeSchema>
export type TrackedJob = z.infer<typeof trackedSchema>
export type Prefs = z.infer<typeof prefsSchema>

/** Everything the app keeps in this browser, under a single localStorage key. */
export interface StoredState {
  profile: CandidateProfile | null
  resume: StoredResume | null
  tracked: TrackedJob[]
  prefs: Prefs
}

export const emptyState = (): StoredState => ({
  profile: null,
  resume: null,
  tracked: [],
  prefs: { minScore: DEFAULT_MIN_SCORE },
})

/** Reads the saved state. Each part is validated on its own, so one bad part never drops the rest. */
export function loadState(): StoredState {
  const raw = readStored()
  const state = emptyState()
  if (!raw || typeof raw !== 'object') return state
  const r = raw as Record<string, unknown>
  const profile = candidateProfileSchema.safeParse(r.profile)
  if (profile.success) state.profile = profile.data
  const resume = resumeSchema.safeParse(r.resume)
  if (resume.success) state.resume = resume.data
  if (Array.isArray(r.tracked)) {
    const seen = new Set<string>()
    for (const item of r.tracked) {
      const t = trackedSchema.safeParse(item)
      if (t.success && !seen.has(t.data.jobId)) {
        seen.add(t.data.jobId)
        state.tracked.push(t.data)
      }
    }
  }
  const prefs = prefsSchema.safeParse(r.prefs)
  if (prefs.success) state.prefs = prefs.data
  return state
}

export function trackedFromJob(job: Pick<Job, 'id' | 'title' | 'company' | 'url'>, now: Date = new Date()): TrackedJob {
  return { jobId: job.id, title: job.title, company: job.company, url: job.url, trackedAt: now.toISOString(), status: 'saved', notes: '' }
}
