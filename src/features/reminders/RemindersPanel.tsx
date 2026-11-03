import { Bell, BellOff } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { readUiPreference, writeUiPreference } from '../../storage/uiPreferences'
import { notificationsSupported, useReminderSummary } from './useReminders'

export function RemindersPanel({ now }: { now: Date }) {
  const summary = useReminderSummary(now)
  const [enabled, setEnabled] = useState(() => readUiPreference('remindersEnabled') === 'on')
  const [message, setMessage] = useState('')

  const toggle = async () => {
    if (enabled) {
      writeUiPreference('remindersEnabled', 'off')
      setEnabled(false)
      setMessage('Browser reminders are off.')
      return
    }
    if (!notificationsSupported()) return setMessage('This browser does not support notifications.')
    const permission = window.Notification.permission === 'default' ? await window.Notification.requestPermission() : window.Notification.permission
    if (permission !== 'granted') return setMessage('Notifications are blocked for this site. Allow them in your browser settings to use reminders.')
    writeUiPreference('remindersEnabled', 'on')
    setEnabled(true)
    setMessage('On. You’ll get at most one reminder a day while JobIntel is open.')
  }

  return (
    <section className="panel" aria-labelledby="reminders-title">
      <div className="panel__header">
        <h2 id="reminders-title" className="panel__title">
          Today
        </h2>
        <Bell size={16} className="muted" aria-hidden="true" />
      </div>
      <div className="panel__body stack">
        {summary.total === 0 ? (
          <p className="secondary">Nothing due today.</p>
        ) : (
          <ul className="reminders">
            {summary.lines.map((l) => (
              <li key={l}>{l}</li>
            ))}
          </ul>
        )}
        {summary.total > 0 && (
          <p className="field__hint">
            {summary.applicationFollowUps + summary.interviewsToday > 0 && <Link to="/applications">Open applications</Link>}
            {summary.applicationFollowUps + summary.interviewsToday > 0 && summary.outreachFollowUps > 0 && ' · '}
            {summary.outreachFollowUps > 0 && <Link to="/outreach">Open outreach</Link>}
          </p>
        )}
        <button type="button" className="btn btn--ghost btn--sm" onClick={() => void toggle()} aria-pressed={enabled}>
          {enabled ? <BellOff size={14} aria-hidden="true" /> : <Bell size={14} aria-hidden="true" />}
          {enabled ? 'Turn off browser reminders' : 'Turn on browser reminders'}
        </button>
        <p className="field__hint" role="status">
          {message || 'Reminders work only while JobIntel is open in a tab. Nothing is sent to a server.'}
        </p>
      </div>
    </section>
  )
}
