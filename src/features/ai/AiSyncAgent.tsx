import { useCallback, useEffect, useRef } from 'react'
import { buildAiContext, type ExportOptions } from '../../domain/ai/context'
import { PULL_INTERVAL_MS } from '../../domain/ai/sync'
import { useJobFeed } from '../jobs/jobFeed'
import { useJobActions } from '../jobs/useJobActions'
import { useOutreach } from '../outreach/outreachContext'
import { useProfile } from '../profile/useProfile'
import { useContacts } from '../referrals/useContacts'
import { useAiBriefings, useAiExports, useAiRecommendations, useAutomationSettings } from './aiContext'
import { githubClient } from './github'
import { runSyncCycle, type SyncReport } from './syncCycle'
import { useAcceptRecommendations } from './useAcceptRecommendations'

export const SYNC_NOW_EVENT = 'jobintel:ai-sync-now'
export const SYNC_DONE_EVENT = 'jobintel:ai-sync-done'

const newId = () => globalThis.crypto?.randomUUID?.() ?? `ctx-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`

/**
 * Runs the automated loop while JobIntel is open: on start, every 30 minutes, and on "Sync now".
 * Does nothing until the user connects a private repository in Assistant → Automation.
 */
export function AiSyncAgent() {
  const { settings, save: saveSettings, status: settingsStatus } = useAutomationSettings()
  const { recommendations, save: saveRec, status: recStatus } = useAiRecommendations()
  const { save: saveBriefing } = useAiBriefings()
  const { exports, save: saveExport } = useAiExports()
  const { profile } = useProfile()
  const { actions, status: actionsStatus } = useJobActions()
  const { contacts } = useContacts()
  const { messages } = useOutreach()
  const { state: feedState } = useJobFeed()
  const accept = useAcceptRecommendations()

  const live = useRef({ settings, recommendations, exports, profile, actions, contacts, messages, feedState, saveSettings, saveRec, saveBriefing, saveExport, accept })
  useEffect(() => {
    live.current = { settings, recommendations, exports, profile, actions, contacts, messages, feedState, saveSettings, saveRec, saveBriefing, saveExport, accept }
  })
  const running = useRef(false)

  const run = useCallback(async () => {
    const l = live.current
    const s = l.settings
    if (running.current || !s?.token) return
    running.current = true
    let report: SyncReport | undefined
    try {
      const jobs = l.feedState.status === 'ready' ? l.feedState.feed.jobs : []
      report = await runSyncCycle({
        settings: s,
        client: githubClient(s.repo, s.token),
        buildContext: (options: ExportOptions, contextId: string) =>
          buildAiContext(
            { profile: l.profile, actions: l.actions.values(), jobs, contacts: l.contacts.values(), messages: l.messages.values(), now: new Date(), resumeText: live.current.settings?.resumeText },
            options,
            contextId,
          ),
        now: () => new Date(),
        newId,
        existingRecIds: new Set(l.recommendations.keys()),
        knownContextIds: new Set(l.exports.keys()),
        knownJobIds: new Set([...jobs.map((j) => j.id), ...l.actions.keys()]),
        saveSettings: l.saveSettings,
        saveExport: l.saveExport,
        saveRec: l.saveRec,
        saveBriefing: l.saveBriefing,
        autoAccept: async (recs) => (await l.accept(recs, { auto: true })).filter((o) => o.ok).length,
      })
    } finally {
      running.current = false
      window.dispatchEvent(new CustomEvent(SYNC_DONE_EVENT, { detail: report }))
    }
  }, [])

  // Wait until local data and the public feed have loaded, so the context is complete.
  const ready =
    !!settings?.token &&
    settingsStatus === 'ready' &&
    recStatus === 'ready' &&
    actionsStatus === 'ready' &&
    feedState.status !== 'loading'

  useEffect(() => {
    if (!ready) return
    void run()
    const id = window.setInterval(() => void run(), PULL_INTERVAL_MS)
    const onDemand = () => void run()
    window.addEventListener(SYNC_NOW_EVENT, onDemand)
    return () => {
      window.clearInterval(id)
      window.removeEventListener(SYNC_NOW_EVENT, onDemand)
    }
  }, [ready, run])

  return null
}
