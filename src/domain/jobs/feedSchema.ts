import { z } from 'zod'

/**
 * Public job feed contract, shared by the GitHub Actions collector (writer) and the
 * browser app (reader). It contains ONLY facts from public job postings, never
 * anything about the candidate.
 */
export const FEED_FORMAT_VERSION = 1

export const ATS_KINDS = ['greenhouse', 'lever', 'ashby'] as const
export type AtsKind = (typeof ATS_KINDS)[number]

export const CITY_VALUES = ['Bengaluru', 'Hyderabad', 'Pune', 'Mumbai', 'Chennai', 'Delhi NCR', 'Other India'] as const
export type City = (typeof CITY_VALUES)[number]

export const JOB_WORK_MODES = ['onsite', 'hybrid', 'remote', 'unknown'] as const
export type JobWorkMode = (typeof JOB_WORK_MODES)[number]

export const jobSchema = z.object({
  /** Stable id: `${ats}:${board}:${sourceId}`. */
  id: z.string().min(1),
  sourceKey: z.string().min(1),
  ats: z.enum(ATS_KINDS),
  sourceId: z.string().min(1),
  company: z.string().min(1),
  title: z.string().min(1),
  /** Location strings exactly as published (for display). */
  locations: z.array(z.string()),
  cities: z.array(z.enum(CITY_VALUES)),
  /** True when the posting explicitly offers remote work within India. */
  remoteIndia: z.boolean(),
  workMode: z.enum(JOB_WORK_MODES),
  department: z.string().optional(),
  employmentType: z.string().optional(),
  /** Plain-text description, truncated. */
  description: z.string(),
  /** Bullet points found under requirement/qualification headings. */
  requirements: z.array(z.string()),
  /** Subset of `requirements` the posting lists as preferred / nice to have. Absent in older feeds. */
  preferred: z.array(z.string()).optional(),
  /** Original posting URL on the company/ATS site. */
  url: z.string().url(),
  /** When the source says the job was published, if it says. */
  postedAt: z.string().optional(),
  /** When our collector first saw the job. */
  firstSeenAt: z.string(),
  /** Last scan that confirmed the job was still listed. */
  lastVerifiedAt: z.string(),
  status: z.enum(['open', 'closed']),
  closedAt: z.string().optional(),
})

export type Job = z.infer<typeof jobSchema>

export const sourceHealthSchema = z.object({
  key: z.string(),
  company: z.string(),
  ats: z.enum(ATS_KINDS),
  board: z.string(),
  status: z.enum(['ok', 'error']),
  /** Jobs on the board before our India/engineering filter. */
  totalListed: z.number().int().nonnegative(),
  /** Jobs kept after filtering. */
  kept: z.number().int().nonnegative(),
  lastAttemptAt: z.string(),
  lastSuccessAt: z.string().optional(),
  error: z.string().optional(),
  durationMs: z.number().nonnegative(),
})

export type SourceHealth = z.infer<typeof sourceHealthSchema>

export const feedSchema = z.object({
  formatVersion: z.literal(FEED_FORMAT_VERSION),
  generatedAt: z.string(),
  /** Last scan in which at least one source succeeded. */
  lastSuccessfulScanAt: z.string().optional(),
  /** Cities the collector was limited to. Absent or empty = anywhere in India. */
  cityScope: z.array(z.enum(CITY_VALUES)).optional(),
  jobs: z.array(jobSchema),
  sources: z.array(sourceHealthSchema),
})

export type JobFeed = z.infer<typeof feedSchema>

export const ATS_LABEL: Record<AtsKind, string> = {
  greenhouse: 'Greenhouse',
  lever: 'Lever',
  ashby: 'Ashby',
}
