import { outreachMessageSchema } from '../domain/outreach/messages'
import { STORES } from './db'
import { recordStore } from './recordStore'

/** The user's private outreach drafts and sent-message log. */
export const outreachRepository = recordStore(STORES.outreach, outreachMessageSchema)
