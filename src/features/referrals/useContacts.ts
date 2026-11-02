import { createContext, useContext } from 'react'
import type { Contact } from '../../domain/referrals/contacts'

export interface ContactsContextValue {
  status: 'loading' | 'ready' | 'error'
  error?: string
  /** id -> lead */
  contacts: ReadonlyMap<string, Contact>
  save: (contact: Contact) => Promise<void>
  remove: (id: string) => Promise<void>
  replaceAll: (contacts: Contact[]) => Promise<void>
}

export const ContactsContext = createContext<ContactsContextValue | null>(null)

export function useContacts(): ContactsContextValue {
  const ctx = useContext(ContactsContext)
  if (!ctx) throw new Error('useContacts must be used inside <ContactsProvider>')
  return ctx
}
