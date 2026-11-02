import { useEffect, useState } from 'react'

/** Current time, refreshed every minute so greetings and dates roll over. */
export function useNow(override?: Date): Date {
  const [now, setNow] = useState(() => override ?? new Date())
  useEffect(() => {
    if (override) return
    const id = window.setInterval(() => setNow(new Date()), 60_000)
    return () => window.clearInterval(id)
  }, [override])
  return override ?? now
}
