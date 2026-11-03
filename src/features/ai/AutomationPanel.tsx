import { CircleCheck, ExternalLink, KeyRound, RefreshCw, Save, TriangleAlert, Unplug } from 'lucide-react'
import { useEffect, useState } from 'react'
import { DEFAULT_EXPORT_OPTIONS, type ExportOptions } from '../../domain/ai/context'
import { AUTOMATION_ID, RESUME_MAX, type AutomationSettings } from '../../domain/ai/schema'
import { useAutomationSettings } from './aiContext'
import { SYNC_DONE_EVENT, SYNC_NOW_EVENT } from './AiSyncAgent'
import { ExportSwitches } from './ExportSwitches'
import { githubClient, tokenCreationUrl } from './github'

export const DEFAULT_REPO = 'bhargavaramkv/jobintel-private'

const when = (iso?: string) => (iso ? new Date(iso).toLocaleString() : 'never')

/** Defaults before the first save; `update()` stamps the real time. */
const FRESH: AutomationSettings = {
  id: AUTOMATION_ID,
  repo: DEFAULT_REPO,
  autoSync: false,
  exportOptions: { ...DEFAULT_EXPORT_OPTIONS },
  autoAcceptLowRisk: true,
  importedResults: [],
  updatedAt: '1970-01-01T00:00:00.000Z',
}


export function AutomationPanel() {
  const { settings, save, status } = useAutomationSettings()
  const [repo, setRepo] = useState(DEFAULT_REPO)
  const [token, setToken] = useState('')
  const [consent, setConsent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ kind: 'success' | 'error'; text: string } | null>(null)
  const [resume, setResume] = useState<string | null>(null)
  const connected = !!settings?.token && settings.autoSync

  useEffect(() => {
    const done = () => setBusy(false)
    window.addEventListener(SYNC_DONE_EVENT, done)
    return () => window.removeEventListener(SYNC_DONE_EVENT, done)
  }, [])

  if (status === 'loading') return <p className="secondary" role="status">Loading automation settings…</p>

  const base = settings ?? FRESH
  const update = (patch: Partial<AutomationSettings>) => save({ ...base, ...patch, updatedAt: new Date().toISOString() })

  const connect = async () => {
    setBusy(true)
    setMessage(null)
    try {
      await githubClient(repo.trim(), token.trim()).checkAccess()
      await update({ repo: repo.trim(), token: token.trim(), autoSync: true, consentedAt: new Date().toISOString() })
      setToken('')
      setMessage({ kind: 'success', text: 'Connected. JobIntel now syncs on its own while it is open; the daily routine does the rest.' })
      window.dispatchEvent(new Event(SYNC_NOW_EVENT))
    } catch (err) {
      setBusy(false)
      setMessage({ kind: 'error', text: err instanceof Error ? err.message : String(err) })
    }
  }

  const setOption = <K extends keyof ExportOptions>(key: K, value: ExportOptions[K]) =>
    void update({ exportOptions: { ...base.exportOptions, [key]: value }, consentedAt: new Date().toISOString() })

  const resumeValue = resume ?? base.resumeText ?? ''

  return (
    <div className="stack">
      <section className="panel" aria-labelledby="auto-status-title">
        <div className="panel__header">
          <div>
            <h2 id="auto-status-title" className="panel__title">
              {connected ? 'Automation is on' : 'Automation is off'}
            </h2>
            <p className="panel__subtitle">
              {connected
                ? `Synced with ${base.repo} (private). A Claude routine analyses it every morning; results arrive here by themselves.`
                : 'Connect your private repository once. After that there is nothing to download, paste or import.'}
            </p>
          </div>
        </div>
        <div className="panel__body stack">
          {connected && (
            <ul className="ai-status-list">
              <li>
                Last context sync: <strong>{when(base.lastPushAt)}</strong>
              </li>
              <li>
                Last check for results: <strong>{when(base.lastPullAt)}</strong>
              </li>
              <li>
                Results imported so far: <strong>{base.importedResults.length}</strong>
              </li>
            </ul>
          )}
          {base.lastError && (
            <div className="alert alert--warning" role="status">
              <TriangleAlert size={16} aria-hidden="true" />
              <span>{base.lastError}</span>
            </div>
          )}
          {connected && (
            <div className="ai-actions">
              <button
                type="button"
                className="btn btn--secondary btn--sm"
                disabled={busy}
                onClick={() => {
                  setBusy(true)
                  window.dispatchEvent(new Event(SYNC_NOW_EVENT))
                }}
              >
                <RefreshCw size={14} aria-hidden="true" /> {busy ? 'Syncing…' : 'Sync now'}
              </button>
              <button type="button" className="btn btn--ghost btn--sm" onClick={() => void update({ autoSync: false, token: undefined })}>
                <Unplug size={14} aria-hidden="true" /> Disconnect
              </button>
            </div>
          )}
        </div>
      </section>

      {!connected && (
        <section className="panel" aria-labelledby="auto-connect-title">
          <div className="panel__header">
            <h2 id="auto-connect-title" className="panel__title">
              Connect (one time)
            </h2>
          </div>
          <div className="panel__body stack">
            <ol className="ai-steps">
              <li>
                <a href={tokenCreationUrl()} target="_blank" rel="noopener noreferrer">
                  Create a GitHub token <ExternalLink size={12} aria-hidden="true" />
                </a>
                : under <em>Repository access</em> choose <em>Only select repositories → {DEFAULT_REPO.split('/')[1]}</em>, and under{' '}
                <em>Permissions → Contents</em> choose <em>Read and write</em>. Generate it and copy it.
              </li>
              <li>Paste it below, tick the box, and connect.</li>
            </ol>
            <div className="field">
              <label className="field__label" htmlFor="auto-repo">
                Private repository
              </label>
              <input id="auto-repo" className="input" value={repo} onChange={(e) => setRepo(e.target.value)} spellCheck={false} />
            </div>
            <div className="field">
              <label className="field__label" htmlFor="auto-token">
                GitHub token
              </label>
              <input
                id="auto-token"
                className="input"
                type="password"
                autoComplete="off"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="github_pat_…"
              />
              <span className="field__hint">Stored only in this browser. Never included in backups or sent anywhere except GitHub.</span>
            </div>
            <label className="ack">
              <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
              <span>
                Keep my private repository updated with the data selected below, and let a scheduled Claude routine on my subscription analyse it
                daily. Nothing is ever sent to employers or contacts.
              </span>
            </label>
            <div>
              <button type="button" className="btn btn--primary" disabled={!consent || !token.trim() || busy} onClick={() => void connect()}>
                <KeyRound size={15} aria-hidden="true" /> {busy ? 'Checking…' : 'Connect'}
              </button>
            </div>
          </div>
        </section>
      )}

      {message && (
        <div className={`alert alert--${message.kind === 'success' ? 'success' : 'danger'}`} role="status">
          {message.kind === 'success' ? <CircleCheck size={16} aria-hidden="true" /> : <TriangleAlert size={16} aria-hidden="true" />}
          <span>{message.text}</span>
        </div>
      )}

      <section className="panel" aria-labelledby="auto-resume-title">
        <div className="panel__header">
          <div>
            <h2 id="auto-resume-title" className="panel__title">
              Your resume
            </h2>
            <p className="panel__subtitle">Used for fit, tailoring suggestions and interview prep. Stored in this browser and your private repository.</p>
          </div>
        </div>
        <div className="panel__body stack">
          <div className="field">
            <label className="field__label" htmlFor="auto-resume">
              Resume text
            </label>
            <textarea
              id="auto-resume"
              className="textarea ai-resume"
              rows={10}
              maxLength={RESUME_MAX}
              value={resumeValue}
              onChange={(e) => setResume(e.target.value)}
              placeholder="Paste your resume as plain text. If your private repository already has profile/resume.md, it is filled in automatically."
            />
            <span className="field__hint">
              {resumeValue.length.toLocaleString()} / {RESUME_MAX.toLocaleString()} characters
            </span>
          </div>
          <div>
            <button
              type="button"
              className="btn btn--secondary btn--sm"
              disabled={resume === null || resume === (base.resumeText ?? '')}
              onClick={() => {
                void update({ resumeText: resumeValue.trim() || undefined })
                setResume(null)
              }}
            >
              <Save size={14} aria-hidden="true" /> Save resume
            </button>
          </div>
        </div>
      </section>

      <section className="panel" aria-labelledby="auto-share-title">
        <div className="panel__header">
          <div>
            <h2 id="auto-share-title" className="panel__title">
              What is synced
            </h2>
            <p className="panel__subtitle">Only to your private repository. Changes apply from the next sync.</p>
          </div>
        </div>
        <ExportSwitches options={base.exportOptions} onChange={setOption} className="panel__body" />
        <div className="panel__body">
          <label className="ack">
            <input type="checkbox" checked={base.autoAcceptLowRisk} onChange={(e) => void update({ autoAcceptLowRisk: e.target.checked })} />
            <span>
              Apply notes and follow-up dates automatically (confidence 60% or more). They only add information and can be edited or removed. Everything
              else waits for you.
            </span>
          </label>
        </div>
      </section>
    </div>
  )
}
