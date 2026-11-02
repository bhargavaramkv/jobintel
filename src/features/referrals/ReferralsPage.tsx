import { ExternalLink, Pencil, Plus, Search, Trash2, Users } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { isActiveStage, stageOf } from '../../domain/jobs/actions'
import {
  LEAD_STATUSES,
  rankLead,
  RELATIONSHIP_KINDS,
  relationshipsOf,
  searchLinks,
  type Contact,
  type LeadStatus,
} from '../../domain/referrals/contacts'
import { useJobActions } from '../jobs/useJobActions'
import { useProfile } from '../profile/useProfile'
import { ConfidenceBadge, LeadForm } from './LeadForm'
import { useContacts } from './useContacts'
import './referrals.css'

export function ReferralsPage() {
  const { profile } = useProfile()
  const { actions } = useJobActions()
  const { contacts, save, remove, status, error } = useContacts()
  const [form, setForm] = useState<{ existing?: Contact; company?: string } | null>(null)
  const [companyFilter, setCompanyFilter] = useState('')
  const [showDismissed, setShowDismissed] = useState(false)

  // Companies with jobs you're pursuing (shortlisted or active applications).
  const pipeline = useMemo(() => {
    const m = new Map<string, number>()
    for (const a of actions.values()) {
      if (a.decision === 'rejected') continue
      if (isActiveStage(stageOf(a))) m.set(a.snapshot.company, (m.get(a.snapshot.company) ?? 0) + 1)
    }
    return m
  }, [actions])
  const focus = useMemo(
    () => ({ pipeline: new Set(pipeline.keys()), targetCompanies: new Set(profile?.targetCompanies ?? []) }),
    [pipeline, profile],
  )

  const leadsByCompany = useMemo(() => {
    const m = new Map<string, number>()
    for (const c of contacts.values()) if (c.status !== 'dismissed') m.set(c.company.toLowerCase(), (m.get(c.company.toLowerCase()) ?? 0) + 1)
    return m
  }, [contacts])

  const coverage = useMemo(
    () =>
      [...new Set([...pipeline.keys(), ...(profile?.targetCompanies ?? [])])]
        .map((company) => ({ company, jobs: pipeline.get(company) ?? 0, leads: leadsByCompany.get(company.toLowerCase()) ?? 0 }))
        .sort((a, b) => a.leads - b.leads || b.jobs - a.jobs || a.company.localeCompare(b.company)),
    [pipeline, profile, leadsByCompany],
  )

  const ranked = useMemo(
    () =>
      [...contacts.values()]
        .filter((c) => showDismissed || c.status !== 'dismissed')
        .filter((c) => !companyFilter || c.company === companyFilter)
        .map((c) => ({ c, rank: rankLead(c, profile, focus), rels: relationshipsOf(c, profile) }))
        .sort((a, b) => b.rank.score - a.rank.score || a.c.name.localeCompare(b.c.name)),
    [contacts, profile, focus, companyFilter, showDismissed],
  )
  const companies = useMemo(() => [...new Set([...contacts.values()].map((c) => c.company))].sort(), [contacts])
  const roleHint = profile?.targetRoles[0] ?? 'software engineer'

  const setStatus = (c: Contact, s: LeadStatus) => save({ ...c, status: s, updatedAt: nowIso() })

  return (
    <div className="referrals">
      <header className="profile__header">
        <div>
          <p className="eyebrow">Referrals</p>
          <h1 className="profile__title">Referral leads</h1>
          <p className="secondary profile__lede">
            People who could refer you, recorded by you from public pages. Relationships come only from facts you record, so
            nothing is claimed without evidence. Stored in this browser only.
          </p>
        </div>
        <button type="button" className="btn btn--primary" onClick={() => setForm({})}>
          <Plus size={15} aria-hidden="true" /> Add lead
        </button>
      </header>

      {status === 'error' && (
        <div className="alert alert--danger" role="alert">
          {error}
        </div>
      )}

      <section className="panel" aria-labelledby="cover-title">
        <div className="panel__header">
          <h2 id="cover-title" className="panel__title">
            Companies to cover
          </h2>
        </div>
        <div className="panel__body">
          {coverage.length === 0 ? (
            <p className="secondary">
              Shortlist jobs in <Link to="/jobs">Job Discovery</Link> or add target companies in your{' '}
              <Link to="/profile?section=company">profile</Link>. Companies appear here so you can look for referrals.
            </p>
          ) : (
            <ul className="cover">
              {coverage.map((row) => (
                <li key={row.company} className="cover__row">
                  <span className="cover__company">{row.company}</span>
                  <span className="mono muted">
                    {row.jobs ? `${row.jobs} job${row.jobs > 1 ? 's' : ''} in pipeline` : 'target company'} · {row.leads} lead
                    {row.leads === 1 ? '' : 's'}
                  </span>
                  <span className="cover__actions">
                    <details className="cover__search">
                      <summary className="btn btn--ghost btn--sm">
                        <Search size={13} aria-hidden="true" /> Find people
                      </summary>
                      <div className="cover__links">
                        <p className="field__hint">Opens a public search in a new tab. JobIntel doesn’t fetch or store results.</p>
                        {searchLinks(row.company, roleHint).map((l) => (
                          <a key={l.url} href={l.url} target="_blank" rel="noopener noreferrer">
                            {l.label} <ExternalLink size={12} aria-hidden="true" />
                          </a>
                        ))}
                      </div>
                    </details>
                    <button type="button" className="btn btn--secondary btn--sm" onClick={() => setForm({ company: row.company })}>
                      <Plus size={13} aria-hidden="true" /> Add lead
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section aria-labelledby="leads-title" className="stack">
        <div className="leads__bar">
          <h2 id="leads-title" className="panel__title">
            Leads <span className="mono muted">{ranked.length}</span>
          </h2>
          {companies.length > 1 && (
            <label className="filters__select">
              <span className="field__label">Company</span>
              <select className="select" value={companyFilter} onChange={(e) => setCompanyFilter(e.target.value)}>
                <option value="">All</option>
                {companies.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label className="ack">
            <input type="checkbox" checked={showDismissed} onChange={(e) => setShowDismissed(e.target.checked)} />
            <span>Show dismissed</span>
          </label>
        </div>

        {ranked.length === 0 ? (
          <section className="panel">
            <div className="empty">
              <Users size={36} className="muted" aria-hidden="true" />
              <h3 className="empty__title">No referral leads yet</h3>
              <p className="empty__text">
                Use “Find people” on a company, then add the people worth contacting with the link where you found them.
              </p>
            </div>
          </section>
        ) : (
          <ul className="leads">
            {ranked.map(({ c, rank, rels }) => (
              <li key={c.id} className={`lead ${c.status === 'dismissed' ? 'is-dismissed' : ''}`}>
                <article aria-labelledby={`lead-${c.id}`}>
                  <div className="lead__head">
                    <h3 id={`lead-${c.id}`} className="lead__name">
                      {c.profileUrl ? (
                        <a href={c.profileUrl} target="_blank" rel="noopener noreferrer">
                          {c.name} <ExternalLink size={12} aria-hidden="true" />
                        </a>
                      ) : (
                        c.name
                      )}
                    </h3>
                    <span className="mono muted" title="Ranking score: shared context + relevance">
                      rank {rank.score}
                    </span>
                  </div>
                  <p className="secondary">
                    {c.role ? `${c.role} · ` : ''}
                    {c.company}
                  </p>
                  <ul className="lead__rels" aria-label="Relationship evidence">
                    {rels.map((r) => (
                      <li key={r.kind}>
                        <ConfidenceBadge confidence={r.confidence} /> <strong>{RELATIONSHIP_KINDS[r.kind].label}</strong>{' '}
                        <span className="secondary">· {r.evidence}</span>
                      </li>
                    ))}
                  </ul>
                  {rank.reasons.length > 0 && <p className="mono muted lead__why">{rank.reasons.join(' · ')}</p>}
                  <p className="field__hint">
                    Source:{' '}
                    <a href={c.sourceUrl} target="_blank" rel="noopener noreferrer">
                      {hostOf(c.sourceUrl)}
                    </a>
                  </p>
                  {c.note && <p className="job__note">{c.note}</p>}
                  <div className="lead__actions" role="group" aria-label={`Actions for ${c.name}`}>
                    <label className="filters__select">
                      <span className="sr-only">Status for {c.name}</span>
                      <select className="select select--sm" value={c.status} onChange={(e) => void setStatus(c, e.target.value as LeadStatus)}>
                        {LEAD_STATUSES.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <button type="button" className="btn btn--ghost btn--sm" onClick={() => setForm({ existing: c })}>
                      <Pencil size={13} aria-hidden="true" /> Edit
                    </button>
                    <button
                      type="button"
                      className="btn btn--ghost btn--sm"
                      onClick={() => {
                        if (window.confirm(`Delete ${c.name}? This removes the lead from this browser.`)) void remove(c.id)
                      }}
                    >
                      <Trash2 size={13} aria-hidden="true" /> Delete
                    </button>
                  </div>
                </article>
              </li>
            ))}
          </ul>
        )}
      </section>

      {form && (
        <LeadForm
          key={form.existing?.id ?? form.company ?? 'new'}
          open
          existing={form.existing}
          company={form.company}
          profile={profile}
          onClose={() => setForm(null)}
          onSave={async (c) => {
            await save(c)
            setForm(null)
          }}
        />
      )}
    </div>
  )
}

const nowIso = () => new Date().toISOString()

function hostOf(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}
