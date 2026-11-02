import { LIMITS } from './schema'

export type TagResult = { ok: true; value: string } | { ok: false; error: string }

/** Normalise whitespace and validate a candidate tag against an existing list. */
export function validateTag(raw: string, existing: readonly string[]): TagResult {
  const value = raw.replace(/\s+/g, ' ').trim()
  if (!value) return { ok: false, error: 'Enter a value first' }
  if (value.length > LIMITS.tag) {
    return { ok: false, error: `Keep entries under ${LIMITS.tag} characters` }
  }
  if (existing.length >= LIMITS.tagsPerList) {
    return { ok: false, error: `You can add up to ${LIMITS.tagsPerList} entries` }
  }
  const lower = value.toLowerCase()
  const clash = existing.find((t) => t.toLowerCase() === lower)
  if (clash) return { ok: false, error: `“${clash}” is already in the list` }
  return { ok: true, value }
}

/** Split pasted text such as "React, Node.js; SQL" into candidate tags. */
export function splitTagInput(raw: string): string[] {
  return raw
    .split(/[,;\n]/)
    .map((s) => s.trim())
    .filter(Boolean)
}
