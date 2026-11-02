import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useProfile } from '../profile/useProfile'

interface Repo<T> {
  getAll(): Promise<{ rows: T[]; skipped: number }>
  put(row: T): Promise<T>
  remove(key: string): Promise<void>
  replaceAll(rows: T[]): Promise<void>
}

export interface RecordContextValue<T> {
  status: 'loading' | 'ready' | 'error'
  error?: string
  /** id -> record */
  items: ReadonlyMap<string, T>
  save: (row: T) => Promise<void>
  remove: (id: string) => Promise<void>
  replaceAll: (rows: T[]) => Promise<void>
}

/**
 * A provider + hook pair over a validated IndexedDB store. Reloads whenever local data is
 * replaced wholesale (backup import / clear data bumps the profile `revision`).
 */
export function createRecordContext<T extends { id: string }>(name: string, repo: Repo<T>) {
  const Ctx = createContext<RecordContextValue<T> | null>(null)

  function Provider({ children }: { children: ReactNode }) {
    const { revision } = useProfile()
    const [status, setStatus] = useState<RecordContextValue<T>['status']>('loading')
    const [error, setError] = useState<string>()
    const [items, setItems] = useState<ReadonlyMap<string, T>>(new Map())
    const store = useRef<Map<string, T>>(new Map())

    useEffect(() => {
      let cancelled = false
      repo
        .getAll()
        .then(({ rows }) => {
          if (cancelled) return
          store.current = new Map(rows.map((r) => [r.id, r]))
          setItems(new Map(store.current))
          setStatus('ready')
        })
        .catch((err: unknown) => {
          if (cancelled) return
          setError(err instanceof Error ? err.message : String(err))
          setStatus('error')
        })
      return () => {
        cancelled = true
      }
    }, [revision])

    const save = useCallback(async (row: T) => {
      const valid = await repo.put(row)
      store.current.set(valid.id, valid)
      setItems(new Map(store.current))
    }, [])
    const remove = useCallback(async (id: string) => {
      await repo.remove(id)
      store.current.delete(id)
      setItems(new Map(store.current))
    }, [])
    const replaceAll = useCallback(async (rows: T[]) => {
      await repo.replaceAll(rows)
      store.current = new Map(rows.map((r) => [r.id, r]))
      setItems(new Map(store.current))
    }, [])

    const value = useMemo(() => ({ status, error, items, save, remove, replaceAll }), [status, error, items, save, remove, replaceAll])
    return <Ctx.Provider value={value}>{children}</Ctx.Provider>
  }

  function useRecords(): RecordContextValue<T> {
    const ctx = useContext(Ctx)
    if (!ctx) throw new Error(`${name} hook used outside its provider`)
    return ctx
  }

  return { Provider, useRecords }
}
