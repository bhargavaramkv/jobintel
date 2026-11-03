import { dueApplicationFollowUps, upcomingInterviews } from '../applications/pipeline'
import type { JobAction } from '../jobs/actions'
import { followUpState } from '../outreach/drafts'
import { threadOf, type OutreachMessage } from '../outreach/messages'
import type { Contact } from '../referrals/contacts'

/**
 * What needs the user's attention today, computed from local records only (Phase 7).
 * Used for the in-app summary and optional browser notifications while JobIntel is open.
 */
export interface ReminderSummary {
  outreachFollowUps: number
  applicationFollowUps: number
  interviewsToday: number
  total: number
  lines: string[]
}

export function reminderSummary(
  actions: Iterable<JobAction>,
  contacts: Iterable<Contact>,
  messages: Iterable<OutreachMessage>,
  day: string,
): ReminderSummary {
  const msgs = [...messages]
  const outreach = [...contacts].filter((c) => {
    if (c.status === 'dismissed') return false
    const t = threadOf(msgs, c.id)
    const f = followUpState(t.sent, t.replied)
    return !!f.dueOn && f.dueOn <= day
  })
  const acts = [...actions]
  const apps = dueApplicationFollowUps(acts, day)
  const interviews = upcomingInterviews(acts, day).filter(({ i }) => i.on === day)
  const lines: string[] = []
  if (interviews.length) lines.push(`${interviews.length} interview${interviews.length > 1 ? 's' : ''} today`)
  if (apps.length) lines.push(`${apps.length} application follow-up${apps.length > 1 ? 's' : ''} due`)
  if (outreach.length) lines.push(`${outreach.length} outreach follow-up${outreach.length > 1 ? 's' : ''} due`)
  return {
    outreachFollowUps: outreach.length,
    applicationFollowUps: apps.length,
    interviewsToday: interviews.length,
    total: outreach.length + apps.length + interviews.length,
    lines,
  }
}

/** Notify at most once per day, and only when something is due. */
export function shouldNotify(summary: ReminderSummary, lastNotifiedDay: string | null, day: string): boolean {
  return summary.total > 0 && lastNotifiedDay !== day
}
