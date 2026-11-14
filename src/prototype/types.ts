import type { Job } from '../domain/jobs/feedSchema'
import type { CandidateProfile } from '../domain/profile/schema'

/** Everything in src/prototype is simulated, in-memory UI data. Nothing here is persisted or sent anywhere. */

export type Scenario = 'demo' | 'empty' | 'error'

export type Verdict = 'selected' | 'review' | 'rejected'
export interface AgentDecision {
  verdict: Verdict
  reasons: string[]
}
export interface MockJob extends Job {
  agentDecision: AgentDecision
  screeningQuestions: boolean
}

export const APP_STATUSES = [
  'queued',
  'tailoring',
  'awaiting-approval',
  'applying',
  'submitted',
  'verified',
  'blocked',
  'failed',
  'rejected',
] as const
export type AppStatus = (typeof APP_STATUSES)[number]
export type AppMode = 'auto' | 'approval' | 'blocked'

export interface HistoryEntry {
  at: string
  status: AppStatus
  note: string
}
export interface Verification {
  method: string
  evidence: string
  at: string
}
export interface Application {
  id: string
  jobId: string
  resumeId: string | null
  resumeVersion: number | null
  status: AppStatus
  mode: AppMode
  score: number | null
  createdAt: string
  updatedAt: string
  submittedAt?: string
  blocker?: string
  failure?: string
  verification: Verification | null
  notVerifiedReason?: string
  history: HistoryEntry[]
}

export interface ResumeChange {
  section: string
  before: string
  after: string
  reason: string
}
export interface ResumeVersion {
  version: number
  createdAt: string
  summary: string
  source: string
  changes: ResumeChange[]
}
export interface ResumeVariant {
  id: string
  title: string
  jobId?: string
  versions: ResumeVersion[]
}
export interface MasterResume {
  name: string
  size: number
  uploadedAt: string
  tex: string
}
export interface ResumesData {
  master: MasterResume | null
  variants: ResumeVariant[]
}

export const EVENT_KINDS = ['scan', 'evaluate', 'tailor', 'apply', 'verify', 'failure', 'system'] as const
export type EventKind = (typeof EVENT_KINDS)[number]
export interface ActivityEvent {
  id: string
  at: string
  kind: EventKind
  title: string
  detail?: string
  log?: string[]
  needsIntervention?: boolean
  resolved?: boolean
  applicationId?: string
  jobId?: string
}

export type AutomationMode = 'auto' | 'approval' | 'tailor'

export interface PrototypeSettings {
  automation: {
    mode: AutomationMode
    minMatchScore: number
    autoApplyEnabled: boolean
    autoApplyMinScore: number
    requireNoScreeningQuestions: boolean
    alwaysAskFor: string[]
  }
  limits: { daily: number; weekly: number; perCompany: number }
  permissions: {
    tailorResumes: boolean
    submitApplications: boolean
    answerScreening: boolean
    createPortalAccounts: boolean
  }
  notifications: { needsApproval: boolean; blocked: boolean; failures: boolean; dailySummary: boolean }
}

export interface RunState {
  status: 'idle' | 'running' | 'paused'
  step: number
  total: number
  lastRunAt?: string
}

export interface Toast {
  id: number
  message: string
}

export interface PrototypeState {
  scenario: Scenario
  now: string
  seq: number
  onboarded: boolean
  profile: CandidateProfile
  jobs: MockJob[]
  resumes: ResumesData
  applications: Application[]
  events: ActivityEvent[]
  settings: PrototypeSettings
  run: RunState
  toasts: Toast[]
}

export interface Seed {
  onboarded: boolean
  profile: CandidateProfile
  jobs: MockJob[]
  resumes: ResumesData
  applications: Application[]
  events: ActivityEvent[]
  settings: PrototypeSettings
}
