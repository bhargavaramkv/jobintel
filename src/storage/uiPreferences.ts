/**
 * Non-sensitive UI preferences only. Never store profile fields here.
 */
const PREFIX = 'jobintel.ui.'

export type UiPreferenceKey = 'profileSection'

export function readUiPreference(key: UiPreferenceKey): string | null {
  try {
    return localStorage.getItem(PREFIX + key)
  } catch {
    return null
  }
}

export function writeUiPreference(key: UiPreferenceKey, value: string): void {
  try {
    localStorage.setItem(PREFIX + key, value)
  } catch {
    /* storage disabled; preference is a convenience only */
  }
}

export function clearUiPreferences(): void {
  try {
    Object.keys(localStorage)
      .filter((k) => k.startsWith(PREFIX))
      .forEach((k) => localStorage.removeItem(k))
  } catch {
    /* ignore */
  }
}
