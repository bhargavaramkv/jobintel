import { HardDrive, Search } from 'lucide-react'
import { APP_VERSION } from '../../app/version'
import { isMacPlatform } from './platform'
import { useNow } from './useNow'

interface HeaderProps {
  onOpenCommand: () => void
  now?: Date
}

export function Header({ onOpenCommand, now: nowOverride }: HeaderProps) {
  const now = useNow(nowOverride)
  const mac = isMacPlatform()
  const date = now.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })

  return (
    <header className="topbar">
      <div className="topbar__brand">
        <span className="wordmark">
          JobIntel<span className="wordmark__cursor">_</span>
        </span>
        <span className="badge">v{APP_VERSION}</span>
      </div>

      <button type="button" className="command-trigger" onClick={onOpenCommand} aria-haspopup="dialog">
        <Search size={16} aria-hidden="true" />
        <span className="command-trigger__text">Jump to a screen or action…</span>
        <span className="command-trigger__keys" aria-hidden="true">
          <kbd>{mac ? '⌘' : 'Ctrl'}</kbd>
          <kbd>K</kbd>
        </span>
        <span className="sr-only">(shortcut {mac ? 'Command' : 'Control'} K)</span>
      </button>

      <div className="topbar__status">
        <span className="badge" title="Your profile is stored only in this browser (IndexedDB)">
          <HardDrive size={12} aria-hidden="true" />
          Local only
        </span>
        <time className="mono muted topbar__date" dateTime={now.toISOString().slice(0, 10)}>
          {date}
        </time>
      </div>
    </header>
  )
}
