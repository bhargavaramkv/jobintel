import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { ToastRegion } from '../ui/Toast'
import { Header } from './Header'
import { Sidebar } from './Sidebar'
import './layout.css'

export function AppShell() {
  const { pathname } = useLocation()

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
          <Outlet />
        </main>
      </div>
      <ToastRegion />
    </div>
  )
}
