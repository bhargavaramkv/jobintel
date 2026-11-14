import { Check, X } from 'lucide-react'
import { useMemo } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { PageHeader } from '../../components/layout/PageHeader'
import { AsyncView } from '../../components/ui/AsyncView'
import { ScoreMeter } from '../../components/ui/ScoreMeter'
import { matchJob, type MatchResult } from '../../domain/match/score'
import { usePrototype, useSimulatedQuery } from '../../prototype/usePrototype'
import type { MockJob, Verdict } from '../../prototype/types'

const VERDICTS: Array<{ id: Verdict; label: string }> = [
  { id: 'selected', label: 'Selected' },
  { id: 'review', label: 'Needs review' },
  { id: 'rejected', label: 'Rejected' },
]

const isVerdict = (v: string | null): v is Verdict => VERDICTS.some((x) => x.id === v)
const jobPath = (id: string, verdict: Verdict) => `/jobs/${encodeURIComponent(id)}?verdict=${verdict}`

function Eligibility({ job, match }: { job: MockJob; match: MatchResult }) {
  const { state } = usePrototype()
  const factor = (id: string) => match.factors.find((f) => f.id === id)
  const fromFactor = (id: string, label: string) => {
    const f = factor(id)
    return { label, ok: f?.value == null ? null : f.value >= 0.5, text: f?.summary ?? '' }
  }
  const modes = state.profile.workModes
  const modeOk = job.workMode === 'unknown' || modes.length === 0 ? null : modes.includes(job.workMode)
  const rows = [
    fromFactor('location', 'Location'),
    fromFactor('seniority', 'Seniority'),
    fromFactor('experience', 'Years of experience'),
    { label: 'Work mode', ok: modeOk, text: `Posting is ${job.workMode}; you accept ${modes.join(', ') || 'any'}` },
  ]
  return (
    <ul className="list" aria-label="Eligibility">
      {rows.map((r) => (
        <li key={r.label} className="list__item">
          <div className="list__main">
            <p className="list__title">{r.label}</p>
            <p className="list__meta">{r.text}</p>
          </div>
          <span className={r.ok === null ? 'badge' : r.ok ? 'badge badge--success' : 'badge badge--danger'}>
            {r.ok === true && <Check size={12} aria-hidden="true" />}
            {r.ok === false && <X size={12} aria-hidden="true" />}
            {r.ok === null ? 'Unknown' : r.ok ? 'Pass' : 'Fail'}
          </span>
        </li>
      ))}
    </ul>
  )
}

function Detail({ job, match }: { job: MockJob; match: MatchResult }) {
  const { state, dispatch } = usePrototype()
  const app = state.applications.find((a) => a.jobId === job.id)
  const verdict = job.agentDecision.verdict
  const skills = match.factors.find((f) => f.id === 'skills')
  return (
    <div className="stack">
      <div>
        <h2>{job.title}</h2>
        <p className="secondary">{job.company}, {job.locations.join(' / ')}, {job.workMode}</p>
        <p className="muted mono" style={{ overflowWrap: 'anywhere' }}>{job.url}</p>
      </div>
      <div className="row">
        <ScoreMeter score={match.score} />
        {app ? (
          <Link className="btn btn--secondary btn--sm" to={`/applications/${app.id}`}>Already queued: view application</Link>
        ) : (
          <button type="button" className="btn btn--primary btn--sm" onClick={() => dispatch({ type: 'job/queue', jobId: job.id })}>
            Queue application
          </button>
        )}
        {verdict !== 'rejected' && (
          <button type="button" className="btn btn--danger btn--sm" onClick={() => dispatch({ type: 'job/override', jobId: job.id })}>
            Override: reject
          </button>
        )}
      </div>
      <section aria-labelledby="why-title">
        <h3 id="why-title">{verdict === 'rejected' ? 'Why rejected' : verdict === 'review' ? 'Why it needs review' : 'Why selected'}</h3>
        <ul>
          {job.agentDecision.reasons.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
      </section>
      <section aria-labelledby="elig-title">
        <h3 id="elig-title">Eligibility</h3>
        <Eligibility job={job} match={match} />
      </section>
      <section aria-labelledby="skills-title">
        <h3 id="skills-title">Skills</h3>
        {skills && skills.matched.length + skills.missing.length > 0 ? (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Skill</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {skills.matched.map((s) => (
                  <tr key={s}><td>{s}</td><td><span className="skill-chip skill-chip--have">Matched</span></td></tr>
                ))}
                {skills.missing.map((s) => (
                  <tr key={s}><td>{s}</td><td><span className="skill-chip skill-chip--miss">Missing</span></td></tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="secondary">{skills?.summary ?? 'No skills to compare.'}</p>
        )}
      </section>
      <section aria-labelledby="desc-title">
        <h3 id="desc-title">Description</h3>
        <p className="secondary">{job.description}</p>
      </section>
      <section aria-labelledby="req-title">
        <h3 id="req-title">Requirements</h3>
        <ul>
          {job.requirements.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
      </section>
    </div>
  )
}

export function DiscoveryPage() {
  const { jobId } = useParams()
  const [params] = useSearchParams()
  const q = useSimulatedQuery((s) => ({ jobs: s.jobs, profile: s.profile }), (d) => d.jobs.length === 0)
  const { jobs, profile } = q.data
  const matches = useMemo(() => new Map(jobs.map((j) => [j.id, matchJob(j, profile)])), [jobs, profile])

  const selected = jobId ? jobs.find((j) => j.id === jobId) : undefined
  const requested = params.get('verdict')
  const verdict: Verdict = selected ? selected.agentDecision.verdict : isVerdict(requested) ? requested : 'selected'
  const list = jobs.filter((j) => j.agentDecision.verdict === verdict)
  const count = (v: Verdict) => jobs.filter((j) => j.agentDecision.verdict === v).length

  return (
    <div className="stack">
      <PageHeader title="Discovery" subtitle="Postings the agent found and what it decided." />
      <AsyncView
        status={q.status}
        onRetry={q.retry}
        emptyTitle="No jobs discovered yet"
        emptyText="Finish onboarding, then start the agent to scan job sources."
        emptyAction={<Link className="btn btn--primary" to="/onboarding">Go to onboarding</Link>}
      >
        <div className="stack">
          <nav className="tabs" aria-label="Agent verdict">
            {VERDICTS.map((v) => (
              <Link key={v.id} className="tab" to={`/jobs?verdict=${v.id}`} aria-current={verdict === v.id ? 'page' : undefined}>
                {v.label} ({count(v.id)})
              </Link>
            ))}
          </nav>
          <div className={selected ? 'split split--detail-only' : 'split split--list-only'}>
            <div className="split__list stack">
              {list.length === 0 && <p className="secondary">No jobs in this tab.</p>}
              {list.map((j) => {
                const m = matches.get(j.id)!
                const chips = (m.factors.find((f) => f.id === 'skills')?.matched ?? []).slice(0, 4)
                return (
                  <Link key={j.id} className="select-row stack" to={jobPath(j.id, verdict)} aria-current={j.id === jobId ? 'true' : undefined}>
                    <span className="list__title">{j.company}, {j.title}</span>
                    <ScoreMeter score={m.score} />
                    <span className="chip-row">
                      {chips.map((c) => (
                        <span key={c} className="skill-chip">{c}</span>
                      ))}
                    </span>
                    {verdict !== 'selected' && <span className="list__meta">{j.agentDecision.reasons.join('. ')}</span>}
                  </Link>
                )
              })}
            </div>
            <div className="split__detail">
              {selected ? (
                <>
                  <Link className="btn btn--ghost btn--sm" to={`/jobs?verdict=${verdict}`}>Back to list</Link>
                  <Detail job={selected} match={matches.get(selected.id)!} />
                </>
              ) : (
                <p className="secondary">Select a job to see why the agent decided as it did.</p>
              )}
            </div>
          </div>
        </div>
      </AsyncView>
    </div>
  )
}
