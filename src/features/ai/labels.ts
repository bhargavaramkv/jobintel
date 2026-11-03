import { REJECT_REASONS, STAGE_LABEL } from '../../domain/jobs/actions'
import type { Evidence, ProposedAction } from '../../domain/ai/schema'

export const SOURCE_LABEL: Record<Evidence['source'], string> = {
  profile: 'Your profile',
  job: 'Job posting',
  match: 'Match engine',
  application: 'Your application',
  referral: 'Referral lead',
  external: 'Outside knowledge',
}

export const confidencePct = (c: number) => `${Math.round(c * 100)}%`

export function confidenceWord(c: number): string {
  if (c >= 0.75) return 'high'
  if (c >= 0.5) return 'medium'
  return 'low'
}

const reasonLabel = (id: string) => REJECT_REASONS.find((r) => r.id === id)?.label ?? id

/** Plain-language description of what accepting would change. */
export function describeAction(action: ProposedAction): string {
  switch (action.type) {
    case 'none':
      return 'No change to your records.'
    case 'shortlist':
      return 'Shortlist this job.'
    case 'not-interested':
      return `Mark this job Not interested (${action.reasons.map(reasonLabel).join(', ')}).`
    case 'add-note':
      return `Add a note to this job: “${action.note}”`
    case 'set-follow-up':
      return `Set a follow-up on ${action.followUpOn}${action.nextAction ? ` and next action “${action.nextAction}”` : ''}.`
    case 'set-stage':
      return `Move this application to “${STAGE_LABEL[action.stage]}”${action.note ? ` (${action.note})` : ''}.`
    case 'track-job':
      return `Track ${action.title} at ${action.company} (${action.location}, found on ${action.source}) as a shortlisted job.`
    case 'add-lead':
      return `Add ${action.name}${action.role ? `, ${action.role}` : ''} at ${action.company} as a referral lead (found at ${action.sourceUrl}). ${action.reason}`
  }
}
