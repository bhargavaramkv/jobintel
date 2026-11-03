import { ClipboardCopy, Download, FileDown, ShieldCheck, Upload } from 'lucide-react'
import { useMemo, useState } from 'react'
import {
  approxTokens,
  buildAiContext,
  chatPrompt,
  DEFAULT_EXPORT_OPTIONS,
  exportRecordOf,
  MAX_TOP_MATCHES,
  serializeContext,
  type ExportOptions,
} from '../../domain/ai/context'
import { useNow } from '../../components/layout/useNow'
import { localDate } from '../../domain/jobs/actions'
import { useJobFeed } from '../jobs/jobFeed'
import { useJobActions } from '../jobs/useJobActions'
import { useOutreach } from '../outreach/outreachContext'
import { downloadJson } from '../profile/download'
import { useProfile } from '../profile/useProfile'
import { useContacts } from '../referrals/useContacts'
import { useAiExports } from './aiContext'
import { ImportDialog } from './ImportDialog'

type Switch = Exclude<keyof ExportOptions, 'topMatches'>
const SWITCHES: Array<{ key: Switch; label: string; hint: string; sensitive?: boolean; needs?: Switch }> = [
  { key: 'profile', label: 'Profile preferences', hint: 'Skills, target roles and seniority, locations, work modes, company types, target companies, years of experience, summary.' },
  { key: 'identity', label: 'Identifying details', hint: 'Your name, current and past employers, schools. Off by default.', sensitive: true, needs: 'profile' },
  { key: 'compensation', label: 'Compensation and notice period', hint: 'Off by default.', sensitive: true, needs: 'profile' },
  { key: 'pipeline', label: 'Jobs in your pipeline', hint: 'Shortlisted through offer: the public posting text and the match breakdown.' },
  { key: 'applications', label: 'Application history', hint: 'Stages, dates, interviews, follow-up dates and Not-interested reasons. No notes.' },
  { key: 'notes', label: 'Your private notes', hint: 'Free-text notes, next actions, interview notes and company feedback. Off by default.', sensitive: true },
  { key: 'referrals', label: 'Referral leads', hint: 'Relationship type and confidence plus message counts, only for leads at companies in your pipeline or targets. No contact details, notes or messages.' },
  { key: 'referralNames', label: 'Names of referral leads', hint: 'Off by default. Recommendations rarely need names.', sensitive: true, needs: 'referrals' },
]

const NEVER = [
  'Message text and drafts you wrote to people',
  'Lead profile links, source links and personal notes about people',
  'Email addresses or phone numbers (JobIntel stores none)',
  'Your resume or any file',
  'Encrypted backups and passphrases',
]

const newContextId = () => globalThis.crypto?.randomUUID?.() ?? `ctx-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`

export function ExportPanel() {
  const { profile } = useProfile()
  const { actions } = useJobActions()
  const { contacts } = useContacts()
  const { messages } = useOutreach()
  const { state } = useJobFeed()
  const { save: saveExport } = useAiExports()
  const [options, setOptions] = useState<ExportOptions>(DEFAULT_EXPORT_OPTIONS)
  const [contextId, setContextId] = useState(newContextId)
  const [consent, setConsent] = useState(false)
  const [showRaw, setShowRaw] = useState(false)
  const [notice, setNotice] = useState<{ kind: 'success' | 'error'; text: string } | null>(null)
  const [importOpen, setImportOpen] = useState(false)
  // The app clock (refreshes each minute), so `asOf` stays correct if the tab is left open past midnight.
  const stamp = useNow()

  const jobs = useMemo(() => (state.status === 'ready' ? state.feed.jobs : []), [state])
  const bundle = useMemo(
    () => buildAiContext({ profile, actions: actions.values(), jobs, contacts: contacts.values(), messages: messages.values(), now: stamp }, options, contextId),
    [profile, actions, jobs, contacts, messages, options, contextId, stamp],
  )
  const text = useMemo(() => serializeContext(bundle), [bundle])
  const bytes = useMemo(() => new TextEncoder().encode(text).length, [text])
  const apps = bundle.applications as { records: unknown[]; notInterested: unknown[] } | undefined
  const fileName = `jobintel-ai-context-${localDate(stamp)}.json`

  const set = <K extends keyof ExportOptions>(key: K, value: ExportOptions[K]) => {
    setOptions((o) => ({ ...o, [key]: value }))
    setConsent(false) // changing what is shared requires fresh consent
  }

  const finish = async (what: string) => {
    // The export itself has already happened; the log only lets an import recognise its answer.
    let logged = true
    try {
      await saveExport(exportRecordOf(bundle, options, text, new Date()))
    } catch {
      logged = false
    }
    setContextId(newContextId())
    setConsent(false)
    setNotice({
      kind: 'success',
      text: `${what} Give it to Claude, then import the answer below. ${
        logged
          ? 'The export was logged in this browser (counts only, no data).'
          : 'It could not be logged in this browser, so its answer will show a “not linked to an export” warning on import.'
      }`,
    })
  }

  const download = async () => {
    downloadJson(fileName, bundle)
    await finish(`Downloaded ${fileName}.`)
  }

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(chatPrompt(bundle))
    } catch {
      setNotice({ kind: 'error', text: 'Your browser blocked copying. Download the file instead.' })
      return
    }
    await finish('Copied the prompt and context to your clipboard.')
  }

  const rows: Array<[string, string]> = [
    ['Profile preferences', bundle.candidate ? 'Included' : 'Not included'],
    ['Pipeline jobs', options.pipeline ? String(bundle.pipeline?.length ?? 0) : 'Not included'],
    ['Best-fit open jobs', options.topMatches > 0 ? String(bundle.topMatches?.length ?? 0) : 'Not included'],
    ['Application records', apps ? `${apps.records.length} + ${apps.notInterested.length} Not-interested summaries` : 'Not included'],
    ['Referral leads', options.referrals ? String(bundle.referrals?.length ?? 0) : 'Not included'],
  ]

  return (
    <div className="stack">
      <section className="panel" aria-labelledby="how-title">
        <div className="panel__header">
          <h2 id="how-title" className="panel__title">
            How this works
          </h2>
        </div>
        <ol className="panel__body ai-steps">
          <li>
            <strong>Choose and preview.</strong> You see exactly what would be shared, and nothing leaves JobIntel yet.
          </li>
          <li>
            <strong>Give the file to Claude yourself.</strong> Attach it in a chat on claude.ai, or pipe it to Claude Code, signed in with your own
            subscription.
          </li>
          <li>
            <strong>Import Claude’s answer.</strong> It is checked against a strict format; anything malformed is rejected, and nothing is applied.
          </li>
          <li>
            <strong>Decide in the inbox.</strong> Each recommendation changes your records only if you accept it.
          </li>
        </ol>
        <p className="panel__body field__hint ai-steps__note">
          JobIntel never contacts Claude and holds no API key. A website can’t start a Claude session on its own, so this version is a manual hand-off by design.
        </p>
      </section>

      <section className="panel" aria-labelledby="choose-title">
        <div className="panel__header">
          <div>
            <h2 id="choose-title" className="panel__title">
              1. Choose what to share
            </h2>
            <p className="panel__subtitle">Sensitive items are off by default. Changing anything asks for consent again.</p>
          </div>
        </div>
        <fieldset className="panel__body ai-switches">
          <legend className="sr-only">Data to include in the AI context</legend>
          {SWITCHES.map((s) => {
            const blocked = s.needs ? !options[s.needs] : false
            return (
              <label key={s.key} className={`ai-switch${blocked ? ' is-disabled' : ''}`}>
                <input
                  type="checkbox"
                  checked={options[s.key] && !blocked}
                  disabled={blocked}
                  onChange={(e) => set(s.key, e.target.checked)}
                />
                <span>
                  <strong>{s.label}</strong>
                  {s.sensitive && <span className="badge badge--warning ai-switch__tag">Sensitive</span>}
                  <span className="field__hint">{s.hint}</span>
                </span>
              </label>
            )
          })}
          <div className="ai-switch ai-switch--number">
            <label htmlFor="top-matches">
              <strong>Best-fit open jobs to include</strong>
              <span className="field__hint">Undecided open jobs ranked by the deterministic match engine. 0 shares none.</span>
            </label>
            <input
              id="top-matches"
              className="input ai-number"
              type="number"
              min={0}
              max={MAX_TOP_MATCHES}
              value={options.topMatches}
              onChange={(e) => set('topMatches', Math.max(0, Math.min(MAX_TOP_MATCHES, Math.floor(Number(e.target.value) || 0))))}
            />
          </div>
        </fieldset>
      </section>

      <section className="panel" aria-labelledby="preview-title">
        <div className="panel__header">
          <div>
            <h2 id="preview-title" className="panel__title">
              2. Preview exactly what leaves
            </h2>
            <p className="panel__subtitle">
              {bytes.toLocaleString()} bytes · about {approxTokens(text).toLocaleString()} tokens · id <span className="mono">{contextId.slice(0, 8)}</span>
            </p>
          </div>
        </div>
        <div className="panel__body stack">
          <table className="ai-preview">
            <caption className="sr-only">Sections included in the export</caption>
            <tbody>
              {rows.map(([label, value]) => (
                <tr key={label}>
                  <th scope="row">{label}</th>
                  <td className={value === 'Not included' ? 'secondary' : ''}>{value}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {bytes > 250_000 && (
            <div className="alert alert--warning" role="status">
              <span>This is a large file. Lower the number of best-fit jobs so Claude can read all of it.</span>
            </div>
          )}
          <details className="ai-never">
            <summary>
              <ShieldCheck size={14} aria-hidden="true" /> Never included, whatever you choose
            </summary>
            <ul>
              {NEVER.map((n) => (
                <li key={n}>{n}</li>
              ))}
            </ul>
          </details>
          <div>
            <button type="button" className="btn btn--ghost btn--sm" aria-expanded={showRaw} onClick={() => setShowRaw((v) => !v)}>
              <FileDown size={14} aria-hidden="true" /> {showRaw ? 'Hide' : 'Show'} the full file
            </button>
          </div>
          {showRaw && (
            <pre className="ai-raw" tabIndex={0} aria-label="Full context file contents">
              {text}
            </pre>
          )}
        </div>
      </section>

      <section className="panel" aria-labelledby="consent-title">
        <div className="panel__header">
          <h2 id="consent-title" className="panel__title">
            3. Consent and hand-off
          </h2>
        </div>
        <div className="panel__body stack">
          <label className="ack">
            <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
            <span>
              I have reviewed the data above. I choose to give this file to Claude myself, and I understand it is then processed by Anthropic under my
              Claude account’s settings.
            </span>
          </label>
          <div className="ai-actions">
            <button type="button" className="btn btn--primary" disabled={!consent} onClick={() => void download()}>
              <Download size={15} aria-hidden="true" /> Download context file
            </button>
            <button type="button" className="btn btn--secondary" disabled={!consent} onClick={() => void copy()}>
              <ClipboardCopy size={15} aria-hidden="true" /> Copy as chat prompt
            </button>
          </div>
          {notice && (
            <div className={`alert alert--${notice.kind === 'success' ? 'success' : 'danger'}`} role="status">
              <span>{notice.text}</span>
            </div>
          )}
          <details className="ai-howto">
            <summary>How to run it with your Claude subscription</summary>
            <ul>
              <li>
                <strong>claude.ai chat:</strong> start a new chat, attach <span className="mono">{fileName}</span>, and send “Follow the instructions in the attached
                JobIntel context file and reply with only the JSON result.” Or use <em>Copy as chat prompt</em> and paste.
              </li>
              <li>
                <strong>Claude Code:</strong> run <span className="mono">cat {fileName} | claude -p "Follow the instructions in this JobIntel context and reply with only the JSON result."</span>
                . Copy the reply.
              </li>
              <li>
                Make sure <span className="mono">ANTHROPIC_API_KEY</span> is not set when using Claude Code, or it bills API usage instead of your subscription.
              </li>
              <li>Paste the reply (or load the saved file) with “Import Claude’s answer”.</li>
            </ul>
          </details>
        </div>
      </section>

      <section className="panel" aria-labelledby="import-title">
        <div className="panel__header">
          <h2 id="import-title" className="panel__title">
            4. Import Claude’s answer
          </h2>
        </div>
        <div className="panel__body stack">
          <p className="secondary">You will see what was accepted and what was rejected before anything is added to your inbox.</p>
          <div>
            <button type="button" className="btn btn--primary" onClick={() => setImportOpen(true)}>
              <Upload size={15} aria-hidden="true" /> Import Claude’s answer
            </button>
          </div>
        </div>
      </section>

      <ImportDialog open={importOpen} onClose={() => setImportOpen(false)} />
    </div>
  )
}
