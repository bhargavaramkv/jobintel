import { z } from 'zod'
import { CHANNELS, type Channel } from './drafts'

/** Message history (Phase 5). JobIntel never sends anything; "sent" means the user says they sent it. */
const CHANNEL_IDS = CHANNELS.map((c) => c.id) as [Channel, ...Channel[]]
const isoDay = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)

export const MESSAGE_MAX = 5000

export const outreachMessageSchema = z
  .object({
    id: z.string().min(1),
    contactId: z.string().min(1),
    /** Job this message is about, if any (a feed id or a manual application id). */
    jobId: z.string().optional(),
    channel: z.enum(CHANNEL_IDS),
    kind: z.enum(['initial', 'follow-up']),
    subject: z.string().max(300).optional(),
    body: z.string().min(1).max(MESSAGE_MAX),
    status: z.enum(['draft', 'sent']),
    sentOn: isoDay.optional(),
    /** The person replied (recorded by the user). */
    repliedOn: isoDay.optional(),
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .strict()
  .refine((m) => m.status !== 'sent' || !!m.sentOn, { message: 'A sent message needs a date', path: ['sentOn'] })

export type OutreachMessage = z.infer<typeof outreachMessageSchema>

/** Sent dates (oldest first) and whether any message got a reply, for one person. */
export function threadOf(messages: Iterable<OutreachMessage>, contactId: string) {
  const mine = [...messages].filter((m) => m.contactId === contactId)
  const sent = mine
    .filter((m) => m.status === 'sent' && m.sentOn)
    .map((m) => m.sentOn!)
    .sort()
  const replied = mine.some((m) => !!m.repliedOn)
  return { messages: mine.sort((a, b) => (a.sentOn ?? a.createdAt).localeCompare(b.sentOn ?? b.createdAt)), sent, replied }
}

export function newMessageId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `m-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}
