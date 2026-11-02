import { createContext, useContext } from 'react'
import type { JobAction, JobRef, RejectReason } from '../../domain/jobs/actions'
import type { Learned } from '../../domain/jobs/feedback'

export interface JobActionsContextValue {
  status: 'loading' | 'ready' | 'error'
  error?: string
  /** jobId -> record */
  actions: ReadonlyMap<string, JobAction>
  /** Rules learned from decided jobs, applied to every scan. */
  learned: Learned
  markApplied: (ref: JobRef) => Promise<void>
  markRejected: (ref: JobRef, reasons: RejectReason[]) => Promise<void>
  clearDecision: (jobId: string) => Promise<void>
  setNote: (ref: JobRef, note: string) => Promise<void>
  setAppliedOn: (jobId: string, isoDate: string) => Promise<void>
  /** Remove the "company" reason from every rejection at this company (un-hide it). */
  unhideCompany: (company: string) => Promise<void>
  replaceAll: (actions: JobAction[]) => Promise<void>
}

export const JobActionsContext = createContext<JobActionsContextValue | null>(null)

export function useJobActions(): JobActionsContextValue {
  const ctx = useContext(JobActionsContext)
  if (!ctx) throw new Error('useJobActions must be used inside <JobActionsProvider>')
  return ctx
}
