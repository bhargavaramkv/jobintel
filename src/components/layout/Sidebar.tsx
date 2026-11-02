import { NavLink } from 'react-router-dom'
import { NAV_ITEMS } from '../../app/navigation'
import { useProfile } from '../../features/profile/useProfile'
import { initialsFor } from './initials'

export function Sidebar() {
  const { profile } = useProfile()
  const initials = initialsFor(profile?.displayName)

  return (
    <nav className="rail" aria-label="Primary">
      <div className="rail__brand" aria-hidden="true">
        <svg viewBox="0 0 32 32" width="30" height="30">
          <rect x="0.5" y="0.5" width="31" height="31" rx="7.5" fill="#0D1420" stroke="#1D2A3A" />
          <path d="M13 8v11.5a3.5 3.5 0 0 1-6 2.4" fill="none" stroke="#16B8FF" strokeWidth="2.6" strokeLinecap="round" />
          <rect x="17" y="21" width="8" height="2.6" rx="1.3" fill="#16B8FF" />
        </svg>
      </div>

      <ul className="rail__list">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon
          if (item.kind === 'active') {
            return (
              <li key={item.id} className={item.id === 'profile' ? 'rail__item rail__item--end' : 'rail__item'}>
                <NavLink
                  to={item.path}
                  end={item.path === '/'}
                  className={({ isActive }) => (isActive ? 'rail__link is-active' : 'rail__link')}
                  title={item.label}
                >
                  <Icon size={20} strokeWidth={1.75} aria-hidden="true" />
                  <span className="rail__label" aria-hidden="true">{item.shortLabel}</span>
                  <span className="sr-only">{item.label}</span>
                </NavLink>
              </li>
            )
          }
          return (
            <li key={item.id} className="rail__item rail__item--planned">
              <span
                className="rail__link is-planned"
                aria-disabled="true"
                title={`${item.label}: planned for Phase ${item.phase}`}
              >
                <Icon size={20} strokeWidth={1.75} aria-hidden="true" />
                <span className="rail__label" aria-hidden="true">P{item.phase}</span>
                <span className="sr-only">
                  {item.label}, planned for Phase {item.phase}, not available yet
                </span>
              </span>
            </li>
          )
        })}
      </ul>

      <NavLink to="/profile" className="rail__avatar" title="Local profile">
        <span aria-hidden="true">{initials}</span>
        <span className="sr-only">Local profile</span>
      </NavLink>
    </nav>
  )
}
