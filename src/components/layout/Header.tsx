import { FlaskConical, RotateCcw } from 'lucide-react'
import { usePrototype } from '../../prototype/usePrototype'
import type { Scenario } from '../../prototype/types'

const SCENARIOS: Array<{ value: Scenario; label: string }> = [
  { value: 'demo', label: 'Demo' },
  { value: 'empty', label: 'New user (empty)' },
  { value: 'error', label: 'Simulate error' },
]

export function Header() {
  const { state, dispatch } = usePrototype()
  return (
    <header className="topbar">
      <span className="wordmark">JobIntel</span>
      <span className="badge badge--warning topbar__chip">
        <FlaskConical size={12} aria-hidden="true" />
        Prototype: simulated agent, no real applications are sent
      </span>
      <div className="topbar__tools">
        <label className="topbar__scenario">
          <span className="sr-only">Scenario</span>
          <select
            className="input"
            value={state.scenario}
            onChange={(e) => dispatch({ type: 'scenario/set', scenario: e.target.value as Scenario })}
          >
            {SCENARIOS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
        <button type="button" className="btn btn--secondary btn--sm" onClick={() => dispatch({ type: 'reset' })}>
          <RotateCcw size={13} aria-hidden="true" />
          Reset
        </button>
      </div>
    </header>
  )
}
