import { DB_NAME, DB_VERSION } from './constants'
import { runMigrations } from './migrations'

export { DB_NAME, DB_VERSION, SCHEMA_VERSION, STORES } from './constants'

let dbPromise: Promise<IDBDatabase> | null = null

export function openDatabase(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise
  dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new StorageUnavailableError('IndexedDB is not available in this browser.'))
      return
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = (event) => {
      const tx = request.transaction
      if (!tx) return
      runMigrations(request.result, tx, event.oldVersion)
    }
    request.onsuccess = () => {
      const db = request.result
      // Another tab upgraded the schema: close so it can proceed.
      db.onversionchange = () => {
        db.close()
        dbPromise = null
      }
      resolve(db)
    }
    request.onerror = () => {
      dbPromise = null
      reject(new StorageUnavailableError(request.error?.message ?? 'Could not open local database.'))
    }
    request.onblocked = () => {
      reject(new StorageUnavailableError('Close other JobIntel tabs so the local database can be upgraded.'))
    }
  })
  return dbPromise
}

/** For tests: close and forget the cached connection. */
export async function resetDatabaseConnection(): Promise<void> {
  if (dbPromise) {
    try {
      ;(await dbPromise).close()
    } catch {
      /* ignore */
    }
  }
  dbPromise = null
}

export class StorageUnavailableError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'StorageUnavailableError'
  }
}

export function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export function transactionDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
    tx.onabort = () => reject(tx.error ?? new Error('Transaction aborted'))
  })
}
