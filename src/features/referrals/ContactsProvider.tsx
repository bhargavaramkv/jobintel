import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { Contact } from '../../domain/referrals/contacts'
import { contactsRepository } from '../../storage/contactsRepository'
import { useProfile } from '../profile/useProfile'
import { ContactsContext, type ContactsContextValue } from './useContacts'

export function ContactsProvider({ children }: { children: ReactNode }) {
  // Reload whenever local data is replaced wholesale (import / clear data).
  const { revision } = useProfile()
  const [status, setStatus] = useState<ContactsContextValue['status']>('loading')
  const [error, setError] = useState<string>()
  const [contacts, setContacts] = useState<ReadonlyMap<string, Contact>>(new Map())
  const store = useRef<Map<string, Contact>>(new Map())

  useEffect(() => {
    let cancelled = false
    contactsRepository
      .getAll()
      .then(({ rows }) => {
        if (cancelled) return
        store.current = new Map(rows.map((c) => [c.id, c]))
        setContacts(new Map(store.current))
        setStatus('ready')
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setError(err instanceof Error ? err.message : String(err))
        setStatus('error')
      })
    return () => {
      cancelled = true
    }
  }, [revision])

  const save = useCallback(async (c: Contact) => {
    const valid = await contactsRepository.put(c)
    store.current.set(valid.id, valid)
    setContacts(new Map(store.current))
  }, [])

  const remove = useCallback(async (id: string) => {
    await contactsRepository.remove(id)
    store.current.delete(id)
    setContacts(new Map(store.current))
  }, [])

  const replaceAll = useCallback(async (rows: Contact[]) => {
    await contactsRepository.replaceAll(rows)
    store.current = new Map(rows.map((c) => [c.id, c]))
    setContacts(new Map(store.current))
  }, [])

  const value = useMemo<ContactsContextValue>(
    () => ({ status, error, contacts, save, remove, replaceAll }),
    [status, error, contacts, save, remove, replaceAll],
  )
  return <ContactsContext.Provider value={value}>{children}</ContactsContext.Provider>
}
