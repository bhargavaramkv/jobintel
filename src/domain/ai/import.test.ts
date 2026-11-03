import { describe, expect, it } from 'vitest'
import { CONTEXT_ID, json, NOW, rawRecommendation, rawResult } from '../../test/aiFixture'
import { extractJson, parseAiResult, reviewImport, storedIdOf, toStored, type ParsedAiResult } from './import'
import {
  AI_LIMITS,
  AI_SCHEMA_VERSION,
  aiResultJsonSchema,
  aiResultSchema,
  recommendationSchema,
  storedBriefingSchema,
  storedRecommendationSchema,
} from './schema'

function ok(text: string): ParsedAiResult {
  const out = parseAiResult(text)
  if (!out.ok) throw new Error(`expected success, got: ${out.error}`)
  return out.value
}
function err(text: string): string {
  const out = parseAiResult(text)
  if (out.ok) throw new Error('expected a failure')
  return out.error
}

describe('AI result schema (version 1)', () => {
  it('accepts a well-formed result and applies defaults', () => {
    const r = ok(json(rawResult({}, [rawRecommendation({ caveats: undefined, action: undefined })])))
    expect(r.recommendations[0].caveats).toEqual([])
    expect(r.recommendations[0].action).toEqual({ type: 'none' })
    expect(aiResultSchema.safeParse(JSON.parse(json(rawResult()))).success).toBe(true)
  })

  it('is versioned', () => {
    expect(AI_SCHEMA_VERSION).toBe(2)
    expect(ok(json(rawResult({ schemaVersion: 1 }))).recommendations).toHaveLength(1) // v1 is still accepted
    expect(ok(json(rawResult({ schemaVersion: 2 }))).recommendations).toHaveLength(1)
    expect(err(json(rawResult({ schemaVersion: 3 })))).toMatch(/schema version 3.*understands version 2/)
    expect(err(json(rawResult({ schemaVersion: 0 })))).toMatch(/schemaVersion/)
    expect(err(json(rawResult({ schemaVersion: '1' })))).toMatch(/schemaVersion/)
  })

  it('publishes a JSON Schema for the model that names the format and every action', () => {
    const s = JSON.stringify(aiResultJsonSchema())
    for (const t of ['jobintel-ai-result', 'shortlist', 'not-interested', 'add-note', 'set-follow-up', 'confidence', 'evidence']) {
      expect(s).toContain(t)
    }
  })

  it.each([
    ['no evidence', { evidence: [] }, /evidence/],
    ['confidence above 1', { confidence: 1.2 }, /confidence/],
    ['confidence below 0', { confidence: -0.1 }, /confidence/],
    ['confidence as text', { confidence: 'high' }, /confidence/],
    ['unknown kind', { kind: 'miracle' }, /kind/],
    ['unknown priority', { priority: 'urgent' }, /priority/],
    ['bad id characters', { id: 'Has Spaces!' }, /id/],
    ['empty title', { title: '   ' }, /title/],
    ['overlong summary', { summary: 'x'.repeat(601) }, /summary/],
    ['job-fit without a job', { jobId: undefined }, /jobId/],
    ['an unexpected extra field', { sneaky: 'value' }, /sneaky|Unrecognized/i],
  ])('rejects a recommendation with %s', (_name, patch, message) => {
    const r = ok(json(rawResult({}, [rawRecommendation(patch)])))
    expect(r.recommendations).toHaveLength(0)
    expect(r.rejected).toHaveLength(1)
    expect(r.rejected[0].messages.join(' ')).toMatch(message)
  })

  it('caps the confidence of a claim that rests only on outside knowledge', () => {
    const external = [{ source: 'external', detail: 'Company is well known for its interviews' }]
    expect(recommendationSchema.safeParse(rawRecommendation({ evidence: external, confidence: 0.9 })).success).toBe(false)
    expect(recommendationSchema.safeParse(rawRecommendation({ evidence: external, confidence: AI_LIMITS.externalOnlyConfidence })).success).toBe(true)
    // One piece of evidence from the exported data lifts the cap.
    const mixed = [...external, { source: 'job', detail: 'Posting asks for C#' }]
    expect(recommendationSchema.safeParse(rawRecommendation({ evidence: mixed, confidence: 0.9 })).success).toBe(true)
  })

  it('only allows the whitelisted actions: nothing that sends, submits, edits the profile or deletes', () => {
    for (const type of ['submit-application', 'send-message', 'send-email', 'delete-job', 'edit-profile', 'apply', 'mark-applied']) {
      const r = ok(json(rawResult({}, [rawRecommendation({ action: { type } })])))
      expect(r.recommendations, type).toHaveLength(0)
      expect(r.rejected, type).toHaveLength(1)
    }
  })

  it('rejects malformed action payloads', () => {
    const bad = [
      { type: 'not-interested' }, // no reasons
      { type: 'not-interested', reasons: ['because-i-said'] },
      { type: 'not-interested', reasons: ['company', 'location', 'other', 'too-senior'] }, // > 3
      { type: 'add-note', note: '' },
      { type: 'add-note', note: 'x'.repeat(501) },
      { type: 'set-follow-up', followUpOn: 'next tuesday' },
      { type: 'set-follow-up', followUpOn: '2026-11-12', extra: true },
      { type: 'shortlist', jobId: 'other-job' },
    ]
    for (const action of bad) {
      expect(ok(json(rawResult({}, [rawRecommendation({ action })]))).recommendations, JSON.stringify(action)).toHaveLength(0)
    }
  })

  it('requires a jobId for any proposed change, even on an insight', () => {
    const r = ok(json(rawResult({}, [rawRecommendation({ kind: 'insight', jobId: undefined, action: { type: 'shortlist' } })])))
    expect(r.recommendations).toHaveLength(0)
    const noAction = ok(json(rawResult({}, [rawRecommendation({ kind: 'insight', jobId: undefined, action: { type: 'none' } })])))
    expect(noAction.recommendations).toHaveLength(1)
  })
})

describe('parsing model output', () => {
  it('accepts JSON wrapped in a markdown fence', () => {
    expect(ok('```json\n' + json(rawResult()) + '\n```').recommendations).toHaveLength(1)
    expect(ok('```\n' + json(rawResult()) + '\n```').recommendations).toHaveLength(1)
  })

  it('accepts JSON surrounded by prose', () => {
    expect(ok('Here is your result:\n\n' + json(rawResult()) + '\n\nHope that helps!').recommendations).toHaveLength(1)
    expect(extractJson('﻿  {"a":1}  ')).toBe('{"a":1}')
  })

  it.each([
    ['empty text', '', /empty/i],
    ['whitespace', '   \n ', /empty/i],
    ['plain prose', 'I could not find any good matches.', /not valid JSON/],
    ['truncated JSON', json(rawResult()).slice(0, 80), /not valid JSON/],
    ['a JSON array', '[1,2,3]', /JSON object|not valid JSON/],
    ['a JSON string', '"hello"', /JSON object/],
    ['null', 'null', /JSON object/],
    ['another JSON document', json({ hello: 'world' }), /not a JobIntel AI result/],
    ['a backup envelope', json({ format: 'jobintel-backup', formatVersion: 1 }), /not a JobIntel AI result/],
  ])('rejects %s with a clear message', (_name, text, message) => {
    expect(err(text)).toMatch(message)
  })

  it('rejects an oversized result before parsing it', () => {
    expect(err('x'.repeat(AI_LIMITS.resultChars + 1))).toMatch(/too large/)
  })

  it('rejects envelope problems: missing or odd fields', () => {
    expect(err(json(rawResult({ contextId: '' })))).toMatch(/contextId/)
    expect(err(json(rawResult({ generatedAt: 'yesterday' })))).toMatch(/generatedAt/)
    expect(err(json(rawResult({ recommendations: 'none' })))).toMatch(/recommendations/)
    expect(err(json(rawResult({ extraTopLevel: true })))).toMatch(/Unrecognized|extraTopLevel/i)
  })

  it('keeps the valid items and reports the invalid ones with their position and id', () => {
    const r = ok(
      json(
        rawResult({}, [
          rawRecommendation({ id: 'good-1' }),
          rawRecommendation({ id: 'bad-1', confidence: 7 }),
          'not an object',
          null,
          rawRecommendation({ id: 'good-2', jobId: 'greenhouse:acme:2' }),
        ]),
      ),
    )
    expect(r.recommendations.map((x) => x.id)).toEqual(['good-1', 'good-2'])
    expect(r.rejected.map((x) => x.index)).toEqual([1, 2, 3])
    expect(r.rejected[0]).toMatchObject({ id: 'bad-1' })
  })

  it('rejects a duplicate id inside one result', () => {
    const r = ok(json(rawResult({}, [rawRecommendation(), rawRecommendation({ title: 'Again' })])))
    expect(r.recommendations).toHaveLength(1)
    expect(r.rejected[0].messages[0]).toMatch(/duplicate/)
  })

  it('ignores recommendations beyond the limit', () => {
    const many = Array.from({ length: AI_LIMITS.recommendations + 3 }, (_, i) => rawRecommendation({ id: `rec-${i}` }))
    const r = ok(json(rawResult({}, many)))
    expect(r.recommendations).toHaveLength(AI_LIMITS.recommendations)
    expect(r.rejected).toHaveLength(3)
  })

  it('rejects prototype-pollution style keys instead of copying them', () => {
    const polluted = '{"format":"jobintel-ai-result","schemaVersion":1,"contextId":"c","generatedAt":"2026-11-03T00:00:00Z","recommendations":[],"__proto__":{"admin":true}}'
    expect(err(polluted)).toMatch(/Unrecognized|__proto__/i)
    expect(({} as Record<string, unknown>).admin).toBeUndefined()
  })

  it('imports recommendations even if the briefing is invalid, and says why', () => {
    const r = ok(json(rawResult({ briefing: { date: 'today', headline: '', summary: 1, priorities: 'many' } })))
    expect(r.recommendations).toHaveLength(1)
    expect(r.briefing).toBeUndefined()
    expect(r.briefingIssues.length).toBeGreaterThan(0)
  })

  it('flags briefing priorities that point to recommendations which were not imported', () => {
    const r = ok(json(rawResult({}, [rawRecommendation({ id: 'other' })])))
    expect(r.briefing).toBeDefined()
    expect(r.briefingIssues.join(' ')).toMatch(/point to recommendations that were not imported/)
  })

  it('treats a briefing as optional', () => {
    const r = ok(json(rawResult({ briefing: undefined })))
    expect(r.briefing).toBeUndefined()
    expect(r.briefingIssues).toEqual([])
  })

  it('never throws, whatever it is given', () => {
    for (const junk of ['{', '}', '{"format":', '\u0000', '{"a":'.repeat(500), '[[[[[[', json({ format: 'jobintel-ai-result' })]) {
      expect(() => parseAiResult(junk)).not.toThrow()
    }
  })
})

describe('reviewing an import against local data', () => {
  const parsed = ok(json(rawResult()))
  const local = (over = {}) => ({
    knownContextIds: new Set([CONTEXT_ID]),
    knownJobIds: new Set(['greenhouse:acme:1']),
    existingIds: new Set<string>(),
    now: NOW,
    ...over,
  })

  it('has nothing to warn about for a fresh result of a known export', () => {
    const r = reviewImport(parsed, local())
    expect(r).toMatchObject({ unknownContext: false, futureDated: false, alreadyImported: 0, unknownJobs: [] })
    expect(r.staleDays).toBeUndefined()
    expect(r.fresh).toHaveLength(1)
  })

  it('warns when the result answers an export this browser never made', () => {
    expect(reviewImport(parsed, local({ knownContextIds: new Set() })).unknownContext).toBe(true)
  })

  it('warns about job ids that match nothing local', () => {
    expect(reviewImport(parsed, local({ knownJobIds: new Set() })).unknownJobs).toEqual([{ id: 'fit-acme-1', jobId: 'greenhouse:acme:1' }])
  })

  it('warns about stale and future-dated results', () => {
    const old = ok(json(rawResult({ generatedAt: '2026-10-01T00:00:00.000Z' })))
    expect(reviewImport(old, local()).staleDays).toBeGreaterThanOrEqual(30)
    const future = ok(json(rawResult({ generatedAt: '2026-12-25T00:00:00.000Z' })))
    expect(reviewImport(future, local()).futureDated).toBe(true)
  })

  it('does not import the same result twice, so earlier decisions are never reset', () => {
    const r = reviewImport(parsed, local({ existingIds: new Set([storedIdOf(CONTEXT_ID, 'fit-acme-1')]) }))
    expect(r.alreadyImported).toBe(1)
    expect(r.fresh).toHaveLength(0)
  })

  it('stores everything as "generated" with a namespaced id, never as accepted', () => {
    const { recommendations, briefing } = toStored(parsed, parsed.recommendations, NOW)
    expect(recommendations).toHaveLength(1)
    expect(recommendations[0]).toMatchObject({ id: `${CONTEXT_ID}:fit-acme-1`, status: 'generated', contextId: CONTEXT_ID })
    expect(recommendations[0].decidedAt).toBeUndefined()
    expect(storedRecommendationSchema.safeParse(recommendations[0]).success).toBe(true)
    expect(storedBriefingSchema.safeParse(briefing).success).toBe(true)
    expect(briefing).toMatchObject({ id: CONTEXT_ID, date: '2026-11-03' })
  })
})

describe('schema v2 additions (A2–A8)', () => {
  const lead = { type: 'add-lead', name: 'Jane Doe', company: 'Acme', role: 'Engineering Manager', sourceUrl: 'https://example.com/team', reason: 'Leads the hiring team' }
  const ok2 = (rec: Record<string, unknown>) => ok(json(rawResult({ schemaVersion: 2 }, [rawRecommendation(rec)])))

  it('accepts a lead proposal without a jobId', () => {
    const r = ok2({ kind: 'lead-proposal', jobId: undefined, action: lead })
    expect(r.recommendations[0].action).toMatchObject({ type: 'add-lead', name: 'Jane Doe' })
  })

  it('requires a public http(s) source for every proposed lead', () => {
    for (const bad of [{ ...lead, sourceUrl: undefined }, { ...lead, sourceUrl: 'javascript:alert(1)' }, { ...lead, sourceUrl: 'not a url' }, { ...lead, profileUrl: 'ftp://x.example' }]) {
      expect(ok2({ kind: 'lead-proposal', jobId: undefined, action: bad }).recommendations, JSON.stringify(bad)).toHaveLength(0)
    }
  })

  it('accepts set-stage only for the four forward stages, and only with a job', () => {
    expect(ok2({ kind: 'application-update', action: { type: 'set-stage', stage: 'interview', note: 'Invite email 2026-11-02' } }).recommendations).toHaveLength(1)
    for (const stage of ['withdrawn', 'shortlisted', 'referred', 'hired']) {
      expect(ok2({ kind: 'application-update', action: { type: 'set-stage', stage } }).recommendations, stage).toHaveLength(0)
    }
    expect(ok2({ kind: 'application-update', jobId: undefined, action: { type: 'set-stage', stage: 'interview' } }).recommendations).toHaveLength(0)
  })

  it('accepts the new kinds', () => {
    for (const kind of ['resume-suggestion', 'prep-plan']) {
      expect(ok2({ kind, jobId: undefined, action: { type: 'none' } }).recommendations, kind).toHaveLength(1)
    }
  })
})

describe('track-job contract', () => {
  const ext = { type: 'track-job', title: 'Backend Engineer', company: 'Example', url: 'https://example.com/j/1', location: 'Hyderabad', source: 'Naukri' }
  const one = (action: Record<string, unknown>) => ok(json(rawResult({ schemaVersion: 2 }, [rawRecommendation({ kind: 'job-fit', jobId: undefined, action })])))

  it('needs no jobId but a real http(s) posting link, a location and a source', () => {
    expect(one(ext).recommendations).toHaveLength(1)
    expect(one({ ...ext, url: 'javascript:alert(1)' }).recommendations).toHaveLength(0)
    expect(one({ ...ext, source: undefined }).recommendations).toHaveLength(0)
    expect(one({ ...ext, city: 'Paris' }).recommendations).toHaveLength(0)
  })
})
