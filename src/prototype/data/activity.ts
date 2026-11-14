import { minutesAgo } from '../clock'
import type { ActivityEvent, EventKind } from '../types'

type Extra = Pick<ActivityEvent, 'log' | 'needsIntervention' | 'applicationId' | 'jobId'>

let n = 0
const ev = (age: number, kind: EventKind, title: string, detail?: string, extra: Extra = {}): ActivityEvent => ({
  id: `evt-${String(++n).padStart(3, '0')}`,
  at: minutesAgo(age),
  kind,
  title,
  ...(detail ? { detail } : {}),
  ...extra,
})

const log = (...lines: string[]) => ({ log: lines })

// Newest first, covering the last 24 hours.
export const MOCK_EVENTS: ActivityEvent[] = [
  ev(3, 'apply', 'Applying to Harbor Analytics', 'Filling the Greenhouse form', { applicationId: 'app-harbor', ...log('open form', 'upload resume v2', 'answer 0 screening questions') }),
  ev(6, 'tailor', 'Tailoring resume for Kestrel Cloud', 'Reordering bullets toward Docker and C#', { applicationId: 'app-kestrel' }),
  ev(12, 'system', 'You queued Palisade Security', 'Manual override of an agent rejection', { applicationId: 'app-palisade' }),
  ev(50, 'apply', 'Submitted to Brightwave Labs', 'Automatic: score and rules met', { applicationId: 'app-brightwave', ...log('form submitted', 'no confirmation page shown') }),
  ev(95, 'scan', 'New posting: Kestrel Cloud, Backend Engineer', 'Found in the Greenhouse feed', { jobId: 'greenhouse:kestrel:5120' }),
  ev(140, 'verify', 'Verified Nimbus Ledger application', 'Confirmation email matched', { applicationId: 'app-nimbus', ...log('inbox search: "Nimbus Ledger"', 'match: We received your application') }),
  ev(150, 'apply', 'Submitted to Nimbus Ledger', 'Automatic: score and rules met', { applicationId: 'app-nimbus' }),
  ev(190, 'evaluate', 'Selected Nimbus Ledger, Backend Engineer, Payments', 'Matched C#, .NET, SQL Server', { jobId: 'greenhouse:nimbus:1001', ...log('skills: 4/4 required', 'location: Bengaluru hybrid ok', 'years: 4 >= 3') }),
  ev(245, 'apply', 'Orchid Health is waiting for your approval', 'Seniority and years gap flagged', { applicationId: 'app-orchid', needsIntervention: true }),
  ev(300, 'evaluate', 'Needs review: Orchid Health, Senior Full-stack Engineer', 'Senior level, 5+ years asked', { jobId: 'lever:orchid:902' }),
  ev(350, 'apply', 'Quillpay is waiting for your approval', '2 screening answers drafted', { applicationId: 'app-quillpay', needsIntervention: true }),
  ev(360, 'tailor', 'Tailored resume for Quillpay', 'Version 1 created', { applicationId: 'app-quillpay' }),
  ev(420, 'evaluate', 'Selected Quillpay, Full-stack Engineer', 'React, TypeScript and .NET all match', { jobId: 'lever:quillpay:2044' }),
  ev(468, 'failure', 'Blocked at a CAPTCHA on Lumen Retail Tech', 'The agent never solves CAPTCHAs', { applicationId: 'app-lumen', needsIntervention: true, ...log('open form', 'detected CAPTCHA challenge', 'stopped without interacting') }),
  ev(510, 'evaluate', 'Needs review: Lumen Retail Tech, Backend Engineer', 'Go preferred, salary not stated', { jobId: 'greenhouse:lumen:61' }),
  ev(588, 'failure', 'Application to Tessera Robotics failed', 'Portal timeout (504). Safe to retry', { applicationId: 'app-tessera', needsIntervention: true, ...log('upload resume', 'HTTP 504 after 30s', 'nothing submitted') }),
  ev(610, 'evaluate', 'Selected Harbor Analytics, SDE-2, Backend', 'Kafka is the only gap', { jobId: 'greenhouse:harbor:318' }),
  ev(700, 'evaluate', 'Needs review: Tessera Robotics', 'On-site only', { jobId: 'lever:tessera:12' }),
  ev(800, 'evaluate', 'Selected Brightwave Labs, Software Engineer II', 'Azure and React match', { jobId: 'lever:brightwave:77' }),
  ev(850, 'apply', 'You rejected the Marlin Logistics application', 'Management role', { applicationId: 'app-marlin' }),
  ev(900, 'evaluate', 'Rejected Corvid Games, Gameplay Programmer', 'Outside your cities, C++ required', { jobId: 'lever:corvid:93' }),
  ev(1000, 'evaluate', 'Rejected Marlin Logistics, Engineering Manager', 'Management role, 8+ years', { jobId: 'greenhouse:marlin:2207' }),
  ev(1100, 'scan', 'Scan finished: 3 sources, 12 postings', 'Greenhouse, Lever and Ashby', log('greenhouse: 6 postings', 'lever: 6 postings', 'ashby: 0 postings')),
  ev(1200, 'evaluate', 'Rejected Sable Data, Data Engineering Intern', 'Excluded title', { jobId: 'lever:sable:15' }),
  ev(1260, 'evaluate', 'Rejected Palisade Security, Security Engineer', 'Role family mismatch', { jobId: 'greenhouse:palisade:408' }),
  ev(1300, 'scan', 'Scan started', 'Checking 3 sources'),
  ev(1340, 'system', 'Daily limit reset', '10 applications available today'),
  ev(1380, 'system', 'Settings saved', 'Minimum match score 70'),
  ev(1420, 'system', 'Master resume loaded', 'arjun-rao-master.tex'),
]

export interface RunStep {
  kind: EventKind
  title: string
  detail: string
  log: string[]
  effect?: 'tailor' | 'queueApproval' | 'autoSubmit' | 'verify'
}

/** The simulated run: each tick plays one step. */
export const RUN_SCRIPT: RunStep[] = [
  { kind: 'scan', title: 'Scanning job sources', detail: 'Checking 3 sources (simulated)', log: ['greenhouse: 6 postings', 'lever: 6 postings', '2 changed since last scan'] },
  { kind: 'evaluate', title: 'Evaluating Kestrel Cloud, Backend Engineer', detail: 'Score above the auto-apply threshold', log: ['skills: 3/4 required', 'missing: Kubernetes', 'verdict: selected'] },
  { kind: 'evaluate', title: 'Evaluating Orchid Health, Senior Full-stack Engineer', detail: 'Held for review: seniority gap', log: ['seniority: +1 level', 'years: 4 < 5', 'verdict: review'] },
  { kind: 'evaluate', title: 'Evaluating Corvid Games, Gameplay Programmer', detail: 'Rejected: outside your cities', log: ['location: Mumbai not preferred', 'verdict: rejected'] },
  { kind: 'tailor', title: 'Tailoring a resume version', detail: 'Reordering bullets for the next queued posting', log: ['read master resume', 'rank bullets by posting keywords', 'write variant'], effect: 'tailor' },
  { kind: 'apply', title: 'Preparing an application for approval', detail: 'Screening answers drafted; waiting for you', log: ['open form', 'draft answers', 'stop before submit'], effect: 'queueApproval' },
  { kind: 'apply', title: 'Submitting an automatic application', detail: 'Rules met: score and no screening questions', log: ['open form', 'upload resume', 'submit'], effect: 'autoSubmit' },
  { kind: 'verify', title: 'Verifying a submitted application', detail: 'Looking for a confirmation email', log: ['inbox search', 'match found'], effect: 'verify' },
]
