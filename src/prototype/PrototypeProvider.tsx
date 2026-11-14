import { useEffect, useMemo, useReducer, type ReactNode } from 'react'
import { initialState, reducer } from './store'
import { PrototypeContext } from './usePrototype'
import type { Scenario } from './types'

const TICK_MS = 1500

export function PrototypeProvider({ children, scenario = 'demo' }: { children: ReactNode; scenario?: Scenario }) {
  const [state, dispatch] = useReducer(reducer, scenario, initialState)
  const running = state.run.status === 'running'

  useEffect(() => {
    if (!running) return
    const id = setInterval(() => dispatch({ type: 'agent/tick' }), TICK_MS)
    return () => clearInterval(id)
  }, [running])

  const value = useMemo(() => ({ state, dispatch }), [state])
  return <PrototypeContext.Provider value={value}>{children}</PrototypeContext.Provider>
}
