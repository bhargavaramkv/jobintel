import { useContactRecords } from './contactsContext'

/** Referral leads in this browser. */
export function useContacts() {
  const { items, ...rest } = useContactRecords()
  return { contacts: items, ...rest }
}
