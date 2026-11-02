import { isActiveStage, stageOf, STAGES, type JobAction, type JobRef, type Stage } from '../jobs/actions'

/** Application management helpers (Phase 6). Pure and browser-local. */

/** Records in the pipeline: any stage, excluding jobs marked "Not interested". */
export function applicationsOf(actions: Iterable<JobAction>): JobAction[] {
  return [...actions].filter((a) => a.decision !== 'rejected' && !!stageOf(a))
}

const norm = (s: string) =>
  s
    .toLowerCase()
    .replace(/\(.*?\)/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()

export const sameRole = (a: { company: string; title: string }, b: { company: string; title: string }) =>
  norm(a.company) === norm(b.company) && norm(a.title) === norm(b.title)

/**
 * An ACTIVE application for the same company and title under a different id (e.g. a reposted
 * job, or a manual entry for a job that is also in the feed). Used to stop accidental duplicates.
 */
export function findDuplicate(
  actions: Iterable<JobAction>,
  role: { company: string; title: string },
  excludeJobId?: string,
): JobAction | undefined {
  return applicationsOf(actions).find((a) => a.jobId !== excludeJobId && isActiveStage(stageOf(a)) && sameRole(a.snapshot, role))
}

export function newManualId(): string {
  const r = globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
  return `manual:${r}`
}

/** A job the user is tracking that isn't in the public feed. */
export function manualRef(input: { title: string; company: string; url: string }, id = newManualId()): JobRef {
  return {
    jobId: id,
    snapshot: { title: input.title.trim(), company: input.company.trim(), url: input.url.trim(), ats: 'manual', cities: [], locations: [] },
  }
}

export interface FollowUp {
  jobId: string
  title: string
  company: string
  dueOn: string
  what: string
}

/** Application follow-ups due on or before `day` (YYYY-MM-DD), oldest first. */
export function dueApplicationFollowUps(actions: Iterable<JobAction>, day: string): FollowUp[] {
  return applicationsOf(actions)
    .filter((a) => isActiveStage(stageOf(a)) && a.followUpOn && a.followUpOn <= day)
    .map((a) => ({
      jobId: a.jobId,
      title: a.snapshot.title,
      company: a.snapshot.company,
      dueOn: a.followUpOn!,
      what: a.nextAction ?? 'Follow up',
    }))
    .sort((a, b) => a.dueOn.localeCompare(b.dueOn))
}

/** Upcoming interviews (today or later), soonest first. */
export function upcomingInterviews(actions: Iterable<JobAction>, day: string) {
  return applicationsOf(actions)
    .flatMap((a) => (a.interviews ?? []).filter((i) => i.on >= day && i.outcome !== 'failed').map((i) => ({ a, i })))
    .sort((x, y) => x.i.on.localeCompare(y.i.on))
}

export function groupByStage(apps: JobAction[]): Array<{ stage: Stage; label: string; items: JobAction[] }> {
  return STAGES.map((s) => ({
    stage: s.id,
    label: s.label,
    items: apps
      .filter((a) => stageOf(a) === s.id)
      .sort((a, b) => (b.followUpOn ? 1 : 0) - (a.followUpOn ? 1 : 0) || b.updatedAt.localeCompare(a.updatedAt)),
  }))
}

/** Days between two YYYY-MM-DD dates. */
export function daysBetween(from: string, to: string): number {
  const d = (s: string) => Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10))
  return Math.round((d(to) - d(from)) / 86_400_000)
}
