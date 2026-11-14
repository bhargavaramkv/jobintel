/** Fixed "now" so every screen and test is deterministic. */
export const PROTOTYPE_NOW = '2026-11-14T09:00:00+05:30'

const MINUTE = 60_000

/** ISO timestamp `minutes` before PROTOTYPE_NOW (negative = after). */
export function minutesAgo(minutes: number): string {
  return new Date(new Date(PROTOTYPE_NOW).getTime() - minutes * MINUTE).toISOString()
}

export function addMinutes(iso: string, minutes: number): string {
  return new Date(new Date(iso).getTime() + minutes * MINUTE).toISOString()
}

const TIME = new Intl.DateTimeFormat('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' })
const DAY = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', timeZone: 'Asia/Kolkata' })

export const formatTime = (iso: string) => TIME.format(new Date(iso))
export const formatDay = (iso: string) => DAY.format(new Date(iso))
export const formatStamp = (iso: string) => `${formatDay(iso)}, ${formatTime(iso)}`

/** Calendar day (IST) of an ISO timestamp, for "today" comparisons. */
export const dayKey = (iso: string) => new Date(new Date(iso).getTime() + 330 * MINUTE).toISOString().slice(0, 10)
