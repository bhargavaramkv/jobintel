import { createContext, useContext } from 'react'
import type { ApplicationDetails, JobAction, JobRef, RejectReason, Stage } from '../../domain/jobs/actions'
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
  /** Move a job to an application stage (shortlist, applied, interview…), recording history. */
  setStage: (ref: JobRef, stage: Stage, note?: string) => Promise<void>
  /** Remove the job from the pipeline (e.g. un-shortlist). */
  removeStage: (jobId: string) => Promise<void>
  /** Save application details (next action, follow-up date, interviews…). */
  updateDetails: (jobId: string, details: ApplicationDetails) => Promise<void>
  /** Persist an already-built record (validated by the repository). Used when accepting an AI recommendation. */
  putAction: (action: JobAction) => Promise<void>
}

export const JobActionsContext = createContext<JobActionsContextValue | null>(null)

export function useJobActions(): JobActionsContextValue {
  const ctx = useContext(JobActionsContext)
  if (!ctx) throw new Error('useJobActions must be used inside <JobActionsProvider>')
  return ctx
}
