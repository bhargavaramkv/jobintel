import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { Job } from '../domain/jobs/feedSchema'
import type { CandidateProfile } from '../domain/profile/schema'
import { AppContext, type AppContextValue, type Toast } from './appContext'
import { loadState, trackedFromJob, MAX_NOTES, type Prefs, type StoredState, type TrackStatus } from './appState'
import { writeStored } from './storage-local'

/** Holds the profile, master resume, tracked jobs and preferences, and saves them to localStorage on every change. */
export function AppProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<StoredState>(loadState)
  const [saveFailed, setSaveFailed] = useState(false)
  const [toasts, setToasts] = useState<Toast[]>([])
  const changed = useRef(false)
  const seq = useRef(0)

  // Nothing is written until the user changes something, so a first visit leaves no trace.
  useEffect(() => {
    if (!changed.current) return
    setSaveFailed(!writeStored(state))
  }, [state])

  const update = useCallback((fn: (s: StoredState) => StoredState) => {
    changed.current = true
    setState(fn)
  }, [])

  const notify = useCallback((message: string) => setToasts((t) => [...t, { id: ++seq.current, message }]), [])
  const dismissToast = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), [])

  const value = useMemo<AppContextValue>(
    () => ({
      profile: state.profile,
      resume: state.resume,
      tracked: state.tracked,
      prefs: state.prefs,
      saveFailed,
      saveProfile: (profile: CandidateProfile, prefs?: Prefs) => update((s) => ({ ...s, profile, prefs: prefs ?? s.prefs })),
      saveResume: (file) => update((s) => ({ ...s, resume: { ...file, uploadedAt: new Date().toISOString() } })),
      trackJob: (job: Job) =>
        update((s) => (s.tracked.some((t) => t.jobId === job.id) ? s : { ...s, tracked: [trackedFromJob(job), ...s.tracked] })),
      setStatus: (jobId: string, status: TrackStatus) =>
        update((s) => ({ ...s, tracked: s.tracked.map((t) => (t.jobId === jobId ? { ...t, status } : t)) })),
      setNotes: (jobId: string, notes: string) =>
        update((s) => ({ ...s, tracked: s.tracked.map((t) => (t.jobId === jobId ? { ...t, notes: notes.slice(0, MAX_NOTES) } : t)) })),
      untrack: (jobId: string) => update((s) => ({ ...s, tracked: s.tracked.filter((t) => t.jobId !== jobId) })),
      toasts,
      notify,
      dismissToast,
    }),
    [state, saveFailed, toasts, update, notify, dismissToast],
  )

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}
