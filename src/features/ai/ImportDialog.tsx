import { TriangleAlert } from 'lucide-react'
import { useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Dialog } from '../../components/ui/Dialog'
import { parseAiResult, reviewImport, toStored, type ImportReview, type ParsedAiResult } from '../../domain/ai/import'
import { AI_LIMITS } from '../../domain/ai/schema'
import { useAiBriefings, useAiExports, useAiRecommendations } from './aiContext'
import { useJobLookup } from './useJobLookup'

interface Checked {
  parsed: ParsedAiResult
  review: ImportReview
}

export function ImportDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate()
  const fileRef = useRef<HTMLInputElement>(null)
  const { recommendations, save: saveRec } = useAiRecommendations()
  const { save: saveBriefing } = useAiBriefings()
  const { exports } = useAiExports()
  const { jobs, actions } = useJobLookup()
  const [text, setText] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [checked, setChecked] = useState<Checked | null>(null)
  const [busy, setBusy] = useState(false)

  const knownJobIds = useMemo(() => new Set([...jobs.keys(), ...actions.keys()]), [jobs, actions])

  const reset = () => {
    setText('')
    setError(null)
    setChecked(null)
    if (fileRef.current) fileRef.current.value = ''
  }
  const close = () => {
    if (busy) return
    reset()
    onClose()
  }

  const check = (raw: string) => {
    setError(null)
    setChecked(null)
    const out = parseAiResult(raw)
    if (!out.ok) return setError(out.error)
    const review = reviewImport(out.value, {
      knownContextIds: new Set(exports.keys()),
      knownJobIds,
      existingIds: new Set(recommendations.keys()),
      now: new Date(),
    })
    setChecked({ parsed: out.value, review })
  }

  const loadFile = async (file: File | undefined) => {
    if (!file) return
    if (file.size > AI_LIMITS.resultChars) return setError('This file is too large to be an AI result.')
    const raw = await file.text()
    setText(raw)
    check(raw)
  }

  const commit = async () => {
    if (!checked) return
    setBusy(true)
    try {
      const { recommendations: recs, briefing } = toStored(checked.parsed, checked.review.fresh, new Date())
      for (const r of recs) await saveRec(r)
      if (briefing) await saveBriefing(briefing)
      reset()
      onClose()
      navigate(recs.length > 0 ? '/assistant?tab=inbox' : '/assistant?tab=briefing')
    } catch (err) {
      setError(`Import failed: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setBusy(false)
    }
  }

  const nothingNew = !!checked && checked.review.fresh.length === 0 && !checked.parsed.briefing
  const warnings: string[] = []
  if (checked) {
    const { review, parsed } = checked
    if (review.unknownContext) warnings.push('This answer is not linked to any export made in this browser. Check that it is the one you meant to import.')
    if (review.staleDays) warnings.push(`It was generated ${review.staleDays} days ago, so jobs and deadlines may have changed.`)
    if (review.futureDated) warnings.push('Its timestamp is in the future.')
    if (review.unknownJobs.length) warnings.push(`${review.unknownJobs.length} recommendation(s) refer to jobs that are not in your feed or records. They can be read but not applied.`)
    if (review.alreadyImported) warnings.push(`${review.alreadyImported} recommendation(s) were already imported earlier and will be skipped, keeping your decisions.`)
    for (const issue of parsed.briefingIssues) warnings.push(`Briefing: ${issue}`)
  }

  return (
    <Dialog
      open={open}
      title="Import Claude’s answer"
      onClose={close}
      busy={busy}
      footer={
        <>
          <button type="button" className="btn btn--ghost" onClick={close} disabled={busy}>
            Cancel
          </button>
          {checked ? (
            <button type="button" className="btn btn--primary" onClick={() => void commit()} disabled={busy || nothingNew}>
              {busy ? 'Adding…' : `Add ${checked.review.fresh.length} to inbox${checked.parsed.briefing ? ' and save briefing' : ''}`}
            </button>
          ) : (
            <button type="button" className="btn btn--primary" onClick={() => check(text)} disabled={!text.trim()}>
              Check answer
            </button>
          )}
        </>
      }
    >
      <div className="stack">
        {!checked && (
          <>
            <div className="field">
              <label className="field__label" htmlFor="ai-result-text">
                Paste Claude’s reply
              </label>
              <textarea
                id="ai-result-text"
                className="textarea ai-paste"
                rows={8}
                value={text}
                spellCheck={false}
                onChange={(e) => {
                  setText(e.target.value)
                  setError(null)
                }}
                placeholder='{"format":"jobintel-ai-result", …}'
              />
              <span className="field__hint">A markdown code fence around the JSON is fine.</span>
            </div>
            <div className="field">
              <label className="field__label" htmlFor="ai-result-file">
                Or load a saved .json file
              </label>
              <input
                ref={fileRef}
                id="ai-result-file"
                type="file"
                accept=".json,application/json,text/plain"
                className="file-input"
                onChange={(e) => void loadFile(e.target.files?.[0])}
              />
            </div>
          </>
        )}

        {error && (
          <p className="field__error" role="alert">
            {error}
          </p>
        )}

        {checked && (
          <div className="stack" aria-live="polite">
            <p>
              <strong>{checked.review.fresh.length}</strong> recommendation(s) passed validation
              {checked.parsed.rejected.length > 0 && (
                <>
                  , <strong>{checked.parsed.rejected.length}</strong> rejected
                </>
              )}
              {checked.parsed.briefing ? ', and a daily briefing is included' : ''}. Nothing will be applied: each one arrives as “Generated” for you to review.
            </p>
            {warnings.length > 0 && (
              <div className="alert alert--warning">
                <TriangleAlert size={16} aria-hidden="true" />
                <ul className="ai-warn">
                  {warnings.map((w) => (
                    <li key={w}>{w}</li>
                  ))}
                </ul>
              </div>
            )}
            {checked.parsed.rejected.length > 0 && (
              <details open>
                <summary>Rejected items ({checked.parsed.rejected.length})</summary>
                <ul className="ai-warn">
                  {checked.parsed.rejected.map((r) => (
                    <li key={r.index}>
                      <strong>#{r.index + 1}{r.id ? ` (${r.id})` : ''}</strong>: {r.messages.join('; ')}
                    </li>
                  ))}
                </ul>
              </details>
            )}
            <button type="button" className="btn btn--ghost btn--sm" onClick={reset}>
              Start over
            </button>
          </div>
        )}
      </div>
    </Dialog>
  )
}
