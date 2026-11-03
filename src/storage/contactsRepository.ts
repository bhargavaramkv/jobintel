import { contactSchema } from '../domain/referrals/contacts'
import { STORES } from './db'
import { recordStore } from './recordStore'

/** The user's private referral leads. */
export const contactsRepository = recordStore(STORES.contacts, contactSchema)
