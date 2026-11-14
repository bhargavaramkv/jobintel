import { AlertCircle, Upload } from 'lucide-react'
import { useId, useState, type ChangeEvent } from 'react'
import { useApp } from '../../app/appContext'
import { validateTexFile, validateTexUpload } from '../../domain/resume/tex'

/** Reads a .tex file in the browser, validates it and saves it in this browser only. */
export function MasterUpload({ replace = false }: { replace?: boolean }) {
  const { saveResume, notify } = useApp()
  const id = useId()
  const [error, setError] = useState<string | null>(null)

  const onFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    // Name and size are checked before the file is read into memory.
    const early = validateTexFile(file.name, file.size)
    if (!early.ok) {
      setError(early.error)
      return
    }
    const text = await file.text()
    const result = validateTexUpload(file.name, file.size, text)
    if (!result.ok) {
      setError(result.error)
      return
    }
    setError(null)
    saveResume({ name: file.name, size: file.size, tex: text })
    notify('Master resume saved in this browser')
  }

  return (
    <div className="field">
      <input id={id} className="sr-only file-input" type="file" accept=".tex" onChange={onFile} />
      <label className="btn btn--secondary" htmlFor={id}>
        <Upload size={14} aria-hidden="true" />
        {replace ? 'Replace master resume (.tex)' : 'Upload master resume (.tex)'}
      </label>
      <span className="field__hint">Read in your browser and saved in this browser only. Nothing is uploaded.</span>
      {error && (
        <span className="field__error" role="alert">
          <AlertCircle size={13} aria-hidden="true" />
          {error}
        </span>
      )}
    </div>
  )
}
