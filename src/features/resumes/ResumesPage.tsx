import { Loader2, Sparkles } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { PageHeader } from '../../components/layout/PageHeader'
import { AsyncView } from '../../components/ui/AsyncView'
import { formatStamp } from '../../prototype/clock'
import { jobById } from '../../prototype/selectors'
import { ACTION_MS, usePrototype, useSimulatedQuery } from '../../prototype/usePrototype'
import type { ResumeVariant } from '../../prototype/types'
import { CodeBlock } from './CodeBlock'
import { MasterUpload } from './MasterUpload'
import { previewFromTex } from './preview'

const TABS = ['Preview', 'Source', 'Changes', 'History'] as const
type Tab = (typeof TABS)[number]

function Preview({ source }: { source: string }) {
  return (
    <div className="stack">
      <p className="muted mono">Prototype preview, not compiled</p>
      <article className="panel panel__body" aria-label="Resume preview">
        {previewFromTex(source).map((section, i) => (
          <section key={i} className="stack" style={{ marginBottom: 'var(--space-3)' }}>
            {section.heading && <h3>{section.heading}</h3>}
            {section.lines.map((l, j) =>
              l.kind === 'name' ? (
                <p key={j}><strong>{l.text}</strong></p>
              ) : l.kind === 'role' ? (
                <p key={j} className="row row--between">
                  <span><strong>{l.text}</strong>, {l.meta}</span>
                  <span className="muted">{l.right}</span>
                </p>
              ) : l.kind === 'bullet' ? (
                <p key={j} className="secondary">{'•'} {l.text}</p>
              ) : (
                <p key={j} className="secondary">{l.text}</p>
              ),
            )}
          </section>
        ))}
      </article>
    </div>
  )
}

function VariantDetail({ variant }: { variant: ResumeVariant }) {
  const { state, dispatch } = usePrototype()
  const [tab, setTab] = useState<Tab>('Preview')
  const [picked, setPicked] = useState<number | null>(null)
  const [busy, setBusy] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)
  useEffect(() => () => clearTimeout(timer.current), [])

  const latest = variant.versions[variant.versions.length - 1]
  const version = variant.versions.find((v) => v.version === picked) ?? latest
  const job = variant.jobId ? jobById(state, variant.jobId) : undefined

  const generate = () => {
    setBusy(true)
    timer.current = setTimeout(() => {
      dispatch({ type: 'resume/generate', resumeId: variant.id })
      setBusy(false)
      setPicked(null)
    }, ACTION_MS)
  }

  return (
    <div className="stack">
      <div className="row row--between">
        <div>
          <Link to="/resumes">All resumes</Link>
          <h2>{variant.title}</h2>
          {job && <p className="secondary">For {job.company}, {job.title}</p>}
        </div>
        <button type="button" className="btn btn--primary" onClick={generate} disabled={busy}>
          {busy ? <Loader2 size={14} className="spin" aria-hidden="true" /> : <Sparkles size={14} aria-hidden="true" />}
          {busy ? 'Generating...' : 'Generate new version'}
        </button>
      </div>
      <div className="field">
        <label className="field__label" htmlFor="version">Version</label>
        <select id="version" className="input" value={version.version} onChange={(e) => setPicked(Number(e.target.value))}>
          {variant.versions.map((v) => (
            <option key={v.version} value={v.version}>
              v{v.version}
            </option>
          ))}
        </select>
      </div>
      <div className="tabs" role="tablist" aria-label="Resume version">
        {TABS.map((t) => (
          <button key={t} type="button" role="tab" id={`tab-${t}`} className="tab" aria-selected={tab === t} aria-controls="tabpanel" onClick={() => setTab(t)}>
            {t}
          </button>
        ))}
      </div>
      <div role="tabpanel" id="tabpanel" aria-labelledby={`tab-${tab}`}>
        {tab === 'Preview' && <Preview source={version.source} />}
        {tab === 'Source' && <CodeBlock source={version.source} label={`LaTeX source, version ${version.version}`} />}
        {tab === 'Changes' &&
          (version.changes.length === 0 ? (
            <p className="secondary">No changes recorded.</p>
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Section</th>
                    <th>Before</th>
                    <th>After</th>
                    <th>Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {version.changes.map((c, i) => (
                    <tr key={i}>
                      <td>{c.section}</td>
                      <td>{c.before}</td>
                      <td>{c.after}</td>
                      <td>{c.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        {tab === 'History' && (
          <ul className="list">
            {[...variant.versions].reverse().map((v) => (
              <li key={v.version} className="list__item">
                <div className="list__main">
                  <p className="list__title">Version {v.version}</p>
                  <p className="list__meta">{v.summary}</p>
                </div>
                <span className="mono muted">{formatStamp(v.createdAt)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

export function ResumesPage() {
  const { resumeId } = useParams()
  const q = useSimulatedQuery((s) => s.resumes, (r) => r.master === null && r.variants.length === 0)
  const { master, variants } = q.data
  const variant = resumeId ? variants.find((v) => v.id === resumeId) : undefined

  return (
    <div className="stack">
      <PageHeader title="Resumes" subtitle="Your master resume and the versions tailored from it." />
      <AsyncView
        status={q.status}
        onRetry={q.retry}
        emptyTitle="No master resume yet"
        emptyText="Upload your resume as a .tex file. The agent will tailor copies of it for each job."
        emptyAction={<MasterUpload />}
      >
        {resumeId ? (
          variant ? (
            <VariantDetail key={variant.id} variant={variant} />
          ) : (
            <div className="empty">
              <p className="empty__title">That resume version does not exist</p>
              <Link to="/resumes">Back to all resumes</Link>
            </div>
          )
        ) : (
          <div className="stack">
            <section className="panel" aria-labelledby="master-title">
              <div className="panel__header">
                <div>
                  <h2 id="master-title" className="panel__title">Master resume</h2>
                  {master && <p className="panel__subtitle">{master.name}, {(master.size / 1024).toFixed(1)} KB, added {formatStamp(master.uploadedAt)}</p>}
                </div>
              </div>
              <div className="panel__body stack">
                <MasterUpload replace={Boolean(master)} />
                {master ? <CodeBlock source={master.tex} label="Master resume LaTeX source" /> : <p className="secondary">No master resume uploaded.</p>}
              </div>
            </section>
            <section className="panel" aria-labelledby="variants-title">
              <div className="panel__header">
                <h2 id="variants-title" className="panel__title">Tailored versions</h2>
              </div>
              <div className="panel__body">
                {variants.length === 0 ? (
                  <p className="secondary">None yet. They appear when the agent tailors a resume.</p>
                ) : (
                  <ul className="list">
                    {variants.map((v) => (
                      <li key={v.id} className="list__item">
                        <div className="list__main">
                          <Link className="list__title" to={`/resumes/${v.id}`}>{v.title}</Link>
                          <p className="list__meta">{v.versions.length} version{v.versions.length === 1 ? '' : 's'}, latest v{v.versions[v.versions.length - 1].version}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </section>
          </div>
        )}
      </AsyncView>
    </div>
  )
}
