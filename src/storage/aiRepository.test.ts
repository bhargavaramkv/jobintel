import { IDBFactory } from 'fake-indexeddb'
import { beforeEach, describe, expect, it } from 'vitest'
import { refOf, withApplied } from '../domain/jobs/actions'
import { exportRecordSchema } from '../domain/ai/schema'
import { CONTEXT_ID, storedBriefing, storedRec } from '../test/aiFixture'
import { makeJob } from '../test/feedFixture'
import { completeProfile, freshDatabase } from '../test/helpers'
import { aiBriefingsRepository, aiExportsRepository, aiRecommendationsRepository } from './aiRepository'
import { DB_NAME, DB_VERSION, openDatabase, resetDatabaseConnection, SCHEMA_VERSION, STORES } from './db'
import { jobActionsRepository } from './jobActionsRepository'
import { profileRepository } from './profileRepository'

beforeEach(freshDatabase)

describe('AI repositories', () => {
  it('stores, updates and removes recommendations', async () => {
    await aiRecommendationsRepository.put(storedRec())
    await aiRecommendationsRepository.put(storedRec({ status: 'accepted', decidedAt: '2026-11-04T00:00:00.000Z' }))
    const { rows } = await aiRecommendationsRepository.getAll()
    expect(rows).toHaveLength(1)
    expect(rows[0].status).toBe('accepted')
    await aiRecommendationsRepository.remove(rows[0].id)
    expect((await aiRecommendationsRepository.getAll()).rows).toEqual([])
  })

  it('refuses to save an invalid recommendation', async () => {
    await expect(aiRecommendationsRepository.put({ ...storedRec(), confidence: 5 })).rejects.toThrow()
    await expect(aiRecommendationsRepository.put({ ...storedRec(), evidence: [] })).rejects.toThrow()
    await expect(aiRecommendationsRepository.put({ ...storedRec(), status: 'applied' as never })).rejects.toThrow()
    expect((await aiRecommendationsRepository.getAll()).rows).toEqual([])
  })

  it('skips and counts corrupted rows instead of failing', async () => {
    await aiRecommendationsRepository.put(storedRec())
    const db = await openDatabase()
    const tx = db.transaction(STORES.aiRecommendations, 'readwrite')
    tx.objectStore(STORES.aiRecommendations).put({ id: 'bad', status: 'accepted' })
    await new Promise((r) => (tx.oncomplete = r))
    const out = await aiRecommendationsRepository.getAll()
    expect(out.rows).toHaveLength(1)
    expect(out.skipped).toBe(1)
  })

  it('stores briefings and the export log', async () => {
    await aiBriefingsRepository.put(storedBriefing())
    expect((await aiBriefingsRepository.getAll()).rows[0].id).toBe(CONTEXT_ID)
    const record = exportRecordSchema.parse({
      id: CONTEXT_ID,
      createdAt: '2026-11-03T08:00:00.000Z',
      includes: { profile: true, identity: false, compensation: false, pipeline: true, applications: true, notes: false, referrals: true, referralNames: false, topMatches: 10 },
      counts: { pipelineJobs: 1, topMatches: 5, applications: 2, referrals: 1 },
      bytes: 12_345,
    })
    await aiExportsRepository.put(record)
    expect((await aiExportsRepository.getAll()).rows).toEqual([record])
  })

  it('is cleared together with everything else by "Clear data"', async () => {
    await profileRepository.save(completeProfile())
    await aiRecommendationsRepository.put(storedRec())
    await aiBriefingsRepository.put(storedBriefing())
    await profileRepository.clearAll()
    expect((await aiRecommendationsRepository.getAll()).rows).toEqual([])
    expect((await aiBriefingsRepository.getAll()).rows).toEqual([])
    expect(await profileRepository.getSchemaVersion()).toBe(SCHEMA_VERSION)
  })
})

describe('migration v4 -> v5', () => {
  /** Build a database exactly as release v4 left it (no AI stores), with real user data in it. */
  async function seedV4Database() {
    await resetDatabaseConnection()
    globalThis.indexedDB = new IDBFactory()
    await new Promise<void>((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 4)
      req.onupgradeneeded = () => {
        const db = req.result
        db.createObjectStore('profile', { keyPath: 'id' })
        db.createObjectStore('meta', { keyPath: 'key' })
        db.createObjectStore('jobActions', { keyPath: 'jobId' })
        db.createObjectStore('contacts', { keyPath: 'id' })
        db.createObjectStore('outreach', { keyPath: 'id' })
        const tx = req.transaction!
        tx.objectStore('meta').put({ key: 'schemaVersion', value: 4 })
        tx.objectStore('profile').put(completeProfile())
        tx.objectStore('jobActions').put(withApplied(refOf(makeJob({ sourceId: 'legacy' })), undefined, new Date('2026-11-02T10:00:00Z')))
      }
      req.onsuccess = () => {
        req.result.close()
        resolve()
      }
      req.onerror = () => reject(req.error)
    })
  }

  it('adds the AI stores and keeps every existing record', async () => {
    expect(DB_VERSION).toBe(5)
    await seedV4Database()
    const db = await openDatabase()
    for (const name of [STORES.aiRecommendations, STORES.aiBriefings, STORES.aiExports]) {
      expect([...db.objectStoreNames]).toContain(name)
    }
    expect(await profileRepository.get()).toEqual(completeProfile())
    const { actions } = await jobActionsRepository.getAll()
    expect(actions).toHaveLength(1)
    expect(actions[0].decision).toBe('applied')
    expect(await profileRepository.getSchemaVersion()).toBe(5)
  })

  it('leaves the new stores empty and usable after upgrading', async () => {
    await seedV4Database()
    expect((await aiRecommendationsRepository.getAll()).rows).toEqual([])
    await aiRecommendationsRepository.put(storedRec())
    expect((await aiRecommendationsRepository.getAll()).rows).toHaveLength(1)
  })

  it('creates a fresh database with every store', async () => {
    const db = await openDatabase()
    expect([...db.objectStoreNames].sort()).toEqual(Object.values(STORES).sort())
  })
})
