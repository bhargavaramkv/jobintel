import { useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { ReminderAgent } from '../../features/reminders/ReminderAgent'
import { CommandPalette } from './CommandPalette'
import { Header } from './Header'
import { Sidebar } from './Sidebar'
import './layout.css'

export function AppShell() {
  const [paletteOpen, setPaletteOpen] = useState(false)
  const location = useLocation()

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setPaletteOpen((open) => !open)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // Move focus to main content on route change for screen-reader users.
  useEffect(() => {
    document.getElementById('main')?.focus({ preventScroll: true })
    window.scrollTo?.(0, 0)
  }, [location.pathname])

  return (
    <div className="shell">
      <a className="skip-link" href="#main" onClick={(e) => {
        e.preventDefault()
        document.getElementById('main')?.focus()
      }}>
        Skip to content
      </a>
      <Sidebar />
      <div className="shell__main">
        <Header onOpenCommand={() => setPaletteOpen(true)} />
        <main id="main" tabIndex={-1} className="content">
          <Outlet />
        </main>
      </div>
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
      <ReminderAgent />
    </div>
  )
}
