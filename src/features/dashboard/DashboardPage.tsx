import {
  Activity,
  ArrowRight,
  CircleCheck,
  CircleDashed,
  Flag,
  Radar,
  ShieldCheck,
  type LucideIcon,
  Bookmark,
  Users,
  CalendarClock,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { useNow } from '../../components/layout/useNow'
import { calculateReadiness } from '../../domain/profile/readiness'
import { useProfile } from '../profile/useProfile'
import { greetingFor } from './greeting'
import { ROADMAP } from './roadmap'
import './dashboard.css'

interface Kpi {
  label: string
  value: number
  icon: LucideIcon
  phase: number
}

/** All zero in Phase 1: no feature backs these yet, so no number is invented. */
const KPIS: Kpi[] = [
  { label: 'New Jobs', value: 0, icon: Radar, phase: 2 },
  { label: 'Shortlisted', value: 0, icon: Bookmark, phase: 3 },
  { label: 'Referral Leads', value: 0, icon: Users, phase: 4 },
  { label: 'Follow-ups', value: 0, icon: CalendarClock, phase: 5 },
]

export function DashboardPage({ now: nowOverride }: { now?: Date }) {
  const now = useNow(nowOverride)
  const { state, profile } = useProfile()
  const readiness = calculateReadiness(profile)
  const name = profile?.displayName?.split(/\s+/)[0]
  const loading = state.status === 'loading'

  return (
    <div className="dashboard">
      <section className="hero" aria-labelledby="dash-title">
        <div>
          <p className="eyebrow">Command center</p>
          <h1 id="dash-title" className="hero__title">
            {greetingFor(now)}
            {name ? `, ${name}` : ''}
          </h1>
          <p className="hero__subtitle">Your job hunt command center</p>
        </div>
        <div className="hero__actions">
          <span className="badge badge--warning">
            <span className="dot" aria-hidden="true" />
            Discovery not configured · Phase 2 pending
          </span>
          {!loading && (
            <Link to="/profile" className="btn btn--primary">
              {readiness.complete ? 'Edit profile' : 'Complete profile'}
              <ArrowRight size={16} aria-hidden="true" />
            </Link>
          )}
        </div>
      </section>

      {state.status === 'error' && (
        <div className="alert alert--danger" role="alert">
          <ShieldCheck size={16} aria-hidden="true" />
          <span>
            {state.message} <Link to="/profile?section=data">Open data settings</Link>
          </span>
        </div>
      )}

      <section aria-label="Key indicators" className="kpis">
        {KPIS.map((k) => {
          const Icon = k.icon
          return (
            <div key={k.label} className="kpi">
              <div className="kpi__head">
                <span className="kpi__label">{k.label}</span>
                <Icon size={16} aria-hidden="true" className="kpi__icon" />
              </div>
              <span className="kpi__value">{k.value}</span>
              <span className="kpi__hint mono">Available in Phase {k.phase}</span>
            </div>
          )
        })}
      </section>

      <div className="dashboard__grid">
        <section className="panel feed" aria-labelledby="feed-title">
          <div className="panel__header">
            <div>
              <h2 id="feed-title" className="panel__title">
                Job Feed
              </h2>
              <p className="panel__subtitle">Opportunities matched to your profile</p>
            </div>
            <span className="badge">0 jobs</span>
          </div>
          <div className="empty">
            <RadarGraphic />
            <h3 className="empty__title">Your job feed is not connected yet</h3>
            <p className="empty__text">
              Job discovery will be enabled in Phase 2. Complete your profile now so future matches can be ranked
              against your experience.
            </p>
            <Link to="/profile" className="btn btn--secondary">
              Set up candidate profile
            </Link>
          </div>
        </section>

        <aside className="rail-col" aria-label="Setup and milestones">
          <section className="panel" aria-labelledby="setup-title">
            <div className="panel__header">
              <h2 id="setup-title" className="panel__title">
                Today's Setup
              </h2>
              <span className="mono muted">
                {readiness.groups.filter((g) => g.complete).length}/{readiness.groups.length}
              </span>
            </div>
            <ul className="checklist panel__body">
              {readiness.groups.map((g) => (
                <li key={g.id}>
                  <Link to={`/profile?section=${g.section}`} className="checklist__item">
                    {g.complete ? (
                      <CircleCheck size={18} className="checklist__done" aria-hidden="true" />
                    ) : (
                      <CircleDashed size={18} className="muted" aria-hidden="true" />
                    )}
                    <span>{g.label}</span>
                    <span className="sr-only">{g.complete ? ' (complete)' : ' (incomplete)'}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          <section className="panel" aria-labelledby="readiness-title">
            <div className="panel__header">
              <h2 id="readiness-title" className="panel__title">
                Profile readiness
              </h2>
              <span className="readiness__score" data-testid="readiness-score">
                {readiness.score}%
              </span>
            </div>
            <div className="panel__body readiness">
              <div
                className="progress"
                role="progressbar"
                aria-labelledby="readiness-title"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={readiness.score}
              >
                <div className="progress__bar" style={{ width: `${readiness.score}%` }} />
              </div>
              <details className="readiness__details">
                <summary>How this is calculated</summary>
                <p className="field__hint">
                  A fixed weighted checklist. Optional preferences (company, compensation, notice period) don't count.
                </p>
                <ul>
                  {readiness.rules.map((r) => (
                    <li key={r.id}>
                      <span>{r.label}</span>
                      <span className="mono">
                        {Math.round(r.earned)}/{r.weight}
                      </span>
                    </li>
                  ))}
                </ul>
              </details>
            </div>
          </section>

          <section className="panel" aria-labelledby="milestone-title">
            <div className="panel__header">
              <h2 id="milestone-title" className="panel__title">
                Next milestone
              </h2>
              <Flag size={16} className="muted" aria-hidden="true" />
            </div>
            <div className="panel__body milestone">
              <p>
                <strong>Phase 2 · Job discovery.</strong> Scheduled GitHub Actions will collect public openings from
                Greenhouse, Lever and Ashby boards into a static feed. Matching then happens in this browser.
              </p>
              <ol className="roadmap">
                {ROADMAP.map((r) => (
                  <li key={r.phase} className={r.done ? 'is-done' : undefined}>
                    <span className="mono">P{r.phase}</span>
                    <span>{r.label}</span>
                    {r.done && <span className="sr-only">(available)</span>}
                  </li>
                ))}
              </ol>
            </div>
          </section>
        </aside>
      </div>

      <section className="panel activity" aria-labelledby="activity-title">
        <div className="panel__header">
          <h2 id="activity-title" className="panel__title">
            Activity
          </h2>
          <Activity size={16} className="muted" aria-hidden="true" />
        </div>
        <p className="panel__body secondary">
          Activity will appear here once discovery and application tracking are enabled.
        </p>
      </section>
    </div>
  )
}

function RadarGraphic() {
  return (
    <svg className="radar" width="96" height="96" viewBox="0 0 96 96" aria-hidden="true">
      <circle cx="48" cy="48" r="44" fill="none" stroke="var(--border-strong)" />
      <circle cx="48" cy="48" r="30" fill="none" stroke="var(--border)" />
      <circle cx="48" cy="48" r="16" fill="none" stroke="var(--border)" />
      <line x1="48" y1="4" x2="48" y2="92" stroke="var(--border)" />
      <line x1="4" y1="48" x2="92" y2="48" stroke="var(--border)" />
      <path d="M48 48 L48 4 A44 44 0 0 1 86 26 Z" fill="var(--accent-soft)" />
      <line x1="48" y1="48" x2="86" y2="26" stroke="var(--accent)" strokeWidth="1.5" />
      <circle cx="48" cy="48" r="3" fill="var(--accent)" />
    </svg>
  )
}
