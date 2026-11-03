import { describe, expect, it, vi } from 'vitest'
import { DEFAULT_EXPORT_OPTIONS, type AiContextBundle } from '../../domain/ai/context'
import type { AutomationSettings, StoredRecommendation } from '../../domain/ai/schema'
import { json, rawRecommendation, rawResult } from '../../test/aiFixture'
import type { GitHubClient } from './github'
import { runSyncCycle, type SyncDeps } from './syncCycle'

const NOW = new Date('2026-11-03T08:00:00.000Z')

function fakeRepo(files: Record<string, string> = {}, opts: { publicRepo?: boolean } = {}) {
  const store = new Map(Object.entries(files))
  const sha = (t: string) => `sha-${t.length}`
  const client: GitHubClient = {
    checkAccess: vi.fn(async () => {
      if (opts.publicRepo) throw new Error('This repository is public. JobIntel only syncs to a private repository.')
    }),
    getFile: vi.fn(async (p: string) => (store.has(p) ? { sha: sha(store.get(p)!), text: store.get(p)! } : null)),
    putFile: vi.fn(async (p: string, t: string) => void store.set(p, t)),
    listDir: vi.fn(async (dir: string) =>
      [...store.keys()].filter((k) => k.startsWith(`${dir}/`)).map((k) => ({ name: k.slice(dir.length + 1), sha: sha(store.get(k)!), type: 'file' })),
    ),
  }
  return { client, store }
}

const baseSettings = (): AutomationSettings => ({
  id: 'automation',
  repo: 'me/private',
  token: 't',
  autoSync: true,
  exportOptions: { ...DEFAULT_EXPORT_OPTIONS },
  autoAcceptLowRisk: true,
  consentedAt: '2026-11-01T00:00:00.000Z',
  importedResults: [],
  updatedAt: '2026-11-01T00:00:00.000Z',
})

function deps(over: Partial<SyncDeps> & { client: GitHubClient }) {
  const saved = {
    settings: undefined as AutomationSettings | undefined,
    recs: [] as StoredRecommendation[],
    briefings: [] as unknown[],
    exports: [] as unknown[],
    autoAccepted: [] as StoredRecommendation[],
  }
  const d: SyncDeps = {
    settings: baseSettings(),
    buildContext: (_o, contextId) =>
      ({ format: 'jobintel-ai-context', schemaVersion: 2, contextId, generatedAt: NOW.toISOString(), asOf: '2026-11-03', instructions: [], resultSchema: {} }) as AiContextBundle,
    now: () => NOW,
    newId: () => 'ctx-new',
    existingRecIds: new Set(),
    knownContextIds: new Set(['ctx-test-1']),
    knownJobIds: new Set(['greenhouse:acme:1']),
    saveSettings: async (s) => void (saved.settings = s),
    saveExport: async (e) => void saved.exports.push(e),
    saveRec: async (r) => void saved.recs.push(r),
    saveBriefing: async (b) => void saved.briefings.push(b),
    autoAccept: async (recs) => {
      saved.autoAccepted.push(...recs)
      return recs.length
    },
    ...over,
  }
  return { d, saved }
}

describe('automation sync cycle', () => {
  it('pushes the context, records the export, then imports new results as Generated', async () => {
    const { client, store } = fakeRepo({ 'results/2026-11-03.json': json(rawResult()) })
    const { d, saved } = deps({ client })
    const r = await runSyncCycle(d)
    expect(r).toMatchObject({ pushed: true, imported: 1, autoAccepted: 0 })
    expect(JSON.parse(store.get('context/latest.json')!).contextId).toBe('ctx-new')
    expect(saved.exports).toHaveLength(1)
    expect(saved.recs.map((x) => x.status)).toEqual(['generated'])
    expect(saved.briefings).toHaveLength(1)
    expect(saved.settings!.importedResults.map((i) => i.name)).toEqual(['2026-11-03.json'])
    expect(saved.settings!.lastError).toBeUndefined()
  })

  it('does not push again when nothing changed, and does not re-import a result', async () => {
    const { client } = fakeRepo({ 'results/2026-11-03.json': json(rawResult()) })
    const first = deps({ client })
    await runSyncCycle(first.d)
    const second = deps({ client, settings: { ...first.saved.settings!, lastPushAt: '2026-11-03T06:00:00.000Z' } })
    const r = await runSyncCycle(second.d)
    expect(r).toMatchObject({ pushed: false, imported: 0 })
    expect(client.putFile).toHaveBeenCalledTimes(1)
  })

  it('hands only low-risk recommendations to auto-accept', async () => {
    const recs = [rawRecommendation({ id: 'note-1', action: { type: 'add-note', note: 'Ask about on-call' }, confidence: 0.8 }), rawRecommendation({ id: 'shortlist-1' })]
    const { client } = fakeRepo({ 'results/2026-11-03.json': json(rawResult({}, recs)) })
    const { d, saved } = deps({ client })
    const r = await runSyncCycle(d)
    expect(r.autoAccepted).toBe(1)
    expect(saved.autoAccepted.map((x) => x.id)).toEqual(['ctx-test-1:note-1'])
  })

  it('records a malformed result as an error but marks it seen, so it is not retried forever', async () => {
    const { client } = fakeRepo({ 'results/2026-11-03.json': 'not json' })
    const { d, saved } = deps({ client })
    const r = await runSyncCycle(d)
    expect(r.imported).toBe(0)
    expect(saved.settings!.lastError).toMatch(/2026-11-03\.json: This is not valid JSON/)
    expect(saved.settings!.importedResults).toHaveLength(1)
  })

  it('adopts the resume stored in the repository when this browser has none', async () => {
    const { client } = fakeRepo({ 'profile/resume.md': '# Resume\nC# .NET' })
    const { d, saved } = deps({ client })
    const r = await runSyncCycle(d)
    expect(r.resumePulled).toBe(true)
    expect(r.resumePushed).toBe(false)
    expect(saved.settings!.resumeText).toBe('# Resume\nC# .NET')
  })

  it('pushes a changed local resume', async () => {
    const { client, store } = fakeRepo()
    const { d } = deps({ client })
    const r = await runSyncCycle({ ...d, settings: { ...d.settings, resumeText: 'New resume' } })
    expect(r.resumePushed).toBe(true)
    expect(store.get('profile/resume.md')).toBe('New resume')
  })

  it('refuses a public repository and writes nothing', async () => {
    const { client, store } = fakeRepo({}, { publicRepo: true })
    const { d, saved } = deps({ client })
    const r = await runSyncCycle(d)
    expect(r.error).toMatch(/public/)
    expect(store.size).toBe(0)
    expect(saved.settings!.lastError).toMatch(/public/)
  })

  it('does not push without consent, but still imports results', async () => {
    const { client, store } = fakeRepo({ 'results/2026-11-03.json': json(rawResult()) })
    const { d } = deps({ client })
    const r = await runSyncCycle({ ...d, settings: { ...d.settings, consentedAt: undefined } })
    expect(r.pushed).toBe(false)
    expect(store.has('context/latest.json')).toBe(false)
    expect(r.imported).toBe(1)
  })
})
