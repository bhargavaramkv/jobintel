import type { OutreachMessage } from '../../domain/outreach/messages'
import { outreachRepository } from '../../storage/outreachRepository'
import { createRecordContext } from '../shared/recordContext'

export const { Provider: OutreachProvider, useRecords: useOutreachRecords } = createRecordContext<OutreachMessage>('Outreach', outreachRepository)

/** Outreach drafts and sent-message log in this browser. */
export function useOutreach() {
  const { items, ...rest } = useOutreachRecords()
  return { messages: items, ...rest }
}
