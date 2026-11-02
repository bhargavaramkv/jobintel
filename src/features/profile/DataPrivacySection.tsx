import { CircleCheck, Download, Globe, HardDrive, Info, KeyRound, Trash2, TriangleAlert, Upload } from 'lucide-react'
import { useRef, useState, type FormEvent } from 'react'
import { Dialog } from '../../components/ui/Dialog'
import { TextField } from '../../components/ui/Field'
import {
  backupFileName,
  BackupError,
  checkPassphrase,
  createBackup,
  MIN_PASSPHRASE_LENGTH,
  restoreFromText,
  type BackupPayload,
} from '../../storage/backup'
import { useProfile } from './useProfile'
import { downloadJson } from './download'

export type Notice = { kind: 'success' | 'error'; text: string } | null

interface DataPrivacySectionProps {
  dirty: boolean
  /** Owned by the parent so it survives the editor reset after import/clear. */
  notice: Notice
  setNotice: (n: Notice) => void
}

export function DataPrivacySection({ dirty, notice, setNotice }: DataPrivacySectionProps) {
  const { profile, replace, clearAll } = useProfile()
  const [exportOpen, setExportOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [clearOpen, setClearOpen] = useState(false)

  return (
    <section>
      <div className="section-head">
        <h2 id="section-data" className="panel__title">
          Data &amp; privacy
        </h2>
        <p className="panel__subtitle">Where your information lives and how to back it up.</p>
      </div>

      <div className="stack">
        <ul className="privacy-facts">
          <li>
            <HardDrive size={18} aria-hidden="true" />
            <div>
              <strong>Stored only in this browser.</strong> Your profile is kept in this browser's IndexedDB. It is not
              synced to other devices or browsers. Clearing site data for this page deletes it.
            </div>
          </li>
          <li>
            <Globe size={18} aria-hidden="true" />
            <div>
              <strong>The website is public; your data is not sent to it.</strong> JobIntel is a static site on GitHub
              Pages. Anyone can open the page, but profile fields never leave your browser. There is no server,
              analytics or tracking.
            </div>
          </li>
          <li>
            <KeyRound size={18} aria-hidden="true" />
            <div>
              <strong>Backups are encrypted with your passphrase.</strong> AES-256-GCM with a PBKDF2-derived key. If you
              lose the passphrase, the backup cannot be recovered by anyone.
            </div>
          </li>
        </ul>

        {notice && (
          <div className={`alert alert--${notice.kind === 'success' ? 'success' : 'danger'}`} role="status">
            {notice.kind === 'success' ? (
              <CircleCheck size={16} aria-hidden="true" />
            ) : (
              <TriangleAlert size={16} aria-hidden="true" />
            )}
            <span>{notice.text}</span>
          </div>
        )}

        <div className="data-actions">
          <div className="data-action">
            <div>
              <h3>Export encrypted backup</h3>
              <p className="field__hint">Downloads a file you can keep or move to another device.</p>
            </div>
            <button
              type="button"
              className="btn btn--secondary"
              onClick={() => setExportOpen(true)}
              disabled={!profile}
              title={profile ? undefined : 'Save a profile first'}
            >
              <Download size={15} aria-hidden="true" /> Export
            </button>
          </div>
          <div className="data-action">
            <div>
              <h3>Import encrypted backup</h3>
              <p className="field__hint">Replaces the profile in this browser after successful decryption.</p>
            </div>
            <button type="button" className="btn btn--secondary" onClick={() => setImportOpen(true)}>
              <Upload size={15} aria-hidden="true" /> Import
            </button>
          </div>
          <div className="data-action data-action--danger">
            <div>
              <h3>Clear local data</h3>
              <p className="field__hint">Permanently deletes your JobIntel data from this browser.</p>
            </div>
            <button type="button" className="btn btn--danger" onClick={() => setClearOpen(true)}>
              <Trash2 size={15} aria-hidden="true" /> Clear data
            </button>
          </div>
        </div>
      </div>

      <ExportDialog
        open={exportOpen}
        dirty={dirty}
        onClose={() => setExportOpen(false)}
        onDone={(text) => {
          setExportOpen(false)
          setNotice({ kind: 'success', text })
        }}
      />
      <ImportDialog
        open={importOpen}
        dirty={dirty}
        onClose={() => setImportOpen(false)}
        onRestore={async (payload) => {
          await replace(payload.profile)
          setImportOpen(false)
          setNotice({ kind: 'success', text: 'Backup restored. Your profile has been replaced.' })
        }}
      />
      <ClearDialog
        open={clearOpen}
        onClose={() => setClearOpen(false)}
        onConfirm={async () => {
          await clearAll()
          setClearOpen(false)
          setNotice({ kind: 'success', text: 'All local JobIntel data was deleted from this browser.' })
        }}
      />
    </section>
  )
}

function ExportDialog({
  open,
  dirty,
  onClose,
  onDone,
}: {
  open: boolean
  dirty: boolean
  onClose: () => void
  onDone: (message: string) => void
}) {
  const { profile } = useProfile()
  const [pass, setPass] = useState('')
  const [confirm, setConfirm] = useState('')
  const [ack, setAck] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<{ pass?: string; confirm?: string; form?: string }>({})

  const close = () => {
    if (busy) return
    setPass('')
    setConfirm('')
    setAck(false)
    setError({})
    onClose()
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const weak = checkPassphrase(pass)
    if (weak) return setError({ pass: weak })
    if (pass !== confirm) return setError({ confirm: 'Passphrases do not match' })
    if (!ack) return setError({ form: 'Confirm that you understand the passphrase cannot be recovered.' })
    setBusy(true)
    try {
      const envelope = await createBackup(profile, pass)
      downloadJson(backupFileName(), envelope)
      setPass('')
      setConfirm('')
      setAck(false)
      setError({})
      onDone('Encrypted backup downloaded. Store it somewhere safe and remember the passphrase.')
    } catch (err) {
      setError({ form: err instanceof Error ? err.message : String(err) })
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog
      open={open}
      title="Export encrypted backup"
      onClose={close}
      busy={busy}
      footer={
        <>
          <button type="button" className="btn btn--ghost" onClick={close} disabled={busy}>
            Cancel
          </button>
          <button type="submit" form="export-form" className="btn btn--primary" disabled={busy}>
            {busy ? 'Encryptingâ€¦' : 'Encrypt & download'}
          </button>
        </>
      }
    >
      <form id="export-form" className="stack" onSubmit={submit} noValidate>
        {dirty && (
          <div className="alert alert--warning">
            <Info size={16} aria-hidden="true" />
            <span>You have unsaved edits. The backup contains the last saved profile only.</span>
          </div>
        )}
        <TextField
          label="Passphrase"
          type="password"
          value={pass}
          onChange={setPass}
          error={error.pass}
          hint={`At least ${MIN_PASSPHRASE_LENGTH} characters. A few random words works well.`}
          autoComplete="new-password"
        />
        <TextField
          label="Confirm passphrase"
          type="password"
          value={confirm}
          onChange={setConfirm}
          error={error.confirm}
          autoComplete="new-password"
        />
        <label className="ack">
          <input type="checkbox" checked={ack} onChange={(e) => setAck(e.target.checked)} />
          <span>I understand that if I lose this passphrase, the backup cannot be recovered.</span>
        </label>
        {error.form && (
          <p className="field__error" role="alert">
            {error.form}
          </p>
        )}
      </form>
    </Dialog>
  )
}

function ImportDialog({
  open,
  dirty,
  onClose,
  onRestore,
}: {
  open: boolean
  dirty: boolean
  onClose: () => void
  onRestore: (payload: BackupPayload) => Promise<void>
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [pass, setPass] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const reset = () => {
    setFile(null)
    setPass('')
    setError(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  const close = () => {
    if (busy) return
    reset()
    onClose()
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!file) return setError('Choose a backup file first.')
    if (!pass) return setError('Enter the passphrase used when the backup was created.')
    if (file.size > 2_000_000) return setError('This file is too large to be a JobIntel backup.')
    setBusy(true)
    setError(null)
    try {
      const payload = await restoreFromText(await file.text(), pass)
      await onRestore(payload)
      reset()
    } catch (err) {
      setError(err instanceof BackupError ? err.message : `Import failed: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog
      open={open}
      title="Import encrypted backup"
      onClose={close}
      busy={busy}
      footer={
        <>
          <button type="button" className="btn btn--ghost" onClick={close} disabled={busy}>
            Cancel
          </button>
          <button type="submit" form="import-form" className="btn btn--primary" disabled={busy}>
            {busy ? 'Decryptingâ€¦' : 'Decrypt & replace'}
          </button>
        </>
      }
    >
      <form id="import-form" className="stack" onSubmit={submit} noValidate>
        <div className="alert alert--warning">
          <TriangleAlert size={16} aria-hidden="true" />
          <span>
            Importing replaces the profile in this browser{dirty ? ', including your unsaved edits' : ''}. Nothing is
            changed unless decryption and validation succeed.
          </span>
        </div>
        <div className="field">
          <label className="field__label" htmlFor="backup-file">
            Backup file
          </label>
          <input
            ref={fileRef}
            id="backup-file"
            type="file"
            accept=".json,application/json"
            className="file-input"
            onChange={(e) => {
              setFile(e.target.files?.[0] ?? null)
              setError(null)
            }}
          />
        </div>
        <TextField
          label="Passphrase"
          type="password"
          value={pass}
          onChange={(v) => {
            setPass(v)
            setError(null)
          }}
          autoComplete="current-password"
        />
        {error && (
          <p className="field__error" role="alert">
            {error}
          </p>
        )}
      </form>
    </Dialog>
  )
}

const CLEAR_PHRASE = 'DELETE'

function ClearDialog({
  open,
  onClose,
  onConfirm,
}: {
  open: boolean
  onClose: () => void
  onConfirm: () => Promise<void>
}) {
  const [typed, setTyped] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const close = () => {
    if (busy) return
    setTyped('')
    setError(null)
    onClose()
  }

  const confirm = async () => {
    setBusy(true)
    try {
      await onConfirm()
      setTyped('')
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog
      open={open}
      title="Delete all local data?"
      role="alertdialog"
      onClose={close}
      busy={busy}
      footer={
        <>
          <button type="button" className="btn btn--secondary" onClick={close} disabled={busy}>
            Cancel
          </button>
          <button
            type="button"
            className="btn btn--danger"
            onClick={confirm}
            disabled={busy || typed !== CLEAR_PHRASE}
          >
            {busy ? 'Deletingâ€¦' : 'Delete permanently'}
          </button>
        </>
      }
    >
      <p>
        This removes your profile and preferences from this browser. It cannot be undone. Export a backup first if you
        might need them.
      </p>
      <TextField
        label={`Type ${CLEAR_PHRASE} to confirm`}
        value={typed}
        onChange={setTyped}
        autoComplete="off"
        spellCheck={false}
      />
      {error && (
        <p className="field__error" role="alert">
          {error}
        </p>
      )}
    </Dialog>
  )
}
