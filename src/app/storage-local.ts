/**
 * Thin wrapper over window.localStorage. Every read and write is guarded: storage can be missing,
 * blocked (private windows, site settings) or full, and the app must still render without it.
 */
export const STORAGE_KEY = 'jobintel:v2'

function storage(): Storage | null {
  try {
    return window.localStorage
  } catch {
    return null
  }
}

/** The parsed JSON stored under `key`, or null when absent, unreadable or not valid JSON. */
export function readStored(key: string = STORAGE_KEY): unknown {
  try {
    const raw = storage()?.getItem(key)
    return raw == null ? null : JSON.parse(raw)
  } catch {
    return null
  }
}

/** Returns false when the value could not be saved. */
export function writeStored(value: unknown, key: string = STORAGE_KEY): boolean {
  try {
    const s = storage()
    if (!s) return false
    s.setItem(key, JSON.stringify(value))
    return true
  } catch {
    return false
  }
}
