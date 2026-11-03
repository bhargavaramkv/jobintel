import type { AiContextBundle, ExportOptions } from '../../domain/ai/context'
import { exportRecordOf, serializeContext } from '../../domain/ai/context'
import { parseAiResult, reviewImport, toStored } from '../../domain/ai/import'
import type { AutomationSettings, ExportRecord, StoredBriefing, StoredRecommendation } from '../../domain/ai/schema'
import {
  CONTEXT_PATH,
  contextFingerprint,
  isAutoAcceptable,
  newResultFiles,
  rememberImported,
  RESULTS_DIR,
  RESUME_PATH,
  shouldPush,
  shouldPushResume,
  stableHash,
} from '../../domain/ai/sync'
import type { GitHubClient } from './github'

export interface SyncDeps {
  settings: AutomationSettings
  client: GitHubClient
  /** Builds the context from the live records with the given options and id. */
  buildContext: (options: ExportOptions, contextId: string) => AiContextBundle
  now: () => Date
  newId: () => string
  existingRecIds: ReadonlySet<string>
  knownContextIds: ReadonlySet<string>
  knownJobIds: ReadonlySet<string>
  saveSettings: (s: AutomationSettings) => Promise<void>
  saveExport: (r: ExportRecord) => Promise<void>
  saveRec: (r: StoredRecommendation) => Promise<void>
  saveBriefing: (b: StoredBriefing) => Promise<void>
  /** Applies low-risk recommendations; returns how many were applied. */
  autoAccept: (recs: StoredRecommendation[]) => Promise<number>
}

export interface SyncReport {
  pushed: boolean
  resumePushed: boolean
  resumePulled: boolean
  imported: number
  autoAccepted: number
  error?: string
}

/**
 * One round of the automated loop. Never throws: failures are recorded on the settings record
 * (shown in the Automation panel) and retried on the next round.
 */
export async function runSyncCycle(d: SyncDeps): Promise<SyncReport> {
  let s: AutomationSettings = { ...d.settings }
  const report: SyncReport = { pushed: false, resumePushed: false, resumePulled: false, imported: 0, autoAccepted: 0 }
  const now = d.now()
  try {
    await d.client.checkAccess()
    // A round that gets this far starts with a clean slate; new problems are recorded below.
    const { lastError: _previous, ...clean } = s
    void _previous
    s = clean

    // Adopt the resume already stored in the private repository when this browser has none.
    if (!s.resumeText?.trim()) {
      const remote = await d.client.getFile(RESUME_PATH)
      if (remote?.text.trim()) {
        s = { ...s, resumeText: remote.text.slice(0, 30_000), lastResumeHash: stableHash(remote.text.trim()) }
        report.resumePulled = true
      }
    }

    // Push: the context export, only when something changed (and at most every 30 minutes).
    const contextId = d.newId()
    const bundle = d.buildContext(s.exportOptions, contextId)
    const fingerprint = contextFingerprint(bundle)
    if (shouldPush(s, fingerprint, now)) {
      const text = serializeContext(bundle)
      await d.client.putFile(CONTEXT_PATH, text, `context: ${now.toISOString()}`)
      await d.saveExport(exportRecordOf(bundle, s.exportOptions, text, now))
      s = { ...s, lastPushAt: now.toISOString(), lastPushHash: fingerprint }
      report.pushed = true
    }
    if (shouldPushResume(s)) {
      const text = s.resumeText!.trim()
      await d.client.putFile(RESUME_PATH, text, 'resume: update')
      s = { ...s, lastResumeHash: stableHash(text) }
      report.resumePushed = true
    }

    // Pull: every result file the routine wrote that this browser hasn't imported.
    const fresh = newResultFiles(await d.client.listDir(RESULTS_DIR), s.importedResults)
    const existing = new Set(d.existingRecIds)
    for (const file of fresh) {
      const got = await d.client.getFile(`${RESULTS_DIR}/${file.name}`)
      s = { ...s, importedResults: rememberImported(s.importedResults, { name: file.name, sha: file.sha }) }
      if (!got) continue
      const parsed = parseAiResult(got.text)
      if (!parsed.ok) {
        s = { ...s, lastError: `${file.name}: ${parsed.error}`.slice(0, 400) }
        continue
      }
      const review = reviewImport(parsed.value, { knownContextIds: d.knownContextIds, knownJobIds: d.knownJobIds, existingIds: existing, now })
      const stored = toStored(parsed.value, review.fresh, now)
      for (const r of stored.recommendations) {
        await d.saveRec(r)
        existing.add(r.id)
      }
      if (stored.briefing) await d.saveBriefing(stored.briefing)
      report.imported += stored.recommendations.length
      report.autoAccepted += await d.autoAccept(stored.recommendations.filter((r) => isAutoAcceptable(r, s)))
    }
    s = { ...s, lastPullAt: now.toISOString() }
  } catch (err) {
    report.error = err instanceof Error ? err.message : String(err)
    s = { ...s, lastError: report.error.slice(0, 400) }
  }
  await d.saveSettings({ ...s, updatedAt: d.now().toISOString() })
  return report
}
