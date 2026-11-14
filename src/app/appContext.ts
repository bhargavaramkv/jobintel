import { createContext, useContext } from 'react'
import type { Job } from '../domain/jobs/feedSchema'
import type { CandidateProfile } from '../domain/profile/schema'
import type { Prefs, StoredResume, TrackedJob, TrackStatus } from './appState'

export interface Toast {
  id: number
  message: string
}

export interface AppContextValue {
  profile: CandidateProfile | null
  resume: StoredResume | null
  tracked: TrackedJob[]
  prefs: Prefs
  /** True when the last save to this browser's storage failed (blocked or full). */
  saveFailed: boolean
  saveProfile: (profile: CandidateProfile, prefs?: Prefs) => void
  saveResume: (file: { name: string; size: number; tex: string }) => void
  trackJob: (job: Job) => void
  setStatus: (jobId: string, status: TrackStatus) => void
  setNotes: (jobId: string, notes: string) => void
  untrack: (jobId: string) => void
  toasts: Toast[]
  notify: (message: string) => void
  dismissToast: (id: number) => void
}

export const AppContext = createContext<AppContextValue | null>(null)

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used inside AppProvider')
  return ctx
}
