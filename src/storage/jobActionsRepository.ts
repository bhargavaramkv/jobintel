import { jobActionSchema, type JobAction } from '../domain/jobs/actions'
import { openDatabase, requestToPromise, STORES, transactionDone } from './db'

/** Typed access to the user's private per-job decisions and notes. */
export const jobActionsRepository = {
  /** All valid records. Invalid rows are skipped (and reported) rather than breaking the app. */
  async getAll(): Promise<{ actions: JobAction[]; skipped: number }> {
    const db = await openDatabase()
    const tx = db.transaction(STORES.jobActions, 'readonly')
    const rows = (await requestToPromise(tx.objectStore(STORES.jobActions).getAll())) as unknown[]
    const actions: JobAction[] = []
    let skipped = 0
    for (const row of rows) {
      const parsed = jobActionSchema.safeParse(row)
      if (parsed.success) actions.push(parsed.data)
      else skipped++
    }
    return { actions, skipped }
  },

  async put(action: JobAction): Promise<JobAction> {
    const valid = jobActionSchema.parse(action)
    const db = await openDatabase()
    const tx = db.transaction(STORES.jobActions, 'readwrite')
    tx.objectStore(STORES.jobActions).put(valid)
    await transactionDone(tx)
    return valid
  },

  async remove(jobId: string): Promise<void> {
    const db = await openDatabase()
    const tx = db.transaction(STORES.jobActions, 'readwrite')
    tx.objectStore(STORES.jobActions).delete(jobId)
    await transactionDone(tx)
  },

  /** Replace every record (used by backup restore). */
  async replaceAll(actions: JobAction[]): Promise<void> {
    const valid = actions.map((a) => jobActionSchema.parse(a))
    const db = await openDatabase()
    const tx = db.transaction(STORES.jobActions, 'readwrite')
    const store = tx.objectStore(STORES.jobActions)
    store.clear()
    for (const a of valid) store.put(a)
    await transactionDone(tx)
  },
}
