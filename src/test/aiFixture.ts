import { storedIdOf } from '../domain/ai/import'
import type { StoredBriefing, StoredRecommendation } from '../domain/ai/schema'

/** Synthetic AI results for tests. Companies and people are placeholders. */
export const CONTEXT_ID = 'ctx-test-1'
export const NOW = new Date('2026-11-03T08:00:00.000Z')

export function rawRecommendation(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'fit-acme-1',
    kind: 'job-fit',
    title: 'Shortlist the Acme backend role',
    summary: 'Strong skills overlap and the location fits.',
    jobId: 'greenhouse:acme:1',
    priority: 'high',
    confidence: 0.72,
    evidence: [{ source: 'match', ref: 'greenhouse:acme:1', detail: 'Skills factor 0.8, 2 of 2 required skills matched' }],
    caveats: ['Compensation is not stated'],
    action: { type: 'shortlist' },
    ...overrides,
  }
}

export function rawResult(overrides: Record<string, unknown> = {}, recommendations: unknown[] = [rawRecommendation()]): Record<string, unknown> {
  return {
    format: 'jobintel-ai-result',
    schemaVersion: 1,
    contextId: CONTEXT_ID,
    generatedAt: '2026-11-03T07:30:00.000Z',
    generator: { name: 'Claude', model: 'test-model' },
    recommendations,
    briefing: {
      date: '2026-11-03',
      headline: 'One strong new fit and one follow-up due',
      summary: 'Focus on the Acme role first.',
      priorities: [
        {
          title: 'Shortlist Acme',
          detail: 'Best deterministic match this week.',
          jobId: 'greenhouse:acme:1',
          recommendationId: 'fit-acme-1',
          confidence: 0.7,
          evidence: [{ source: 'match', detail: 'Score 82' }],
        },
      ],
      watchouts: [],
    },
    ...overrides,
  }
}

export const json = (value: unknown) => JSON.stringify(value)

export function storedRec(overrides: Partial<StoredRecommendation> = {}): StoredRecommendation {
  return {
    id: storedIdOf(CONTEXT_ID, 'fit-acme-1'),
    contextId: CONTEXT_ID,
    kind: 'job-fit',
    title: 'Shortlist the Acme backend role',
    summary: 'Strong skills overlap.',
    jobId: 'greenhouse:acme:1',
    priority: 'high',
    confidence: 0.72,
    evidence: [{ source: 'match', detail: 'Score 82' }],
    caveats: [],
    action: { type: 'shortlist' },
    generatedAt: '2026-11-03T07:30:00.000Z',
    status: 'generated',
    importedAt: '2026-11-03T08:00:00.000Z',
    ...overrides,
  }
}

export function storedBriefing(overrides: Partial<StoredBriefing> = {}): StoredBriefing {
  return {
    id: CONTEXT_ID,
    date: '2026-11-03',
    headline: 'Focus on Acme',
    summary: 'One strong fit.',
    priorities: [],
    watchouts: [],
    generatedAt: '2026-11-03T07:30:00.000Z',
    importedAt: '2026-11-03T08:00:00.000Z',
    ...overrides,
  }
}
