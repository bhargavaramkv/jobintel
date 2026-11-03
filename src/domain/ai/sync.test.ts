import { describe, expect, it } from 'vitest'
import { storedRec } from '../../test/aiFixture'
import { DEFAULT_EXPORT_OPTIONS } from './context'
import type { AiContextBundle } from './context'
import type { AutomationSettings } from './schema'
import { contextFingerprint, isAutoAcceptable, newResultFiles, PUSH_MIN_INTERVAL_MS, rememberImported, shouldPush, shouldPushResume, stableHash } from './sync'

const now = new Date('2026-11-03T08:00:00.000Z')
const settings = (o: Partial<AutomationSettings> = {}): AutomationSettings => ({
  id: 'automation',
  repo: 'me/private',
  token: 't',
  autoSync: true,
  exportOptions: { ...DEFAULT_EXPORT_OPTIONS },
  autoAcceptLowRisk: true,
  consentedAt: '2026-11-01T00:00:00.000Z',
  importedResults: [],
  updatedAt: '2026-11-01T00:00:00.000Z',
  ...o,
})
const bundle = (o: Partial<AiContextBundle> = {}) =>
  ({ format: 'jobintel-ai-context', schemaVersion: 2, contextId: 'a', generatedAt: 'x', asOf: '2026-11-03', instructions: [], resultSchema: {}, ...o }) as AiContextBundle

describe('automation sync rules', () => {
  it('fingerprints content, not the export id or time', () => {
    expect(contextFingerprint(bundle({ contextId: 'a', generatedAt: '1' }))).toBe(contextFingerprint(bundle({ contextId: 'b', generatedAt: '2' })))
    expect(contextFingerprint(bundle())).not.toBe(contextFingerprint(bundle({ asOf: '2026-11-04' })))
    expect(stableHash('abc')).toMatch(/^[0-9a-f]{16}$/)
  })

  it('pushes only with consent, a token, a change, and not more than every 30 minutes', () => {
    expect(shouldPush(settings(), 'h1', now)).toBe(true)
    expect(shouldPush(settings({ consentedAt: undefined }), 'h1', now)).toBe(false)
    expect(shouldPush(settings({ token: undefined }), 'h1', now)).toBe(false)
    expect(shouldPush(settings({ autoSync: false }), 'h1', now)).toBe(false)
    expect(shouldPush(settings({ lastPushHash: 'h1' }), 'h1', now)).toBe(false)
    const recent = new Date(now.getTime() - PUSH_MIN_INTERVAL_MS + 1000).toISOString()
    expect(shouldPush(settings({ lastPushAt: recent, lastPushHash: 'h0' }), 'h1', now)).toBe(false)
    const old = new Date(now.getTime() - PUSH_MIN_INTERVAL_MS).toISOString()
    expect(shouldPush(settings({ lastPushAt: old, lastPushHash: 'h0' }), 'h1', now)).toBe(true)
  })

  it('pushes the resume only when it changed and the resume switch is on', () => {
    expect(shouldPushResume(settings({ resumeText: 'cv' }))).toBe(true)
    expect(shouldPushResume(settings({ resumeText: 'cv', lastResumeHash: stableHash('cv') }))).toBe(false)
    expect(shouldPushResume(settings({ resumeText: 'cv', exportOptions: { ...DEFAULT_EXPORT_OPTIONS, resume: false } }))).toBe(false)
    expect(shouldPushResume(settings({ resumeText: '  ' }))).toBe(false)
  })

  it('picks only new, well-named result files, oldest first', () => {
    const listing = [
      { name: '2026-11-03.json', sha: 's3', type: 'file' },
      { name: '2026-11-02.json', sha: 's2', type: 'file' },
      { name: 'notes.md', sha: 'n', type: 'file' },
      { name: '2026-11-01.json', sha: 's1', type: 'dir' },
    ]
    expect(newResultFiles(listing, []).map((f) => f.name)).toEqual(['2026-11-02.json', '2026-11-03.json'])
    expect(newResultFiles(listing, [{ name: '2026-11-02.json', sha: 's2' }]).map((f) => f.name)).toEqual(['2026-11-03.json'])
    // A rewritten file (new sha) is picked up again.
    expect(newResultFiles(listing, [{ name: '2026-11-02.json', sha: 'old' }]).map((f) => f.name)).toContain('2026-11-02.json')
  })

  it('remembers a bounded, de-duplicated list of imported files', () => {
    let list: AutomationSettings['importedResults'] = []
    for (let i = 0; i < 130; i++) list = rememberImported(list, { name: `f${i}`, sha: 'x' })
    expect(list).toHaveLength(120)
    expect(rememberImported([{ name: 'a', sha: '1' }], { name: 'a', sha: '2' })).toEqual([{ name: 'a', sha: '2' }])
  })

  it('auto-accepts only notes and follow-ups, with enough confidence, when turned on', () => {
    const note = storedRec({ action: { type: 'add-note', note: 'x' }, confidence: 0.7 })
    expect(isAutoAcceptable(note, { autoAcceptLowRisk: true })).toBe(true)
    expect(isAutoAcceptable(note, { autoAcceptLowRisk: false })).toBe(false)
    expect(isAutoAcceptable({ ...note, confidence: 0.5 }, { autoAcceptLowRisk: true })).toBe(false)
    expect(isAutoAcceptable({ ...note, status: 'rejected' }, { autoAcceptLowRisk: true })).toBe(false)
    const risky = [{ type: 'shortlist' }, { type: 'not-interested', reasons: ['other'] }, { type: 'set-stage', stage: 'interview' }]
    for (const action of risky) {
      expect(isAutoAcceptable(storedRec({ action: action as never, confidence: 0.99 }), { autoAcceptLowRisk: true }), action.type).toBe(false)
    }
  })
})
