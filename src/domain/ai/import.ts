import type { z } from 'zod'
import {
  AI_LIMITS,
  AI_RESULT_FORMAT,
  AI_SCHEMA_VERSION,
  aiEnvelopeSchema,
  briefingSchema,
  recommendationSchema,
  type Briefing,
  type Recommendation,
  type StoredBriefing,
  type StoredRecommendation,
} from './schema.ts'

/**
 * Turns the text a model returned into validated, typed data, or a precise reason it can't.
 * Never throws and never touches storage. Pure.
 */

export interface RejectedItem {
  /** Position in the result's `recommendations` array. */
  index: number
  id?: string
  messages: string[]
}

export interface ParsedAiResult {
  contextId: string
  generatedAt: string
  generator?: { name: string; model?: string }
  recommendations: Recommendation[]
  rejected: RejectedItem[]
  briefing?: Briefing
  briefingIssues: string[]
}

export type ParseOutcome = { ok: true; value: ParsedAiResult } | { ok: false; error: string }

const fail = (error: string): ParseOutcome => ({ ok: false, error })

function describe(issues: readonly z.core.$ZodIssue[], max = 4): string[] {
  const out = issues.slice(0, max).map((i) => `${i.path.length ? i.path.join('.') : '(item)'}: ${i.message}`)
  if (issues.length > max) out.push(`…and ${issues.length - max} more`)
  return out
}

/** Models often wrap JSON in a markdown fence or add a sentence around it. Pull the object out. */
export function extractJson(raw: string): string {
  const text = raw.replace(/^﻿/, '').trim()
  const fenced = /```(?:json)?\s*([\s\S]*?)```/i.exec(text)
  if (fenced) return fenced[1].trim()
  if (text.startsWith('{')) return text
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  return start >= 0 && end > start ? text.slice(start, end + 1) : text
}

export function parseAiResult(raw: string): ParseOutcome {
  if (!raw.trim()) return fail('Nothing to import: the text is empty.')
  if (raw.length > AI_LIMITS.resultChars) return fail('This is too large to be an AI result (over 1 MB).')

  let json: unknown
  try {
    json = JSON.parse(extractJson(raw))
  } catch {
    return fail('This is not valid JSON. Ask the model to reply with only the JSON object.')
  }
  if (typeof json !== 'object' || json === null || Array.isArray(json)) return fail('Expected a JSON object.')

  const head = json as { format?: unknown; schemaVersion?: unknown }
  if (head.format !== AI_RESULT_FORMAT) {
    return fail(`This is not a JobIntel AI result (expected format "${AI_RESULT_FORMAT}").`)
  }
  if (typeof head.schemaVersion !== 'number' || !Number.isInteger(head.schemaVersion) || head.schemaVersion < 1) {
    return fail('The result has no valid schemaVersion.')
  }
  if (head.schemaVersion > AI_SCHEMA_VERSION) {
    return fail(`This result uses schema version ${head.schemaVersion}, but this app understands version ${AI_SCHEMA_VERSION}. Update JobIntel and try again.`)
  }

  const envelope = aiEnvelopeSchema.safeParse(json)
  if (!envelope.success) return fail(`The result is malformed. ${describe(envelope.error.issues).join('; ')}`)
  const e = envelope.data

  const recommendations: Recommendation[] = []
  const rejected: RejectedItem[] = []
  const seen = new Set<string>()
  e.recommendations.forEach((item, index) => {
    const maybeId = typeof item === 'object' && item !== null ? (item as { id?: unknown }).id : undefined
    const id = typeof maybeId === 'string' ? maybeId : undefined
    if (index >= AI_LIMITS.recommendations) {
      rejected.push({ index, id, messages: [`more than ${AI_LIMITS.recommendations} recommendations; extras are ignored`] })
      return
    }
    const parsed = recommendationSchema.safeParse(item)
    if (!parsed.success) {
      rejected.push({ index, id, messages: describe(parsed.error.issues) })
      return
    }
    if (seen.has(parsed.data.id)) {
      rejected.push({ index, id: parsed.data.id, messages: ['id: duplicate of an earlier recommendation in this result'] })
      return
    }
    seen.add(parsed.data.id)
    recommendations.push(parsed.data)
  })

  let briefing: Briefing | undefined
  let briefingIssues: string[] = []
  if (e.briefing !== undefined) {
    const b = briefingSchema.safeParse(e.briefing)
    if (b.success) {
      briefing = b.data
      const ids = new Set(recommendations.map((r) => r.id))
      const dangling = b.data.priorities.filter((p) => p.recommendationId && !ids.has(p.recommendationId))
      if (dangling.length) briefingIssues = [`${dangling.length} briefing priority(ies) point to recommendations that were not imported`]
    } else {
      briefingIssues = describe(b.error.issues)
    }
  }

  return {
    ok: true,
    value: {
      contextId: e.contextId,
      generatedAt: e.generatedAt,
      ...(e.generator ? { generator: e.generator } : {}),
      recommendations,
      rejected,
      ...(briefing ? { briefing } : {}),
      briefingIssues,
    },
  }
}

// ---- Checks against local data (shown in the import preview, never silently fixed) ---------

export interface LocalFacts {
  /** Context ids this browser exported (the consent log). */
  knownContextIds: ReadonlySet<string>
  /** Job ids that exist in the feed or in the user's records. */
  knownJobIds: ReadonlySet<string>
  /** Stored recommendation ids, to skip re-imports. */
  existingIds: ReadonlySet<string>
  now: Date
}

export const STALE_RESULT_DAYS = 14

export interface ImportReview {
  /** The result answers an export that was not made in this browser. */
  unknownContext: boolean
  /** Whole days since the model produced it, if over the staleness limit. */
  staleDays?: number
  futureDated: boolean
  /** Recommendations whose jobId matches nothing local; they can't be applied. */
  unknownJobs: Array<{ id: string; jobId: string }>
  /** Already in the inbox from an earlier import of this same result. */
  alreadyImported: number
  fresh: Recommendation[]
}

export const storedIdOf = (contextId: string, id: string) => `${contextId}:${id}`

export function reviewImport(parsed: ParsedAiResult, local: LocalFacts): ImportReview {
  const generated = Date.parse(parsed.generatedAt)
  const ageDays = (local.now.getTime() - generated) / 86_400_000
  const fresh = parsed.recommendations.filter((r) => !local.existingIds.has(storedIdOf(parsed.contextId, r.id)))
  return {
    unknownContext: !local.knownContextIds.has(parsed.contextId),
    ...(ageDays > STALE_RESULT_DAYS ? { staleDays: Math.floor(ageDays) } : {}),
    futureDated: generated - local.now.getTime() > 5 * 60_000,
    unknownJobs: parsed.recommendations
      .filter((r) => r.jobId && !local.knownJobIds.has(r.jobId))
      .map((r) => ({ id: r.id, jobId: r.jobId! })),
    alreadyImported: parsed.recommendations.length - fresh.length,
    fresh,
  }
}

/** Stored form of the fresh recommendations. Every one starts as `generated`: nothing is applied. */
export function toStored(parsed: ParsedAiResult, fresh: readonly Recommendation[], now: Date): {
  recommendations: StoredRecommendation[]
  briefing?: StoredBriefing
} {
  const importedAt = now.toISOString()
  return {
    recommendations: fresh.map((r) => ({
      ...r,
      id: storedIdOf(parsed.contextId, r.id),
      contextId: parsed.contextId,
      generatedAt: parsed.generatedAt,
      ...(parsed.generator ? { generator: parsed.generator } : {}),
      status: 'generated' as const,
      importedAt,
    })),
    ...(parsed.briefing
      ? {
          briefing: {
            ...parsed.briefing,
            id: parsed.contextId,
            generatedAt: parsed.generatedAt,
            ...(parsed.generator ? { generator: parsed.generator } : {}),
            importedAt,
          },
        }
      : {}),
  }
}
