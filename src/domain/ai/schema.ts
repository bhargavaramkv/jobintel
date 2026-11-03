import { z } from 'zod'
import { REJECT_REASONS, type RejectReason } from '../jobs/actions.ts'

/**
 * AI recommendation contract (versioned).
 *
 * Claude (or any model) is asked to produce ONE JSON object matching `aiResultSchema`. Nothing
 * it says touches the user's records directly: the object is validated here, previewed, imported
 * into the recommendation inbox as `generated`, and only changes a record after the user accepts it.
 *
 * To change the contract: add a new schema version, keep parsing the old one, and never loosen
 * a limit silently.
 */
export const AI_SCHEMA_VERSION = 1
export const AI_RESULT_FORMAT = 'jobintel-ai-result' as const
export const AI_CONTEXT_FORMAT = 'jobintel-ai-context' as const

export const AI_LIMITS = {
  recommendations: 25,
  evidence: 8,
  caveats: 5,
  priorities: 7,
  watchouts: 5,
  /** Whole pasted/uploaded result, in characters. */
  resultChars: 1_000_000,
  /** Confidence ceiling when no evidence comes from the exported data itself. */
  externalOnlyConfidence: 0.5,
} as const

const isoDay = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use a YYYY-MM-DD date')
const isoTimestamp = z.string().refine((s) => !Number.isNaN(Date.parse(s)), 'Use an ISO-8601 timestamp')
const text = (max: number) => z.string().trim().min(1).max(max)
/** Stable, URL-safe handle chosen by the model; used to de-duplicate re-imports. */
const slug = z.string().regex(/^[a-z0-9][a-z0-9-]{0,63}$/, 'Use lowercase letters, digits and hyphens (max 64)')
const confidence = z.number().min(0).max(1)

export const EVIDENCE_SOURCES = ['profile', 'job', 'match', 'application', 'referral', 'external'] as const
export type EvidenceSource = (typeof EVIDENCE_SOURCES)[number]

/** One fact the recommendation rests on, quoted from the exported data (or flagged `external`). */
export const evidenceSchema = z
  .object({
    source: z.enum(EVIDENCE_SOURCES),
    /** Where in the export: a jobId, a field name, a contactId. */
    ref: z.string().trim().max(200).optional(),
    detail: text(400),
  })
  .strict()
export type Evidence = z.infer<typeof evidenceSchema>

const REASON_IDS = REJECT_REASONS.map((r) => r.id) as [RejectReason, ...RejectReason[]]

/**
 * The ONLY changes a recommendation may propose. Each maps to one existing, reversible operation
 * on a job record and is re-checked against the live record when the user accepts it.
 * Deliberately absent: submitting applications, sending messages, editing the profile, deleting.
 */
export const ACTION_TYPES = ['none', 'shortlist', 'not-interested', 'add-note', 'set-follow-up'] as const
export type ActionType = (typeof ACTION_TYPES)[number]

export const proposedActionSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('none') }).strict(),
  z.object({ type: z.literal('shortlist') }).strict(),
  z
    .object({
      type: z.literal('not-interested'),
      reasons: z.array(z.enum(REASON_IDS)).min(1).max(3),
    })
    .strict(),
  z.object({ type: z.literal('add-note'), note: text(500) }).strict(),
  z
    .object({
      type: z.literal('set-follow-up'),
      followUpOn: isoDay,
      nextAction: text(300).optional(),
    })
    .strict(),
])
export type ProposedAction = z.infer<typeof proposedActionSchema>

export const RECOMMENDATION_KINDS = [
  { id: 'job-fit', label: 'Job fit' },
  { id: 'next-action', label: 'Next action' },
  { id: 'follow-up', label: 'Follow-up' },
  { id: 'insight', label: 'Insight' },
] as const
export type RecommendationKind = (typeof RECOMMENDATION_KINDS)[number]['id']
const KIND_IDS = RECOMMENDATION_KINDS.map((k) => k.id) as [RecommendationKind, ...RecommendationKind[]]

export const PRIORITIES = ['high', 'medium', 'low'] as const
export type Priority = (typeof PRIORITIES)[number]

const recommendationShape = {
  id: slug,
  kind: z.enum(KIND_IDS),
  title: text(120),
  summary: text(600),
  /** The job this is about. Required for `job-fit` and for any action other than `none`. */
  jobId: z.string().trim().min(1).max(200).optional(),
  priority: z.enum(PRIORITIES),
  confidence,
  evidence: z.array(evidenceSchema).min(1, 'Add at least one piece of evidence').max(AI_LIMITS.evidence),
  caveats: z.array(text(300)).max(AI_LIMITS.caveats).default([]),
  action: proposedActionSchema.default({ type: 'none' }),
}

type Checkable = {
  kind: RecommendationKind
  jobId?: string | undefined
  confidence: number
  evidence: Evidence[]
  action: ProposedAction
}

/** Cross-field rules shared by the incoming and the stored form of a recommendation. */
export function refineRecommendation(r: Checkable, ctx: z.RefinementCtx): void {
  if ((r.kind === 'job-fit' || r.action.type !== 'none') && !r.jobId) {
    ctx.addIssue({ code: 'custom', path: ['jobId'], message: 'A job-fit recommendation or a proposed change needs a jobId' })
  }
  // Grounding: a claim that rests only on outside knowledge cannot be highly confident.
  if (r.evidence.every((e) => e.source === 'external') && r.confidence > AI_LIMITS.externalOnlyConfidence) {
    ctx.addIssue({
      code: 'custom',
      path: ['confidence'],
      message: `Evidence that is all "external" caps confidence at ${AI_LIMITS.externalOnlyConfidence}`,
    })
  }
}

export const recommendationSchema = z.object(recommendationShape).strict().superRefine(refineRecommendation)
export type Recommendation = z.infer<typeof recommendationSchema>

export const briefingPrioritySchema = z
  .object({
    title: text(120),
    detail: text(400),
    jobId: z.string().trim().min(1).max(200).optional(),
    /** The `id` of a recommendation in the same result, if this priority comes from one. */
    recommendationId: slug.optional(),
    confidence,
    evidence: z.array(evidenceSchema).min(1).max(AI_LIMITS.evidence),
  })
  .strict()

const briefingShape = {
  /** The day the briefing is for (the export's `asOf`). */
  date: isoDay,
  headline: text(200),
  summary: text(1000),
  priorities: z.array(briefingPrioritySchema).max(AI_LIMITS.priorities),
  watchouts: z.array(text(300)).max(AI_LIMITS.watchouts).default([]),
}

export const briefingSchema = z.object(briefingShape).strict()
export type Briefing = z.infer<typeof briefingSchema>

export const generatorSchema = z.object({ name: text(80), model: text(80).optional() }).strict()

/**
 * The envelope. `recommendations` and `briefing` are declared loosely here so that ONE bad item
 * never discards the rest; `parseAiResult` validates each item against its own schema.
 */
export const aiEnvelopeSchema = z
  .object({
    format: z.literal(AI_RESULT_FORMAT),
    schemaVersion: z.number().int(),
    /** Must echo the `contextId` of the export the model analysed. */
    contextId: text(80),
    generatedAt: isoTimestamp,
    generator: generatorSchema.optional(),
    recommendations: z.array(z.unknown()),
    briefing: z.unknown().optional(),
  })
  .strict()

/** The strict, fully-typed result. Also the source of the JSON Schema handed to the model. */
export const aiResultSchema = z
  .object({
    format: z.literal(AI_RESULT_FORMAT),
    schemaVersion: z.literal(AI_SCHEMA_VERSION),
    contextId: text(80),
    generatedAt: isoTimestamp,
    generator: generatorSchema.optional(),
    recommendations: z.array(recommendationSchema).max(AI_LIMITS.recommendations),
    briefing: briefingSchema.optional(),
  })
  .strict()
export type AiResult = z.infer<typeof aiResultSchema>

/** JSON Schema for the model. Cross-field rules are described in the export's instructions. */
export function aiResultJsonSchema(): unknown {
  return z.toJSONSchema(aiResultSchema, { io: 'input', unrepresentable: 'any' })
}

// ---- Stored forms (IndexedDB + backups) ----------------------------------------------------

export const REVIEW_STATUSES = ['generated', 'reviewed', 'accepted', 'rejected'] as const
export type ReviewStatus = (typeof REVIEW_STATUSES)[number]

/** An imported recommendation plus its review lifecycle. `id` is `${contextId}:${model id}`. */
export const storedRecommendationSchema = z
  .object({
    ...recommendationShape,
    id: z.string().min(1).max(200),
    contextId: z.string().min(1).max(80),
    /** When the model says it produced the result. */
    generatedAt: isoTimestamp,
    generator: generatorSchema.optional(),
    status: z.enum(REVIEW_STATUSES),
    importedAt: isoTimestamp,
    reviewedAt: isoTimestamp.optional(),
    decidedAt: isoTimestamp.optional(),
    /** What accepting changed in the user's records, in plain language. */
    outcome: z.string().max(400).optional(),
  })
  .strict()
  .superRefine(refineRecommendation)
export type StoredRecommendation = z.infer<typeof storedRecommendationSchema>

export const storedBriefingSchema = z
  .object({
    ...briefingShape,
    id: z.string().min(1).max(80),
    generatedAt: isoTimestamp,
    generator: generatorSchema.optional(),
    importedAt: isoTimestamp,
  })
  .strict()
export type StoredBriefing = z.infer<typeof storedBriefingSchema>

/**
 * Audit log of what was exported and when. Holds counts and switches only, never candidate data,
 * so it is safe to keep and to include in backups.
 */
export const exportRecordSchema = z
  .object({
    id: z.string().min(1).max(80),
    createdAt: isoTimestamp,
    includes: z
      .object({
        profile: z.boolean(),
        identity: z.boolean(),
        compensation: z.boolean(),
        pipeline: z.boolean(),
        applications: z.boolean(),
        notes: z.boolean(),
        referrals: z.boolean(),
        referralNames: z.boolean(),
        topMatches: z.number().int().min(0).max(50),
      })
      .strict(),
    counts: z
      .object({
        pipelineJobs: z.number().int().min(0),
        topMatches: z.number().int().min(0),
        applications: z.number().int().min(0),
        referrals: z.number().int().min(0),
      })
      .strict(),
    bytes: z.number().int().min(0),
  })
  .strict()
export type ExportRecord = z.infer<typeof exportRecordSchema>
