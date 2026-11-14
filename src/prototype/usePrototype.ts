import { createContext, useContext, useEffect, useState, type Dispatch } from 'react'
import type { Action } from './store'
import type { PrototypeState } from './types'

export interface PrototypeContextValue {
  state: PrototypeState
  dispatch: Dispatch<Action>
}

export const PrototypeContext = createContext<PrototypeContextValue | null>(null)

export function usePrototype(): PrototypeContextValue {
  const ctx = useContext(PrototypeContext)
  if (!ctx) throw new Error('usePrototype must be used inside PrototypeProvider')
  return ctx
}

const IS_TEST = import.meta.env.MODE === 'test'
/** Simulated network latency for list loads. */
export const LOAD_MS = IS_TEST ? 0 : 400
/** Simulated work time for actions such as "Generate new version". */
export const ACTION_MS = IS_TEST ? 0 : 1000

export type QueryStatus = 'loading' | 'error' | 'empty' | 'ready'
export interface SimulatedQuery<T> {
  status: QueryStatus
  data: T
  retry: () => void
}

/** Selects data from the prototype state and simulates loading, empty and error states. */
export function useSimulatedQuery<T>(select: (s: PrototypeState) => T, isEmpty: (data: T) => boolean = () => false): SimulatedQuery<T> {
  const { state } = usePrototype()
  const [attempt, setAttempt] = useState(0)
  const key = `${attempt}|${state.scenario}`
  const [loadedKey, setLoadedKey] = useState('')

  useEffect(() => {
    if (LOAD_MS === 0) return
    const t = setTimeout(() => setLoadedKey(key), LOAD_MS)
    return () => clearTimeout(t)
  }, [key])

  const loaded = LOAD_MS === 0 || loadedKey === key
  const data = select(state)
  const status: QueryStatus = !loaded ? 'loading' : state.scenario === 'error' ? 'error' : isEmpty(data) ? 'empty' : 'ready'
  return { status, data, retry: () => setAttempt((n) => n + 1) }
}
