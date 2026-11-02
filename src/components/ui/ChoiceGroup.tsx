import { Check } from 'lucide-react'

interface ChoiceGroupProps<T extends string> {
  legend: string
  options: ReadonlyArray<{ value: T; label: string }>
  selected: readonly T[]
  onChange: (next: T[]) => void
  hint?: string
}

/** Multi-select rendered as accessible checkbox chips. */
export function ChoiceGroup<T extends string>({ legend, options, selected, onChange, hint }: ChoiceGroupProps<T>) {
  const toggle = (value: T) => {
    const next = selected.includes(value) ? selected.filter((v) => v !== value) : [...selected, value]
    // Keep stored order stable regardless of click order.
    onChange(options.map((o) => o.value).filter((v) => next.includes(v)))
  }
  return (
    <fieldset className="field choices-field">
      <legend className="field__label">{legend}</legend>
      <div className="choices">
        {options.map((o) => (
          <label key={o.value} className="choice">
            <input type="checkbox" checked={selected.includes(o.value)} onChange={() => toggle(o.value)} />
            <span>
              <Check className="choice__check" aria-hidden="true" />
              {o.label}
            </span>
          </label>
        ))}
      </div>
      {hint && <span className="field__hint">{hint}</span>}
    </fieldset>
  )
}
