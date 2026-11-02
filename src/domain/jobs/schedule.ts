/**
 * The scan schedule in `.github/workflows/scan.yml`, mirrored for the UI (a test keeps them in
 * sync). Times are UTC: 02:13, 08:13 and 14:13 = 07:43, 13:43 and 19:43 IST. GitHub may start
 * scheduled runs late, so the UI says "around".
 */
export const SCAN_TIMES_UTC: ReadonlyArray<readonly [hour: number, minute: number]> = [
  [2, 13],
  [8, 13],
  [14, 13],
]

export function nextScheduledScan(now: Date = new Date()): Date {
  for (let dayOffset = 0; dayOffset < 2; dayOffset++) {
    for (const [h, m] of SCAN_TIMES_UTC) {
      const t = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + dayOffset, h, m))
      if (t.getTime() > now.getTime()) return t
    }
  }
  throw new Error('unreachable')
}

/** Cron expression equivalent of SCAN_TIMES_UTC (all minutes must match). */
export function scheduleCron(): string {
  const minutes = new Set(SCAN_TIMES_UTC.map(([, m]) => m))
  if (minutes.size !== 1) throw new Error('Scan times must share one minute')
  return `${[...minutes][0]} ${SCAN_TIMES_UTC.map(([h]) => h).join(',')} * * *`
}
