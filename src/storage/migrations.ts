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
    tx.objectStore(STORES.meta).put({ key: 'schemaVersion', value: SCHEMA_VERSION })
  },
]

export function runMigrations(db: IDBDatabase, tx: IDBTransaction, oldVersion: number): void {
  for (let v = oldVersion; v < MIGRATIONS.length; v++) {
    MIGRATIONS[v](db, tx)
  }
}
