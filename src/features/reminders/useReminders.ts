import { useMemo } from 'react'
import { localDate } from '../../domain/jobs/actions'
import { reminderSummary } from '../../domain/reminders/reminders'
import { useJobActions } from '../jobs/useJobActions'
import { useOutreach } from '../outreach/outreachContext'
import { useContacts } from '../referrals/useContacts'

export function useReminderSummary(now: Date) {
  const { actions } = useJobActions()
  const { contacts } = useContacts()
  const { messages } = useOutreach()
  const day = localDate(now)
  return useMemo(() => reminderSummary(actions.values(), contacts.values(), messages.values(), day), [actions, contacts, messages, day])
}

export const notificationsSupported = () => typeof window !== 'undefined' && 'Notification' in window
