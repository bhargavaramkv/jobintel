import type { Priority, ReviewStatus, StoredRecommendation } from './schema'

/**
 * Review lifecycle of an imported recommendation:
 *
 *   generated ──► reviewed ──► accepted   (terminal: the change, if any, is already in your records)
 *       │            │
 *       └────────────┴──────► rejected ──► reviewed   (you can reconsider a rejection)
 *
 * `generated` means "imported, not yet looked at". Only `accepted` can have changed a record.
 */
export const STATUS_LABEL: Record<ReviewStatus, string> = {
  generated: 'Generated',
  reviewed: 'Reviewed',
  accepted: 'Accepted',
  rejected: 'Rejected',
}

export const STATUS_HINT: Record<ReviewStatus, string> = {
  generated: 'Imported from the AI result. Nothing has been applied.',
  reviewed: 'You have looked at it. Nothing has been applied.',
  accepted: 'You accepted it.',
  rejected: 'You rejected it. Nothing was applied.',
}

const ALLOWED: Record<ReviewStatus, readonly ReviewStatus[]> = {
  generated: ['reviewed', 'accepted', 'rejected'],
  reviewed: ['accepted', 'rejected'],
  accepted: [],
  rejected: ['reviewed'],
}

export const canTransition = (from: ReviewStatus, to: ReviewStatus) => ALLOWED[from].includes(to)

/** A pending recommendation still needs a decision. */
export const isPending = (s: ReviewStatus) => s === 'generated' || s === 'reviewed'

export function withStatus(rec: StoredRecommendation, to: ReviewStatus, now: Date, outcome?: string): StoredRecommendation {
  if (!canTransition(rec.status, to)) {
    throw new Error(`A ${STATUS_LABEL[rec.status].toLowerCase()} recommendation cannot become ${STATUS_LABEL[to].toLowerCase()}.`)
  }
  const at = now.toISOString()
  const next: StoredRecommendation = { ...rec, status: to }
  if (to === 'reviewed') {
    next.reviewedAt = at
    delete next.decidedAt
    delete next.outcome
  } else {
    next.reviewedAt = rec.reviewedAt ?? at
    next.decidedAt = at
    if (outcome) next.outcome = outcome.slice(0, 400)
  }
  return next
}

const PRIORITY_RANK: Record<Priority, number> = { high: 0, medium: 1, low: 2 }

/** Pending first, then by priority, confidence and recency. Decided items sink to the bottom. */
export function sortInbox(recs: Iterable<StoredRecommendation>): StoredRecommendation[] {
  return [...recs].sort(
    (a, b) =>
      Number(!isPending(a.status)) - Number(!isPending(b.status)) ||
      PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] ||
      b.confidence - a.confidence ||
      b.importedAt.localeCompare(a.importedAt),
  )
}

export function countByStatus(recs: Iterable<StoredRecommendation>): Record<ReviewStatus, number> {
  const out: Record<ReviewStatus, number> = { generated: 0, reviewed: 0, accepted: 0, rejected: 0 }
  for (const r of recs) out[r.status]++
  return out
}

/** Latest briefing by the day it is for, then by import time. */
export function latestBriefing<T extends { date: string; importedAt: string }>(items: Iterable<T>): T | undefined {
  return [...items].sort((a, b) => b.date.localeCompare(a.date) || b.importedAt.localeCompare(a.importedAt))[0]
}
