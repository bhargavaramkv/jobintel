import { dayKey } from './clock'
import type { Application, PrototypeState } from './types'

const ATTENTION_STATUSES = ['awaiting-approval', 'blocked', 'failed'] as const

export const needsAttention = (s: PrototypeState): Application[] =>
  s.applications.filter((a) => (ATTENTION_STATUSES as readonly string[]).includes(a.status))

export const submittedToday = (s: PrototypeState): number =>
  s.applications.filter((a) => a.submittedAt && dayKey(a.submittedAt) === dayKey(s.now)).length

export const jobById = (s: PrototypeState, id: string) => s.jobs.find((j) => j.id === id)

export const STATUS_LABEL: Record<Application['status'], string> = {
  queued: 'Queued',
  tailoring: 'Tailoring',
  'awaiting-approval': 'Awaiting approval',
  applying: 'Applying',
  submitted: 'Submitted',
  verified: 'Verified',
  blocked: 'Blocked',
  failed: 'Failed',
  rejected: 'Rejected',
}
