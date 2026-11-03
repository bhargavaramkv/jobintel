import type { z } from 'zod'
import { openDatabase, requestToPromise, transactionDone } from './db'

/**
 * Typed access to a simple keyed IndexedDB store. Rows are validated on every read and write;
 * invalid rows are skipped and counted rather than breaking the app.
 */
export function recordStore<S extends z.ZodType>(storeName: string, schema: S) {
  type T = z.infer<S>
  return {
    async getAll(): Promise<{ rows: T[]; skipped: number }> {
      const db = await openDatabase()
      const tx = db.transaction(storeName, 'readonly')
      const raw = (await requestToPromise(tx.objectStore(storeName).getAll())) as unknown[]
      const rows: T[] = []
      let skipped = 0
      for (const r of raw) {
        const parsed = schema.safeParse(r)
        if (parsed.success) rows.push(parsed.data)
        else skipped++
      }
      return { rows, skipped }
    },

    async put(row: T): Promise<T> {
      const valid = schema.parse(row)
      const db = await openDatabase()
      const tx = db.transaction(storeName, 'readwrite')
      tx.objectStore(storeName).put(valid)
      await transactionDone(tx)
      return valid
    },

    async remove(key: string): Promise<void> {
      const db = await openDatabase()
      const tx = db.transaction(storeName, 'readwrite')
      tx.objectStore(storeName).delete(key)
      await transactionDone(tx)
    },

    async replaceAll(rows: T[]): Promise<void> {
      const valid = rows.map((r) => schema.parse(r))
      const db = await openDatabase()
      const tx = db.transaction(storeName, 'readwrite')
      const store = tx.objectStore(storeName)
      store.clear()
      for (const r of valid) store.put(r)
      await transactionDone(tx)
    },
  }
}
