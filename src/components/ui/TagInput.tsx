import { AlertCircle, X } from 'lucide-react'
import { useId, useRef, useState, type ClipboardEvent, type KeyboardEvent, type ReactNode } from 'react'
import { LIMITS } from '../../domain/profile/schema'
import { splitTagInput, validateTag } from '../../domain/profile/tags'

export interface TagInputProps<T> {
  label: string
  items: T[]
  getLabel: (item: T) => string
  create: (value: string) => T
  onChange: (items: T[]) => void
  placeholder?: string
  hint?: string
  optional?: boolean
  error?: string
  /** Names that are taken by a sibling list (e.g. primary vs secondary skills). */
  reserved?: readonly string[]
  reservedMessage?: (name: string) => string
  renderExtra?: (item: T, index: number) => ReactNode
  suggestions?: readonly string[]
}

/**
 * Keyboard-accessible multi-value input.
 * Enter or comma adds; Backspace on an empty field removes the last tag;
 * each tag has a labelled remove button.
 */
export function TagInput<T>({
  label,
  items,
  getLabel,
  create,
  onChange,
  placeholder = 'Type and press Enter',
  hint,
  optional,
  error,
  reserved = [],
  reservedMessage = (n) => `“${n}” is already used elsewhere`,
  renderExtra,
  suggestions,
}: TagInputProps<T>) {
  const id = useId()
  const [text, setText] = useState('')
  const [localError, setLocalError] = useState<string | null>(null)
  const [announcement, setAnnouncement] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const labels = items.map(getLabel)

  const addMany = (values: string[]) => {
    const next = [...items]
    const added: string[] = []
    for (const raw of values) {
      const result = validateTag(raw, next.map(getLabel))
      if (!result.ok) {
        setLocalError(result.error)
        continue
      }
      const clash = reserved.find((r) => r.toLowerCase() === result.value.toLowerCase())
      if (clash) {
        setLocalError(reservedMessage(clash))
        continue
      }
      next.push(create(result.value))
      added.push(result.value)
    }
    if (added.length) {
      onChange(next)
      setAnnouncement(`Added ${added.join(', ')}`)
      if (added.length === values.length) setLocalError(null)
    }
    return added.length === values.length
  }

  const commit = () => {
    if (!text.trim()) return
    if (addMany(splitTagInput(text))) setText('')
  }

  const remove = (index: number) => {
    const removed = labels[index]
    onChange(items.filter((_, i) => i !== index))
    setAnnouncement(`Removed ${removed}`)
    setLocalError(null)
    inputRef.current?.focus()
  }

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',' || e.key === ';') {
      e.preventDefault()
      commit()
    } else if (e.key === 'Backspace' && text === '' && items.length > 0) {
      e.preventDefault()
      remove(items.length - 1)
    }
  }

  const onPaste = (e: ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData.getData('text')
    const parts = splitTagInput(pasted)
    if (parts.length > 1) {
      e.preventDefault()
      addMany(parts)
    }
  }

  const shown = error ?? localError
  const hintId = `${id}-hint`
  const errorId = `${id}-error`
  const listId = `${id}-suggestions`
  const available = suggestions?.filter((s) => !labels.some((l) => l.toLowerCase() === s.toLowerCase()))

  return (
    <div className="field">
      <label className="field__label" htmlFor={id}>
        {label}
        {optional && <span className="field__optional">Optional</span>}
      </label>
      <div
        className="tag-input"
        data-invalid={shown ? 'true' : undefined}
        onClick={(e) => {
          if (e.target === e.currentTarget) inputRef.current?.focus()
        }}
      >
        <ul className="tag-list" aria-label={`${label} entries`}>
          {items.map((item, i) => {
            const name = getLabel(item)
            return (
              <li key={name} className="tag">
                <span className="tag__text" title={name}>
                  {name}
                </span>
                {renderExtra?.(item, i)}
                <button
                  type="button"
                  className="tag__remove"
                  onClick={() => remove(i)}
                  aria-label={`Remove ${name}`}
                >
                  <X size={13} aria-hidden="true" />
                </button>
              </li>
            )
          })}
        </ul>
        <input
          ref={inputRef}
          id={id}
          className="tag-input__field"
          value={text}
          placeholder={items.length ? 'Add another…' : placeholder}
          onChange={(e) => {
            setText(e.target.value)
            if (localError) setLocalError(null)
          }}
          onKeyDown={onKeyDown}
          onPaste={onPaste}
          onBlur={() => text.trim() && commit()}
          maxLength={LIMITS.tag + 20}
          list={available?.length ? listId : undefined}
          aria-invalid={shown ? 'true' : undefined}
          aria-describedby={[hint ? hintId : '', shown ? errorId : ''].filter(Boolean).join(' ') || undefined}
          autoComplete="off"
        />
        {available?.length ? (
          <datalist id={listId}>
            {available.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
        ) : null}
      </div>
      {hint && (
        <span id={hintId} className="field__hint">
          {hint}
        </span>
      )}
      {shown && (
        <span id={errorId} className="field__error" role="alert">
          <AlertCircle size={13} aria-hidden="true" />
          {shown}
        </span>
      )}
      <span className="sr-only" aria-live="polite">
        {announcement}
      </span>
    </div>
  )
}
