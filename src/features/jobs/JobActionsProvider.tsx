import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import {
  withApplied,
  withAppliedOn,
  withNote,
  withoutDecision,
  withRejected,
  type JobAction,
  type JobRef,
  type RejectReason,
} from '../../domain/jobs/actions'
import { learnFromActions } from '../../domain/jobs/feedback'
import { jobActionsRepository } from '../../storage/jobActionsRepository'
import { useProfile } from '../profile/useProfile'
import { JobActionsContext, type JobActionsContextValue } from './useJobActions'

export function JobActionsProvider({ children }: { children: ReactNode }) {
  // Reload whenever the profile store is replaced wholesale (import / clear data).
  const { revision } = useProfile()
  const [status, setStatus] = useState<JobActionsContextValue['status']>('loading')
  const [error, setError] = useState<string>()
  const [actions, setActions] = useState<ReadonlyMap<string, JobAction>>(new Map())
  // Source of truth for writes. Updated synchronously in commit(), so back-to-back
  // operations (e.g. reject, then save a note) build on each other instead of a stale render.
  const store = useRef<Map<string, JobAction>>(new Map())

  useEffect(() => {
    let cancelled = false
    jobActionsRepository
      .getAll()
      .then(({ actions: rows }) => {
        if (cancelled) return
        store.current = new Map(rows.map((a) => [a.jobId, a]))
        setActions(new Map(store.current))
        setStatus('ready')
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setError(err instanceof Error ? err.message : String(err))
        setStatus('error')
      })
    return () => {
      cancelled = true
    }
  }, [revision])

  const commit = useCallback(async (jobId: string, next: JobAction | null) => {
    if (next) await jobActionsRepository.put(next)
    else await jobActionsRepository.remove(jobId)
    if (next) store.current.set(jobId, next)
    else store.current.delete(jobId)
    setActions(new Map(store.current))
  }, [])

  const learned = useMemo(() => learnFromActions(actions.values()), [actions])

  const value = useMemo<JobActionsContextValue>(() => {
    const get = (jobId: string) => store.current.get(jobId)
    return {
      status,
      error,
      actions,
      learned,
      markApplied: (ref: JobRef) => commit(ref.jobId, withApplied(ref, get(ref.jobId))),
      markRejected: (ref: JobRef, reasons: RejectReason[]) => commit(ref.jobId, withRejected(ref, get(ref.jobId), reasons)),
      clearDecision: async (jobId: string) => {
        const existing = get(jobId)
        if (existing) await commit(jobId, withoutDecision(existing))
      },
      setNote: async (ref: JobRef, note: string) => {
        const existing = get(ref.jobId)
        const next = withNote(ref, existing, note)
        // Don't store an empty record that has neither a decision nor a note.
        await commit(ref.jobId, !next.decision && !next.note.trim() ? null : next)
      },
      setAppliedOn: async (jobId: string, isoDate: string) => {
        const existing = get(jobId)
        if (existing?.decision === 'applied') await commit(jobId, withAppliedOn(existing, isoDate))
      },
      unhideCompany: async (company: string) => {
        for (const a of [...store.current.values()]) {
          if (a.snapshot.company !== company || !a.rejectReasons.includes('company')) continue
          await commit(a.jobId, { ...a, rejectReasons: a.rejectReasons.filter((r) => r !== 'company'), updatedAt: new Date().toISOString() })
        }
      },
      replaceAll: async (rows: JobAction[]) => {
        await jobActionsRepository.replaceAll(rows)
        store.current = new Map(rows.map((a) => [a.jobId, a]))
        setActions(new Map(store.current))
      },
    }
  }, [status, error, actions, learned, commit])

  return <JobActionsContext.Provider value={value}>{children}</JobActionsContext.Provider>
}
