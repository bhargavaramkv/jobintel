import { useEffect, useRef } from 'react'
import { localDate } from '../../domain/jobs/actions'
import { shouldNotify } from '../../domain/reminders/reminders'
import { readUiPreference, writeUiPreference } from '../../storage/uiPreferences'
import { useNow } from '../../components/layout/useNow'
import { notificationsSupported, useReminderSummary } from './useReminders'

const CHECK_EVERY_MS = 15 * 60_000

/**
 * While JobIntel is open and the user turned reminders on, shows at most one browser
 * notification per day summarising what's due. A static site can't wake itself, so nothing
 * happens while the tab is closed.
 */
export function ReminderAgent() {
  const summary = useReminderSummary(useNow())
  const latest = useRef(summary)
  useEffect(() => {
    latest.current = summary
  }, [summary])

  useEffect(() => {
    const check = () => {
      if (!notificationsSupported() || window.Notification.permission !== 'granted') return
      if (readUiPreference('remindersEnabled') !== 'on') return
      const day = localDate()
      if (!shouldNotify(latest.current, readUiPreference('remindersLastDay'), day)) return
      try {
        new window.Notification('JobIntel', { body: latest.current.lines.join(' · '), tag: 'jobintel-daily' })
        writeUiPreference('remindersLastDay', day)
      } catch {
        /* some browsers only allow notifications from a service worker; the in-app panel still shows it */
      }
    }
    const first = setTimeout(check, 3_000)
    const timer = setInterval(check, CHECK_EVERY_MS)
    return () => {
      clearTimeout(first)
      clearInterval(timer)
    }
  }, [])
  return null
}
