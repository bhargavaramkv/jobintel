import { useCallback, useEffect, useRef } from 'react'
import { planApply } from '../../domain/ai/apply'
import { withStatus } from '../../domain/ai/lifecycle'
import type { StoredRecommendation } from '../../domain/ai/schema'
import type { JobAction } from '../../domain/jobs/actions'
import type { Contact } from '../../domain/referrals/contacts'
import { useJobActions } from '../jobs/useJobActions'
import { useContacts } from '../referrals/useContacts'
import { useAiRecommendations } from './aiContext'
import { useJobLookup } from './useJobLookup'

export type AcceptOutcome = { id: string; ok: true; summary: string } | { id: string; ok: false; reason: string }

const newId = () => globalThis.crypto?.randomUUID?.() ?? `ai-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`

/**
 * Accept one or many recommendations through one code path (inbox button, "Accept all", and the
 * background auto-accept). A batch plans each item against a WORKING COPY updated after every
 * change, so two suggestions for the same job never overwrite each other.
 */
export function useAcceptRecommendations() {
  const { save } = useAiRecommendations()
  const { putAction } = useJobActions()
  const { contacts, save: saveContact } = useContacts()
  const { jobs, actions } = useJobLookup()
  const latest = useRef({ save, putAction, contacts, saveContact, jobs, actions })
  useEffect(() => {
    latest.current = { save, putAction, contacts, saveContact, jobs, actions }
  })

  return useCallback(async (recs: StoredRecommendation[], opts: { auto?: boolean } = {}): Promise<AcceptOutcome[]> => {
    const c = latest.current
    const workingActions = new Map<string, JobAction>(c.actions)
    const workingContacts = new Map<string, Contact>(c.contacts)
    const out: AcceptOutcome[] = []
    for (const rec of recs) {
      const now = new Date()
      const plan = planApply(rec, { actions: workingActions, jobs: c.jobs, contacts: workingContacts, now, newId })
      if (!plan.ok) {
        out.push({ id: rec.id, ok: false, reason: plan.reason })
        continue
      }
      if (plan.next) {
        await c.putAction(plan.next)
        workingActions.set(plan.next.jobId, plan.next)
      }
      if (plan.contact) {
        await c.saveContact(plan.contact)
        workingContacts.set(plan.contact.id, plan.contact)
      }
      const summary = opts.auto ? `Applied automatically (low-risk): ${plan.summary}` : plan.summary
      try {
        await c.save(withStatus(rec, 'accepted', now, summary))
      } catch {
        out.push({ id: rec.id, ok: false, reason: 'The change was applied, but this recommendation’s status could not be saved. Reload before trying again.' })
        continue
      }
      out.push({ id: rec.id, ok: true, summary })
    }
    return out
  }, [])
}
