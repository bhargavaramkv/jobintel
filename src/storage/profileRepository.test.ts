import { beforeEach, describe, expect, it } from 'vitest'
import { completeProfile, freshDatabase, makeProfile } from '../test/helpers'
import { DB_NAME, DB_VERSION, openDatabase, resetDatabaseConnection, SCHEMA_VERSION, STORES } from './db'
import { ProfileDataError, profileRepository } from './profileRepository'

beforeEach(freshDatabase)

describe('profileRepository', () => {
  it('returns null when nothing is stored', async () => {
    expect(await profileRepository.get()).toBeNull()
  })

  it('persists and reloads a profile across connections', async () => {
    const p = completeProfile()
    await profileRepository.save(p)
    await resetDatabaseConnection() // simulate a reload
    expect(await profileRepository.get()).toEqual(p)
  })

  it('records the schema version', async () => {
    await profileRepository.save(makeProfile())
    expect(await profileRepository.getSchemaVersion()).toBe(SCHEMA_VERSION)
  })

  it('refuses to save invalid data', async () => {
    await expect(profileRepository.save({ ...makeProfile(), yearsExperience: -5 })).rejects.toThrow()
    expect(await profileRepository.get()).toBeNull()
  })

  it('reports corrupted stored data instead of returning it', async () => {
    const db = await openDatabase()
    const tx = db.transaction(STORES.profile, 'readwrite')
    tx.objectStore(STORES.profile).put({ id: 'current-user', primarySkills: 'oops' })
    await new Promise((r) => (tx.oncomplete = r))
    await expect(profileRepository.get()).rejects.toBeInstanceOf(ProfileDataError)
  })

  it('clears all data', async () => {
    await profileRepository.save(completeProfile())
    await profileRepository.clearAll()
    expect(await profileRepository.get()).toBeNull()
  })

  it('creates the expected database structure', async () => {
    const db = await openDatabase()
    expect(db.name).toBe(DB_NAME)
    expect(db.version).toBe(DB_VERSION)
    expect([...db.objectStoreNames].sort()).toEqual([STORES.meta, STORES.profile].sort())
  })
})
