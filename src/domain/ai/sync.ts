import type { AiContextBundle } from './context'
import { LOW_RISK_ACTIONS, type AutomationSettings, type StoredRecommendation } from './schema'

/**
 * Pure decisions for the automated loop (A2/A3):
 *   browser ──push context──► private repo ──► daily Claude routine ──► results/*.json ──pull──► inbox
 * Kept free of I/O so every rule here is unit-tested.
 */

export const PUSH_MIN_INTERVAL_MS = 30 * 60_000
export const PULL_INTERVAL_MS = 30 * 60_000
export const IMPORTED_MEMORY = 120
/** Notes and follow-up dates below this confidence still wait for a click. */
export const AUTO_ACCEPT_MIN_CONFIDENCE = 0.6

export const CONTEXT_PATH = 'context/latest.json'
export const RESUME_PATH = 'profile/resume.md'
export const RESULTS_DIR = 'results'
const RESULT_FILE = /^\d{4}-\d{2}-\d{2}[\w.-]*\.json$/

/** FNV-1a, two seeds → 16 hex chars. Only used to detect "did anything change", not for security. */
export function stableHash(text: string): string {
  let a = 0x811c9dc5
  let b = 0x01000193 ^ 0x5bd1e995
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i)
    a = Math.imul(a ^ c, 0x01000193) >>> 0
    b = Math.imul(b ^ c, 0x5bd1e995) >>> 0
  }
  return a.toString(16).padStart(8, '0') + b.toString(16).padStart(8, '0')
}

/** Fingerprint of what the context says, ignoring the per-export id and timestamp. */
export function contextFingerprint(bundle: AiContextBundle): string {
  const { contextId: _id, generatedAt: _at, ...rest } = bundle
  void _id
  void _at
  return stableHash(JSON.stringify(rest))
}

export function shouldPush(s: AutomationSettings, fingerprint: string, now: Date): boolean {
  if (!s.autoSync || !s.token || !s.consentedAt) return false
  if (s.lastPushHash === fingerprint) return false
  return !s.lastPushAt || now.getTime() - Date.parse(s.lastPushAt) >= PUSH_MIN_INTERVAL_MS
}

export function shouldPushResume(s: AutomationSettings): boolean {
  const text = s.resumeText?.trim()
  return !!(s.autoSync && s.token && s.consentedAt && s.exportOptions.resume && text && stableHash(text) !== s.lastResumeHash)
}

/** Result files not imported yet (by name and content sha), oldest first, at most `limit`. */
export function newResultFiles(listing: ReadonlyArray<{ name: string; sha: string; type: string }>, imported: AutomationSettings['importedResults'], limit = 10) {
  const seen = new Set(imported.map((i) => `${i.name}@${i.sha}`))
  return listing
    .filter((f) => f.type === 'file' && RESULT_FILE.test(f.name) && !seen.has(`${f.name}@${f.sha}`))
    .sort((x, y) => x.name.localeCompare(y.name))
    .slice(0, limit)
}

export function rememberImported(list: AutomationSettings['importedResults'], item: { name: string; sha: string }) {
  return [...list.filter((i) => i.name !== item.name), item].slice(-IMPORTED_MEMORY)
}

/** Only append-only, reversible changes with reasonable confidence are applied without a click. */
export function isAutoAcceptable(rec: StoredRecommendation, settings: Pick<AutomationSettings, 'autoAcceptLowRisk'>): boolean {
  return settings.autoAcceptLowRisk && rec.status === 'generated' && LOW_RISK_ACTIONS.includes(rec.action.type) && rec.confidence >= AUTO_ACCEPT_MIN_CONFIDENCE
}
