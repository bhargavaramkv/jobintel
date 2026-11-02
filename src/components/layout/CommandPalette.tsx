import { CornerDownLeft, LayoutDashboard, Radar, Search, UserRound } from 'lucide-react'
import { useId, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { PROFILE_SECTIONS } from '../../app/navigation'
import { useDialogFocus } from '../ui/useDialogFocus'

interface Command {
  id: string
  label: string
  group: 'Navigate' | 'Profile'
  to: string
  keywords?: string
}

/** Only implemented destinations. Searching jobs happens on the Job Discovery page. */
const COMMANDS: Command[] = [
  { id: 'go-dashboard', label: 'Go to Dashboard', group: 'Navigate', to: '/', keywords: 'home overview' },
  { id: 'go-jobs', label: 'Go to Job Discovery', group: 'Navigate', to: '/jobs', keywords: 'jobs openings feed search' },
  { id: 'go-profile', label: 'Go to Profile & Preferences', group: 'Navigate', to: '/profile', keywords: 'settings' },
  ...PROFILE_SECTIONS.map((s) => ({
    id: `profile-${s.id}`,
    label: `Edit ${s.label.toLowerCase()}`,
    group: 'Profile' as const,
    to: `/profile?section=${s.id}`,
    keywords: s.id === 'data' ? 'backup export import encrypted clear delete' : undefined,
  })),
]

export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  // Mount only while open so query/selection state resets on every opening.
  return open ? <PaletteDialog onClose={onClose} /> : null
}

function PaletteDialog({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const dialogRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const listId = useId()
  useDialogFocus(true, dialogRef, inputRef)

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return COMMANDS
    return COMMANDS.filter((c) => `${c.label} ${c.group} ${c.keywords ?? ''}`.toLowerCase().includes(q))
  }, [query])

  const run = (cmd: Command | undefined) => {
    if (!cmd) return
    onClose()
    navigate(cmd.to)
  }

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((i) => (results.length ? (i + 1) % results.length : 0))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((i) => (results.length ? (i - 1 + results.length) % results.length : 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      run(results[active])
    } else if (e.key === 'Escape') {
      e.preventDefault()
      onClose()
    }
  }

  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div
        ref={dialogRef}
        className="dialog palette"
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        onKeyDown={onKeyDown}
      >
        <div className="palette__search">
          <Search size={16} aria-hidden="true" />
          <input
            ref={inputRef}
            className="palette__input"
            placeholder="Jump to a screen or profile section…"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setActive(0)
            }}
            role="combobox"
            aria-expanded="true"
            aria-controls={listId}
            aria-activedescendant={results[active] ? `${listId}-${results[active].id}` : undefined}
            aria-label="Search commands"
          />
          <kbd>Esc</kbd>
        </div>
        <ul id={listId} className="palette__list" role="listbox" aria-label="Commands">
          {results.length === 0 && (
            <li className="palette__empty">
              No matching command.
            </li>
          )}
          {results.map((cmd, i) => {
            const Icon = cmd.to === '/' ? LayoutDashboard : cmd.to === '/jobs' ? Radar : UserRound
            return (
              <li
                key={cmd.id}
                id={`${listId}-${cmd.id}`}
                role="option"
                aria-selected={i === active}
                className={i === active ? 'palette__item is-active' : 'palette__item'}
                onMouseEnter={() => setActive(i)}
                onClick={() => run(cmd)}
              >
                <Icon size={16} aria-hidden="true" />
                <span>{cmd.label}</span>
                <span className="palette__group mono">{cmd.group}</span>
                {i === active && <CornerDownLeft size={14} aria-hidden="true" className="muted" />}
              </li>
            )
          })}
        </ul>
        <div className="palette__footer mono muted">Navigation only in v0.1 · ↑↓ to move · Enter to open</div>
      </div>
    </div>
  )
}
