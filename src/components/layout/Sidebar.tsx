import { NavLink } from 'react-router-dom'
import { NAV_ITEMS } from '../../app/navigation'

/** Left rail on desktop, bottom bar under 768px. */
export function Sidebar() {
  return (
    <nav className="rail" aria-label="Primary">
      <div className="rail__brand" aria-hidden="true">
        <svg viewBox="0 0 32 32" width="30" height="30">
          <rect x="0.5" y="0.5" width="31" height="31" rx="7.5" fill="#0A111C" stroke="#172335" />
          <path d="M13 8v11.5a3.5 3.5 0 0 1-6 2.4" fill="none" stroke="#22B8FF" strokeWidth="2.6" strokeLinecap="round" />
          <rect x="17" y="21" width="8" height="2.6" rx="1.3" fill="#22B8FF" />
        </svg>
      </div>
      <ul className="rail__list">
        {NAV_ITEMS.map(({ id, label, shortLabel, path, icon: Icon }) => (
          <li key={id} className="rail__item">
            <NavLink to={path} end={path === '/'} className={({ isActive }) => (isActive ? 'rail__link is-active' : 'rail__link')} title={label}>
              <Icon size={20} strokeWidth={1.75} aria-hidden="true" />
              <span className="rail__label" aria-hidden="true">{shortLabel}</span>
              <span className="sr-only">{label}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
