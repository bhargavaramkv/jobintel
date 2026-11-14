import type { CandidateProfile } from '../domain/profile/schema'
import { matchJob } from '../domain/match/score'
import { addMinutes, PROTOTYPE_NOW, minutesAgo } from './clock'
import { EMPTY_SEED, RUN_SCRIPT, SEED } from './data'
import type { RunStep } from './data/activity'
import type {
  ActivityEvent,
  AppMode,
  Application,
  AppStatus,
  AutomationMode,
  EventKind,
  MockJob,
  PrototypeSettings,
  PrototypeState,
  Scenario,
} from './types'

export type Action =
  | { type: 'agent/start' | 'agent/pause' | 'agent/resume' | 'agent/stop' | 'agent/tick' | 'reset' }
  | { type: 'app/approve' | 'app/reject' | 'app/retry'; id: string }
  | { type: 'event/resolve'; id: string }
  | { type: 'resume/uploadMaster'; name: string; size: number; text: string }
  | { type: 'resume/generate'; resumeId: string }
  | { type: 'profile/save'; profile: CandidateProfile }
  | { type: 'settings/save'; settings: PrototypeSettings; section: string }
  | { type: 'onboarding/complete'; profile: CandidateProfile; mode: AutomationMode }
  | { type: 'job/queue' | 'job/override'; jobId: string }
  | { type: 'scenario/set'; scenario: Scenario }
  | { type: 'toast/dismiss'; id: number }

export function initialState(scenario: Scenario = 'demo'): PrototypeState {
  const seed = scenario === 'empty' ? EMPTY_SEED : SEED
  return {
    ...seed,
    scenario,
    now: new Date(PROTOTYPE_NOW).toISOString(),
    seq: 1000,
    epoch: 0,
    run: { status: 'idle', step: 0, total: RUN_SCRIPT.length, lastRunAt: scenario === 'empty' ? undefined : minutesAgo(1100) },
    toasts: [],
  }
}

const jobOf = (s: PrototypeState, id: string) => s.jobs.find((j) => j.id === id)
const label = (s: PrototypeState, app: Application) => {
  const j = jobOf(s, app.jobId)
  return j ? `${j.company}, ${j.title}` : app.jobId
}

interface Note {
  kind: EventKind
  title: string
  detail?: string
  toast?: string
  extra?: Partial<ActivityEvent>
}

/** Advance the clock one minute, append an event (newest first) and optionally a toast. */
function note(s: PrototypeState, n: Note): PrototypeState {
  const now = addMinutes(s.now, 1)
  const seq = s.seq + 1
  const event: ActivityEvent = { id: `evt-n${seq}`, at: now, kind: n.kind, title: n.title, ...(n.detail ? { detail: n.detail } : {}), ...n.extra }
  const toasts = n.toast ? [...s.toasts, { id: seq, message: n.toast }].slice(-3) : s.toasts
  return { ...s, now, seq, events: [event, ...s.events], toasts }
}

const setApp = (s: PrototypeState, id: string, patch: Partial<Application>, status: AppStatus, text: string): PrototypeState => ({
  ...s,
  applications: s.applications.map((a) =>
    a.id === id ? { ...a, ...patch, status, updatedAt: s.now, history: [...a.history, { at: s.now, status, note: text }] } : a,
  ),
})

const resolveEventsFor = (s: PrototypeState, appId: string): PrototypeState => ({
  ...s,
  events: s.events.map((e) => (e.applicationId === appId && e.needsIntervention ? { ...e, resolved: true } : e)),
})

export function modeFor(job: MockJob, score: number | null, settings: PrototypeSettings): AppMode {
  const a = settings.automation
  const ok =
    a.mode === 'auto' &&
    a.autoApplyEnabled &&
    score !== null &&
    score >= a.autoApplyMinScore &&
    !(a.requireNoScreeningQuestions && job.screeningQuestions)
  return ok ? 'auto' : 'approval'
}

/** The unresolved intervention event of an application, if any. */
export const interventionFor = (s: PrototypeState, appId: string) =>
  s.events.find((e) => e.applicationId === appId && e.needsIntervention && !e.resolved)

/** Whether the settings allow the agent to submit without asking. */
const autoSubmitAllowed = (s: PrototypeState) =>
  s.settings.automation.mode === 'auto' && s.settings.automation.autoApplyEnabled && s.settings.permissions.submitApplications

function runEffect(s: PrototypeState, effect: RunStep['effect']): { state: PrototypeState; app?: Application } {
  if (!effect) return { state: s }
  if (effect === 'tailor' && !s.settings.permissions.tailorResumes) return { state: s }
  // Settings that do not allow automatic submission send the application to the approval queue instead.
  const gated = effect === 'autoSubmit' && !autoSubmitAllowed(s)
  const key = gated ? 'queueApproval' : effect
  const rule = {
    tailor: { from: 'queued', to: 'tailoring', mode: undefined, text: 'Tailoring started (simulated)' },
    queueApproval: { from: 'tailoring', to: 'awaiting-approval', mode: 'approval', text: 'Ready for your review (simulated)' },
    autoSubmit: { from: 'tailoring', to: 'submitted', mode: 'auto', text: 'Submitted automatically (simulated)' },
    verify: { from: 'submitted', to: 'verified', mode: undefined, text: 'Confirmation found (simulated)' },
  }[key] as { from: AppStatus; to: AppStatus; mode?: AppMode; text: string }
  const target = s.applications.find((a) => a.status === rule.from && (!rule.mode || gated || a.mode === rule.mode))
  if (!target) return { state: s }
  const patch: Partial<Application> =
    rule.to === 'submitted'
      ? { submittedAt: s.now, notVerifiedReason: 'Waiting for a confirmation email.' }
      : rule.to === 'verified'
        ? { verification: { method: 'Confirmation email', evidence: 'Simulated: a "We received your application" message matched this posting.', at: s.now }, notVerifiedReason: undefined }
        : gated
          ? { mode: 'approval' }
          : {}
  const state = setApp(s, target.id, patch, rule.to, rule.text)
  return { state, app: state.applications.find((a) => a.id === target.id) }
}

function tick(s: PrototypeState): PrototypeState {
  if (s.run.status !== 'running') return s
  const step = RUN_SCRIPT[s.run.step]
  const moved = runEffect(s, step.effect)
  // The script names demo postings; with no jobs loaded, log a generic note instead.
  const noJobs = step.kind === 'evaluate' && s.jobs.length === 0
  let next = note(moved.state, {
    kind: step.kind,
    title: noJobs ? 'No jobs to evaluate (simulated)' : step.title,
    detail: noJobs ? undefined : moved.app ? `${step.detail} (${label(s, moved.app)})` : step.detail,
    extra: {
      ...(noJobs ? {} : { log: step.log }),
      ...(moved.app ? { applicationId: moved.app.id } : {}),
      ...(moved.app && step.effect === 'queueApproval' ? { needsIntervention: true } : {}),
    },
  })
  const done = s.run.step + 1 >= s.run.total
  next = { ...next, run: { ...next.run, step: s.run.step + 1, ...(done ? { status: 'idle' as const, lastRunAt: next.now } : {}) } }
  if (done) next = note(next, { kind: 'system', title: 'Run finished (simulated)', detail: `${s.run.total} steps completed`, toast: 'Simulated run finished. No real applications were sent.' })
  return next
}

export function reducer(s: PrototypeState, a: Action): PrototypeState {
  switch (a.type) {
    case 'agent/start': {
      if (s.run.status !== 'idle') return s
      const next = note(s, { kind: 'system', title: 'Run started (simulated)', toast: 'Simulated: agent run started.' })
      return { ...next, run: { ...next.run, status: 'running', step: 0 } }
    }
    case 'agent/pause': {
      if (s.run.status !== 'running') return s
      const next = note(s, { kind: 'system', title: 'Run paused', toast: 'Simulated: agent paused.' })
      return { ...next, run: { ...next.run, status: 'paused' } }
    }
    case 'agent/resume': {
      if (s.run.status !== 'paused') return s
      const next = note(s, { kind: 'system', title: 'Run resumed', toast: 'Simulated: agent resumed.' })
      return { ...next, run: { ...next.run, status: 'running' } }
    }
    case 'agent/stop': {
      if (s.run.status === 'idle') return s
      const next = note(s, { kind: 'system', title: 'Run stopped', toast: 'Simulated: agent stopped.' })
      return { ...next, run: { ...next.run, status: 'idle', step: 0 } }
    }
    case 'agent/tick':
      return tick(s)

    case 'app/approve':
    case 'app/reject': {
      const app = s.applications.find((x) => x.id === a.id)
      if (!app || app.status !== 'awaiting-approval') return s
      const approve = a.type === 'app/approve'
      let next = setApp(
        s,
        app.id,
        approve ? { submittedAt: s.now, notVerifiedReason: 'Waiting for a confirmation email.' } : {},
        approve ? 'submitted' : 'rejected',
        approve ? 'You approved it; submitted (simulated)' : 'You rejected it',
      )
      next = resolveEventsFor(next, app.id)
      return note(next, {
        kind: 'apply',
        title: `${approve ? 'Approved' : 'Rejected'}: ${label(s, app)}`,
        detail: approve ? 'Simulated submission. Nothing was sent.' : 'The agent will not apply',
        toast: approve ? 'Simulated: application submitted. Nothing was sent.' : 'Simulated: application rejected.',
        extra: { applicationId: app.id },
      })
    }
    case 'app/retry': {
      const app = s.applications.find((x) => x.id === a.id)
      if (!app || app.status !== 'failed') return s
      let next = setApp(s, app.id, { failure: undefined }, 'queued', 'Retry requested (simulated)')
      next = resolveEventsFor(next, app.id)
      return note(next, { kind: 'apply', title: `Retrying: ${label(s, app)}`, toast: 'Simulated: moved back to the queue.', extra: { applicationId: app.id } })
    }
    case 'event/resolve': {
      const ev = s.events.find((e) => e.id === a.id)
      if (!ev || ev.resolved) return s
      const app = ev.applicationId ? s.applications.find((x) => x.id === ev.applicationId) : undefined
      let next: PrototypeState = { ...s, events: s.events.map((e) => (e.id === ev.id ? { ...e, resolved: true } : e)) }
      if (app?.status === 'blocked') next = setApp(next, app.id, { blocker: undefined, mode: 'approval' }, 'queued', 'You resolved the blocker (simulated)')
      return note(next, { kind: 'system', title: `Resolved: ${ev.title}`, toast: 'Simulated: marked as resolved.', extra: app ? { applicationId: app.id } : {} })
    }

    case 'resume/uploadMaster': {
      const next = { ...s, resumes: { ...s.resumes, master: { name: a.name, size: a.size, uploadedAt: s.now, tex: a.text } } }
      return note(next, { kind: 'system', title: `Master resume replaced: ${a.name}`, detail: 'Stored in memory only', toast: `Simulated: ${a.name} loaded. It was not uploaded anywhere.` })
    }
    case 'resume/generate': {
      const variant = s.resumes.variants.find((v) => v.id === a.resumeId)
      if (!variant) return s
      const last = variant.versions[variant.versions.length - 1]
      const version = {
        version: last.version + 1,
        createdAt: addMinutes(s.now, 1),
        summary: 'Regenerated with fresh keyword emphasis (simulated).',
        source: last.source.replace('\\begin{document}', `\\begin{document}\n% Simulated regeneration, version ${last.version + 1}`),
        changes: [{ section: 'Skills', before: 'Previous skill order', after: 'Skills reordered by posting keywords', reason: 'Simulated: the generator re-ranks skills against the posting.' }],
      }
      const next = { ...s, resumes: { ...s.resumes, variants: s.resumes.variants.map((v) => (v.id === variant.id ? { ...v, versions: [...v.versions, version] } : v)) } }
      return note(next, { kind: 'tailor', title: `Generated ${variant.title} v${version.version}`, toast: `Simulated: version ${version.version} generated.` })
    }

    case 'profile/save':
      return note({ ...s, profile: a.profile }, { kind: 'system', title: 'Profile saved', toast: 'Simulated: profile saved in memory.' })
    case 'settings/save':
      return note({ ...s, settings: a.settings }, { kind: 'system', title: `Settings saved: ${a.section}`, toast: `Simulated: ${a.section} settings saved.` })
    case 'onboarding/complete': {
      const settings = { ...s.settings, automation: { ...s.settings.automation, mode: a.mode } }
      return note({ ...s, profile: a.profile, settings, onboarded: true }, { kind: 'system', title: 'Onboarding complete', detail: `Automation: ${a.mode}`, toast: 'Simulated: setup complete. Nothing was stored.' })
    }

    case 'job/queue': {
      const job = jobOf(s, a.jobId)
      if (!job || s.applications.some((x) => x.jobId === job.id)) return s
      const score = matchJob(job, s.profile).score
      const seq = s.seq + 1
      const app: Application = {
        id: `app-n${seq}`,
        jobId: job.id,
        resumeId: null,
        resumeVersion: null,
        status: 'queued',
        mode: modeFor(job, score, s.settings),
        score,
        createdAt: s.now,
        updatedAt: s.now,
        verification: null,
        history: [{ at: s.now, status: 'queued', note: 'Queued by you from Discovery' }],
      }
      return note({ ...s, applications: [app, ...s.applications] }, { kind: 'apply', title: `Queued: ${job.company}, ${job.title}`, toast: 'Simulated: application queued.', extra: { applicationId: app.id, jobId: job.id } })
    }
    case 'job/override': {
      const job = jobOf(s, a.jobId)
      if (!job) return s
      const jobs = s.jobs.map((j) => (j.id === job.id ? { ...j, agentDecision: { verdict: 'rejected' as const, reasons: ['Overridden by you (simulated)', ...j.agentDecision.reasons] } } : j))
      return note({ ...s, jobs }, { kind: 'evaluate', title: `You rejected ${job.company}, ${job.title}`, toast: 'Simulated: moved to Rejected.', extra: { jobId: job.id } })
    }

    case 'toast/dismiss':
      return { ...s, toasts: s.toasts.filter((t) => t.id !== a.id) }
    case 'scenario/set': {
      const next = { ...initialState(a.scenario), epoch: s.epoch + 1 }
      return { ...next, toasts: [{ id: next.seq, message: `Simulated: switched to the ${a.scenario} scenario.` }] }
    }
    case 'reset': {
      const next = { ...initialState(s.scenario), epoch: s.epoch + 1 }
      return { ...next, toasts: [{ id: next.seq, message: 'Simulated: prototype data reset.' }] }
    }
  }
}
