import { useEffect } from 'react'
import { AlertCircle } from 'lucide-react'
import { Outlet, useLocation } from 'react-router-dom'
import { useApp } from '../../app/appContext'
import { ToastRegion } from '../ui/Toast'
import { Header } from './Header'
import { Sidebar } from './Sidebar'
import './layout.css'

export function AppShell() {
  const { pathname } = useLocation()
  const { saveFailed } = useApp()

  // Move focus to main content on route change for screen-reader users.
  useEffect(() => {
    document.getElementById('main')?.focus({ preventScroll: true })
    window.scrollTo?.(0, 0)
  }, [pathname])

  return (
    <div className="shell">
      <a
        className="skip-link"
        href="#main"
        onClick={(e) => {
          e.preventDefault()
          document.getElementById('main')?.focus()
        }}
      >
        Skip to content
      </a>
      <Sidebar />
      <div className="shell__main">
        <Header />
        <main id="main" tabIndex={-1} className="content">
          {saveFailed && (
            <div className="alert alert--warning" role="alert" style={{ marginBottom: 'var(--space-4)' }}>
              <AlertCircle size={16} aria-hidden="true" />
              <p>Your changes could not be saved in this browser (storage is blocked or full). They will be lost when you reload.</p>
            </div>
          )}
          <Outlet />
        </main>
      </div>
      <ToastRegion />
    </div>
  )
}
