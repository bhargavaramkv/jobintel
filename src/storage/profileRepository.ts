import { candidateProfileSchema, PROFILE_ID, type CandidateProfile } from '../domain/profile/schema'
import { openDatabase, requestToPromise, SCHEMA_VERSION, STORES, transactionDone } from './db'

export class ProfileDataError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ProfileDataError'
  }
}

/** Typed access to the single local candidate profile record. */
export const profileRepository = {
  async get(): Promise<CandidateProfile | null> {
    const db = await openDatabase()
    const tx = db.transaction(STORES.profile, 'readonly')
    const raw: unknown = await requestToPromise(tx.objectStore(STORES.profile).get(PROFILE_ID))
    if (raw === undefined) return null
    const parsed = candidateProfileSchema.safeParse(raw)
    if (!parsed.success) {
      throw new ProfileDataError(
        'The locally stored profile is unreadable. Restore from a backup or clear local data.',
      )
    }
    return parsed.data
  },

  async save(profile: CandidateProfile): Promise<CandidateProfile> {
    const valid = candidateProfileSchema.parse(profile)
    const db = await openDatabase()
    const tx = db.transaction([STORES.profile, STORES.meta], 'readwrite')
    tx.objectStore(STORES.profile).put(valid)
    tx.objectStore(STORES.meta).put({ key: 'schemaVersion', value: SCHEMA_VERSION })
    await transactionDone(tx)
    return valid
  },

  async getSchemaVersion(): Promise<number | null> {
    const db = await openDatabase()
    const tx = db.transaction(STORES.meta, 'readonly')
    const row = (await requestToPromise(tx.objectStore(STORES.meta).get('schemaVersion'))) as
      | { value: number }
      | undefined
    return row?.value ?? null
  },

  /** Remove every JobIntel record from this browser's IndexedDB. */
  async clearAll(): Promise<void> {
    const db = await openDatabase()
    const tx = db.transaction([STORES.profile, STORES.meta], 'readwrite')
    tx.objectStore(STORES.profile).clear()
    tx.objectStore(STORES.meta).clear()
    tx.objectStore(STORES.meta).put({ key: 'schemaVersion', value: SCHEMA_VERSION })
    await transactionDone(tx)
  },
}
