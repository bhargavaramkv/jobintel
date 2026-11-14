import { AlertCircle, Upload } from 'lucide-react'
import { useId, useState, type ChangeEvent } from 'react'
import { validateTexUpload } from '../../domain/resume/tex'
import { usePrototype } from '../../prototype/usePrototype'

/** Reads a .tex file in the browser, validates it and stores it in memory only. */
export function MasterUpload({ replace = false }: { replace?: boolean }) {
  const { dispatch } = usePrototype()
  const id = useId()
  const [error, setError] = useState<string | null>(null)

  const onFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    const text = await file.text()
    const result = validateTexUpload(file.name, file.size, text)
    if (!result.ok) {
      setError(result.error)
      return
    }
    setError(null)
    dispatch({ type: 'resume/uploadMaster', name: file.name, size: file.size, text })
  }

  return (
    <div className="field">
      <input id={id} className="sr-only file-input" type="file" accept=".tex" onChange={onFile} />
      <label className="btn btn--secondary" htmlFor={id}>
        <Upload size={14} aria-hidden="true" />
        {replace ? 'Replace master resume (.tex)' : 'Upload master resume (.tex)'}
      </label>
      <span className="field__hint">Read in your browser and kept in memory only. Nothing is uploaded.</span>
      {error && (
        <span className="field__error" role="alert">
          <AlertCircle size={13} aria-hidden="true" />
          {error}
        </span>
      )}
    </div>
  )
}
