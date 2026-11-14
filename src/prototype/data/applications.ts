import { matchJob } from '../../domain/match/score'
import { minutesAgo } from '../clock'
import type { AppMode, Application, AppStatus, HistoryEntry, Verification } from '../types'
import { MOCK_JOBS } from './jobs'
import { MOCK_PROFILE } from './profile'

interface Spec {
  id: string
  jobId: string
  status: AppStatus
  mode: AppMode
  resume?: [string, number]
  created: number
  history: Array<[number, AppStatus, string]>
  submitted?: number
  blocker?: string
  failure?: string
  verification?: Omit<Verification, 'at'> & { age: number }
  notVerifiedReason?: string
}

const SPECS: Spec[] = [
  {
    id: 'app-nimbus', jobId: 'greenhouse:nimbus:1001', status: 'verified', mode: 'auto', resume: ['res-nimbus', 2], created: 200, submitted: 150,
    history: [[200, 'queued', 'Queued: score met the auto-apply rule'], [180, 'tailoring', 'Tailored resume v2'], [155, 'applying', 'Filling the Greenhouse form'], [150, 'submitted', 'Submitted automatically'], [140, 'verified', 'Confirmation email found']],
    verification: { method: 'Confirmation email', evidence: 'Subject "We received your application" from a no-reply sender at the company domain', age: 140 },
  },
  {
    id: 'app-brightwave', jobId: 'lever:brightwave:77', status: 'submitted', mode: 'auto', resume: ['res-brightwave', 1], created: 130, submitted: 50,
    history: [[130, 'queued', 'Queued: score met the auto-apply rule'], [100, 'tailoring', 'Tailored resume v1'], [55, 'applying', 'Filling the Lever form'], [50, 'submitted', 'Submitted automatically']],
    notVerifiedReason: 'The portal showed no confirmation page and no email has arrived yet.',
  },
  {
    id: 'app-quillpay', jobId: 'lever:quillpay:2044', status: 'awaiting-approval', mode: 'approval', resume: ['res-quillpay', 1], created: 380,
    history: [[380, 'queued', 'Queued for approval: the form has screening questions'], [360, 'tailoring', 'Tailored resume v1'], [350, 'awaiting-approval', 'Ready for your review: 2 screening answers drafted']],
  },
  {
    id: 'app-orchid', jobId: 'lever:orchid:902', status: 'awaiting-approval', mode: 'approval', resume: ['res-orchid', 1], created: 270,
    history: [[270, 'queued', 'Queued for approval: verdict was "needs review"'], [250, 'tailoring', 'Tailored resume v1'], [245, 'awaiting-approval', 'Ready for your review: seniority and years gap flagged']],
  },
  {
    id: 'app-harbor', jobId: 'greenhouse:harbor:318', status: 'applying', mode: 'auto', resume: ['res-harbor', 2], created: 40,
    history: [[40, 'queued', 'Queued: score met the auto-apply rule'], [25, 'tailoring', 'Tailored resume v2'], [3, 'applying', 'Filling the Greenhouse form']],
  },
  {
    id: 'app-kestrel', jobId: 'greenhouse:kestrel:5120', status: 'tailoring', mode: 'auto', created: 20,
    history: [[20, 'queued', 'Queued: score met the auto-apply rule'], [6, 'tailoring', 'Tailoring the resume for the posting']],
  },
  {
    id: 'app-lumen', jobId: 'greenhouse:lumen:61', status: 'blocked', mode: 'blocked', created: 500,
    blocker: 'The Lumen careers portal showed a CAPTCHA before the form. The agent never solves CAPTCHAs: open the portal yourself, complete the application or the check, then mark this resolved.',
    history: [[500, 'queued', 'Queued for approval'], [470, 'applying', 'Opened the application form'], [468, 'blocked', 'Stopped at a CAPTCHA']],
  },
  {
    id: 'app-tessera', jobId: 'lever:tessera:12', status: 'failed', mode: 'auto', resume: undefined, created: 640,
    failure: 'The portal timed out (504) after the resume upload. Nothing was submitted. Safe to retry.',
    history: [[640, 'queued', 'Queued'], [600, 'tailoring', 'Tailored resume'], [590, 'applying', 'Uploading the resume'], [588, 'failed', 'Portal timeout, retryable']],
  },
  {
    id: 'app-palisade', jobId: 'greenhouse:palisade:408', status: 'queued', mode: 'approval', created: 12,
    history: [[12, 'queued', 'Queued by you, overriding the agent']],
  },
  {
    id: 'app-marlin', jobId: 'greenhouse:marlin:2207', status: 'rejected', mode: 'approval', created: 900,
    history: [[900, 'queued', 'Queued by you, overriding the agent'], [880, 'awaiting-approval', 'Ready for your review'], [850, 'rejected', 'You rejected it: management role']],
  },
]

const jobs = new Map(MOCK_JOBS.map((j) => [j.id, j]))

export const MOCK_APPLICATIONS: Application[] = SPECS.map((s) => {
  const history: HistoryEntry[] = s.history.map(([age, status, note]) => ({ at: minutesAgo(age), status, note }))
  return {
    id: s.id,
    jobId: s.jobId,
    resumeId: s.resume?.[0] ?? null,
    resumeVersion: s.resume?.[1] ?? null,
    status: s.status,
    mode: s.mode,
    score: matchJob(jobs.get(s.jobId)!, MOCK_PROFILE).score,
    createdAt: minutesAgo(s.created),
    updatedAt: history[history.length - 1].at,
    ...(s.submitted !== undefined ? { submittedAt: minutesAgo(s.submitted) } : {}),
    ...(s.blocker ? { blocker: s.blocker } : {}),
    ...(s.failure ? { failure: s.failure } : {}),
    verification: s.verification
      ? { method: s.verification.method, evidence: s.verification.evidence, at: minutesAgo(s.verification.age) }
      : null,
    ...(s.notVerifiedReason ? { notVerifiedReason: s.notVerifiedReason } : {}),
    history,
  }
})
