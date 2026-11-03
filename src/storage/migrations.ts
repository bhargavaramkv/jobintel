import { SCHEMA_VERSION, STORES } from './constants'

/**
 * Ordered IndexedDB migrations. Each entry upgrades from (index) to (index + 1).
 * Never edit a released migration; append a new one and bump DB_VERSION.
 */
const MIGRATIONS: Array<(db: IDBDatabase, tx: IDBTransaction) => void> = [
  // v0 -> v1: initial schema
  (db, tx) => {
    db.createObjectStore(STORES.profile, { keyPath: 'id' })
    db.createObjectStore(STORES.meta, { keyPath: 'key' })
    tx.objectStore(STORES.meta).put({ key: 'schemaVersion', value: 1 })
  },
  // v1 -> v2: private per-job decisions (applied / not interested) and notes
  (db, tx) => {
    db.createObjectStore(STORES.jobActions, { keyPath: 'jobId' })
    tx.objectStore(STORES.meta).put({ key: 'schemaVersion', value: 2 })
  },
  // v2 -> v3: referral leads (Phase 4)
  (db, tx) => {
    db.createObjectStore(STORES.contacts, { keyPath: 'id' })
    tx.objectStore(STORES.meta).put({ key: 'schemaVersion', value: 3 })
  },
  // v3 -> v4: outreach message history (Phase 5)
  (db, tx) => {
    db.createObjectStore(STORES.outreach, { keyPath: 'id' })
    tx.objectStore(STORES.meta).put({ key: 'schemaVersion', value: SCHEMA_VERSION })
  },
  // v4 -> v5: AI recommendation inbox, briefings and the export consent log (AI Phase 1)
  (db, tx) => {
    db.createObjectStore(STORES.aiRecommendations, { keyPath: 'id' })
    db.createObjectStore(STORES.aiBriefings, { keyPath: 'id' })
    db.createObjectStore(STORES.aiExports, { keyPath: 'id' })
    tx.objectStore(STORES.meta).put({ key: 'schemaVersion', value: SCHEMA_VERSION })
  },
  // v5 -> v6: automation settings (private-repo sync, stored resume) (AI A2-A8)
  (db, tx) => {
    db.createObjectStore(STORES.aiSettings, { keyPath: 'id' })
    tx.objectStore(STORES.meta).put({ key: 'schemaVersion', value: SCHEMA_VERSION })
  },
]

export function runMigrations(db: IDBDatabase, tx: IDBTransaction, oldVersion: number): void {
  for (let v = oldVersion; v < MIGRATIONS.length; v++) {
    MIGRATIONS[v](db, tx)
  }
}
