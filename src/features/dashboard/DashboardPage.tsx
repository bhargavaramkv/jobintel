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
import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useNow } from '../../components/layout/useNow'
import { applyFilters, DEFAULT_FILTERS, feedFreshness, NEW_WINDOW_DAYS, newJobs, preferencesFromProfile, relativeTime, sortJobs } from '../../domain/jobs/filters'
import { calculateReadiness } from '../../domain/profile/readiness'
import { JobCard } from '../jobs/JobCard'
import { useJobActions } from '../jobs/useJobActions'
import { useContacts } from '../referrals/useContacts'
import { useOutreach } from '../outreach/outreachContext'
import { followUpState } from '../../domain/outreach/drafts'
import { threadOf } from '../../domain/outreach/messages'
import { dueApplicationFollowUps } from '../../domain/applications/pipeline'
import { assessJob, hasSignals, targetLevels } from '../../domain/jobs/feedback'
import { localDate, stageOf } from '../../domain/jobs/actions'
import { matchJob, matchRank } from '../../domain/match/score'
import { useJobFeed } from '../jobs/jobFeed'
import { useProfile } from '../profile/useProfile'
import { greetingFor } from './greeting'
import { NEXT_MILESTONE, ROADMAP } from './roadmap'
import { RemindersPanel } from '../reminders/RemindersPanel'
import './dashboard.css'

interface Kpi {
  label: string
  value: number | null
  icon: LucideIcon
  hint: string
}


export function DashboardPage({ now: nowOverride }: { now?: Date }) {
  const now = useNow(nowOverride)
  const { state, profile } = useProfile()
  const readiness = calculateReadiness(profile)
  const name = profile?.displayName?.split(/\s+/)[0]
  const loading = state.status === 'loading'
  const { state: feedState } = useJobFeed()
  const feed = feedState.status === 'ready' ? feedState.feed : null
  const prefs = useMemo(() => preferencesFromProfile(profile), [profile])
  const { actions, learned } = useJobActions()
  const targets = useMemo(() => targetLevels(profile?.targetSeniority ?? []), [profile])
  const ranked = hasSignals(learned, targets)
  // Jobs still to review: fit preferences, not yet decided, not from a hidden company.
  // Ranked by what was learned from past decisions, newest first within equal rank.
  const matching = useMemo(() => {
    if (!feed) return []
    const pool = applyFilters(feed.jobs, DEFAULT_FILTERS, prefs, now).filter(
      (j) => !actions.get(j.id)?.decision && !stageOf(actions.get(j.id)) && !assessJob(j, learned).hidden,
    )
    const newest = sortJobs(pool, 'newest')
    const canMatch = !!profile && profile.primarySkills.length + profile.secondarySkills.length > 0
    if (!ranked && !canMatch) return newest
    const score = new Map(newest.map((j) => [j.id, assessJob(j, learned, targets).score]))
    const fit = new Map(canMatch ? newest.map((j) => [j.id, matchRank(matchJob(j, profile, targets))]) : [])
    return newest.sort((a, b) => (fit.get(b.id) ?? 0) - (fit.get(a.id) ?? 0) || score.get(b.id)! - score.get(a.id)!)
  }, [feed, prefs, now, actions, learned, targets, ranked, profile])
  const { contacts } = useContacts()
  const { messages } = useOutreach()
  const followUpsDue = useMemo(() => {
    const day = localDate(now)
    return [...contacts.values()].filter((c) => {
      if (c.status === 'dismissed') return false
      const t = threadOf(messages.values(), c.id)
      const f = followUpState(t.sent, t.replied)
      return !!f.dueOn && f.dueOn <= day
    }).length + dueApplicationFollowUps(actions.values(), day).length
  }, [contacts, messages, actions, now])
  const leadCount = useMemo(() => [...contacts.values()].filter((c) => c.status !== 'dismissed').length, [contacts])
  const appliedCount = useMemo(() => [...actions.values()].filter((a) => a.decision === 'applied').length, [actions])
  const fresh = useMemo(() => newJobs(matching, NEW_WINDOW_DAYS, now), [matching, now])
  const freshness = feedFreshness(feed?.lastSuccessfulScanAt, now)
  const kpis: Kpi[] = [
    {
      label: 'New Jobs',
      value: feed ? fresh.length : feedState.status === 'loading' ? null : 0,
      icon: Radar,
      hint: feed ? `First seen in the last ${NEW_WINDOW_DAYS} days`+ (prefs.active ? ' · your preferences' : '') : 'Waiting for the first scan',
    },
    {
      label: 'Applied',
      value: appliedCount,
      icon: Bookmark,
      hint: appliedCount ? 'Marked by you in this browser' : 'Mark jobs as applied to count them',
    },
    {
      label: 'Referral Leads',
      value: leadCount,
      icon: Users,
      hint: leadCount ? 'Recorded by you, with sources' : 'Add leads in Referrals',
    },
    {
      label: 'Follow-ups',
      value: followUpsDue,
      icon: CalendarClock,
      hint: followUpsDue ? 'Due today or overdue' : 'None due',
    },
  ]

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
          {freshness.kind === 'none' ? (
            <span className="badge badge--warning">
              <span className="dot" aria-hidden="true" />
              {feedState.status === 'loading' ? 'Loading job feed…' : 'Waiting for the first discovery scan'}
            </span>
          ) : (
            <span className={freshness.kind === 'stale' ? 'badge badge--warning' : 'badge badge--success'}>
              <span className="dot" aria-hidden="true" />
              Discovery {freshness.kind === 'stale' ? 'feed is stale' : 'active'} · last scan {relativeTime(freshness.at, now)}
            </span>
          )}
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
        {kpis.map((k) => {
          const Icon = k.icon
          return (
            <div key={k.label} className="kpi">
              <div className="kpi__head">
                <span className="kpi__label">{k.label}</span>
                <Icon size={16} aria-hidden="true" className="kpi__icon" />
              </div>
              <span className="kpi__value">{k.value ?? '–'}</span>
              <span className="kpi__hint mono">{k.hint}</span>
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
              <p className="panel__subtitle">
                {ranked
                  ? 'Ranked by your target seniority and applied / not-interested history'
                  : prefs.active
                    ? 'Newest openings that fit your location and work preferences'
                    : 'Newest openings'}
              </p>
            </div>
            <span className="badge">{matching.length} jobs</span>
          </div>
          {matching.length > 0 ? (
            <div className="panel__body feed__list">
              {matching.slice(0, 5).map((j) => (
                <JobCard
                  key={j.id}
                  job={j}
                  record={actions.get(j.id)}
                  now={now}
                  isNew={fresh.some((f) => f.id === j.id)}
                  assessment={ranked ? assessJob(j, learned, targets) : undefined}
                  match={profile ? matchJob(j, profile, targets) : undefined}
                />
              ))}
              <Link to="/jobs" className="btn btn--secondary feed__all">
                Review all {matching.length} in Job Discovery
                <ArrowRight size={16} aria-hidden="true" />
              </Link>
            </div>
          ) : (
            <div className="empty">
              <RadarGraphic />
              <h3 className="empty__title">
                {feedState.status === 'loading'
                  ? 'Loading the job feed…'
                  : feed
                    ? 'No open jobs fit your preferences right now'
                    : 'No discovery scan has run yet'}
              </h3>
              <p className="empty__text">
                {feed
                  ? 'New openings are collected a few times a day. Widen your locations or work modes to see more.'
                  : 'Jobs appear after the scheduled collector publishes its first feed.'}
              </p>
              <Link to={feed ? '/jobs' : '/profile'} className="btn btn--secondary">
                {feed ? 'Browse all jobs' : 'Review candidate profile'}
              </Link>
            </div>
          )}
        </section>

        <aside className="rail-col" aria-label="Setup and milestones">
          <RemindersPanel now={now} />
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
              {NEXT_MILESTONE ? (
                <p>
                  <strong>
                    Phase {NEXT_MILESTONE.phase} · {NEXT_MILESTONE.label}.
                  </strong>{' '}
                  {NEXT_MILESTONE.blurb}
                </p>
              ) : (
                <p>All planned phases are available.</p>
              )}
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
