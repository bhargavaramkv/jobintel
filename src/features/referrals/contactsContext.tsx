import type { Contact } from '../../domain/referrals/contacts'
import { contactsRepository } from '../../storage/contactsRepository'
import { createRecordContext } from '../shared/recordContext'

export const { Provider: ContactsProvider, useRecords: useContactRecords } = createRecordContext<Contact>('Contacts', contactsRepository)
