import { z } from 'zod'
import { jobActionSchema, type JobAction } from '../domain/jobs/actions'
import { contactSchema, type Contact } from '../domain/referrals/contacts'
import { outreachMessageSchema, type OutreachMessage } from '../domain/outreach/messages'
import { candidateProfileSchema, type CandidateProfile } from '../domain/profile/schema'
import { SCHEMA_VERSION } from './constants'

/**
 * Encrypted local backup.
 *
 * Format v1:
 *   key   = PBKDF2-HMAC-SHA-256(passphrase, salt[16], iterations) -> AES-256-GCM key
 *   blob  = AES-GCM(key, iv[12], JSON(payload))   (128-bit auth tag appended by Web Crypto)
 *
 * Only standard Web Crypto primitives are used; nothing here is custom cryptography.
 */
export const BACKUP_FORMAT = 'jobintel-backup' as const
export const BACKUP_FORMAT_VERSION = 1
export const DEFAULT_ITERATIONS = 600_000
/** Bounds accepted on import; guards against tampered files that would hang the tab. */
const MIN_ITERATIONS = 100_000
const MAX_ITERATIONS = 5_000_000
export const MIN_PASSPHRASE_LENGTH = 10
const SALT_BYTES = 16
const IV_BYTES = 12

const envelopeSchema = z
  .object({
    format: z.literal(BACKUP_FORMAT),
    formatVersion: z.number().int(),
    createdAt: z.string(),
    kdf: z.object({
      name: z.literal('PBKDF2'),
      hash: z.literal('SHA-256'),
      iterations: z.number().int(),
      salt: z.string().min(1),
    }),
    cipher: z.object({
      name: z.literal('AES-GCM'),
      keyLength: z.literal(256),
      iv: z.string().min(1),
    }),
    ciphertext: z.string().min(1),
  })
  .strict()

export type BackupEnvelope = z.infer<typeof envelopeSchema>

const payloadSchema = z
  .object({
    schemaVersion: z.number().int(),
    exportedAt: z.string(),
    profile: candidateProfileSchema.nullable(),
    /** Added in data schema 2. Older backups have none. */
    jobActions: z.array(jobActionSchema).default([]),
    /** Added in data schema 3 (referral leads). */
    contacts: z.array(contactSchema).default([]),
    /** Added in data schema 4 (outreach history). */
    messages: z.array(outreachMessageSchema).default([]),
  })
  .strict()

export type BackupPayload = z.infer<typeof payloadSchema>

export type BackupErrorCode =
  | 'malformed'
  | 'unsupported-version'
  | 'wrong-passphrase'
  | 'invalid-contents'
  | 'weak-passphrase'

export class BackupError extends Error {
  readonly code: BackupErrorCode
  constructor(code: BackupErrorCode, message: string) {
    super(message)
    this.name = 'BackupError'
    this.code = code
  }
}

function getCrypto(): Crypto {
  const c = globalThis.crypto
  if (!c?.subtle) throw new Error('Web Crypto is unavailable. Use a modern browser over HTTPS.')
  return c
}

function toBase64(bytes: Uint8Array): string {
  let s = ''
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i])
  return btoa(s)
}

function fromBase64(b64: string): Uint8Array<ArrayBuffer> {
  let bin: string
  try {
    bin = atob(b64)
  } catch {
    throw new BackupError('malformed', 'The backup file is damaged (invalid encoding).')
  }
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

async function deriveKey(passphrase: string, salt: Uint8Array<ArrayBuffer>, iterations: number) {
  const subtle = getCrypto().subtle
  const material = await subtle.importKey(
    'raw',
    new TextEncoder().encode(passphrase),
    'PBKDF2',
    false,
    ['deriveKey'],
  )
  return subtle.deriveKey(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  )
}

export function checkPassphrase(passphrase: string): string | null {
  if (passphrase.length < MIN_PASSPHRASE_LENGTH) {
    return `Use at least ${MIN_PASSPHRASE_LENGTH} characters`
  }
  return null
}

export async function createBackup(
  profile: CandidateProfile | null,
  passphrase: string,
  options: { iterations?: number; now?: Date; jobActions?: JobAction[]; contacts?: Contact[]; messages?: OutreachMessage[] } = {},
): Promise<BackupEnvelope> {
  const weak = checkPassphrase(passphrase)
  if (weak) throw new BackupError('weak-passphrase', weak)
  const iterations = options.iterations ?? DEFAULT_ITERATIONS
  const now = (options.now ?? new Date()).toISOString()
  const c = getCrypto()
  const salt = c.getRandomValues(new Uint8Array(SALT_BYTES))
  const iv = c.getRandomValues(new Uint8Array(IV_BYTES))
  const key = await deriveKey(passphrase, salt, iterations)
  const payload: BackupPayload = {
    schemaVersion: SCHEMA_VERSION,
    exportedAt: now,
    profile,
    jobActions: options.jobActions ?? [],
    contacts: options.contacts ?? [],
    messages: options.messages ?? [],
  }
  const ciphertext = new Uint8Array(
    await c.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      new TextEncoder().encode(JSON.stringify(payload)),
    ),
  )
  return {
    format: BACKUP_FORMAT,
    formatVersion: BACKUP_FORMAT_VERSION,
    createdAt: now,
    kdf: { name: 'PBKDF2', hash: 'SHA-256', iterations, salt: toBase64(salt) },
    cipher: { name: 'AES-GCM', keyLength: 256, iv: toBase64(iv) },
    ciphertext: toBase64(ciphertext),
  }
}

/** Parse and structurally validate a backup file's text without decrypting it. */
export function parseBackupFile(text: string): BackupEnvelope {
  let json: unknown
  try {
    json = JSON.parse(text)
  } catch {
    throw new BackupError('malformed', 'This file is not a JobIntel backup (not valid JSON).')
  }
  if (typeof json === 'object' && json !== null && (json as { format?: unknown }).format === BACKUP_FORMAT) {
    const v = (json as { formatVersion?: unknown }).formatVersion
    if (typeof v === 'number' && v !== BACKUP_FORMAT_VERSION) {
      throw new BackupError(
        'unsupported-version',
        `This backup uses format version ${v}, but this app supports version ${BACKUP_FORMAT_VERSION}.`,
      )
    }
  }
  const parsed = envelopeSchema.safeParse(json)
  if (!parsed.success) {
    throw new BackupError('malformed', 'This file is not a valid JobIntel backup.')
  }
  const { iterations } = parsed.data.kdf
  if (iterations < MIN_ITERATIONS || iterations > MAX_ITERATIONS) {
    throw new BackupError('malformed', 'This backup has unsupported key-derivation settings.')
  }
  return parsed.data
}

/** Decrypt and validate. Throws BackupError; never touches local storage. */
export async function decryptBackup(envelope: BackupEnvelope, passphrase: string): Promise<BackupPayload> {
  const salt = fromBase64(envelope.kdf.salt)
  const iv = fromBase64(envelope.cipher.iv)
  const data = fromBase64(envelope.ciphertext)
  if (salt.length !== SALT_BYTES || iv.length !== IV_BYTES) {
    throw new BackupError('malformed', 'The backup file is damaged (bad salt or IV).')
  }
  const key = await deriveKey(passphrase, salt, envelope.kdf.iterations)
  let plaintext: ArrayBuffer
  try {
    plaintext = await getCrypto().subtle.decrypt({ name: 'AES-GCM', iv }, key, data)
  } catch {
    throw new BackupError(
      'wrong-passphrase',
      'Could not decrypt the backup. The passphrase is incorrect or the file was modified.',
    )
  }
  let json: unknown
  try {
    json = JSON.parse(new TextDecoder().decode(plaintext))
  } catch {
    throw new BackupError('invalid-contents', 'The decrypted backup contents are unreadable.')
  }
  const version = (json as { schemaVersion?: unknown })?.schemaVersion
  if (typeof version === 'number' && version > SCHEMA_VERSION) {
    throw new BackupError(
      'unsupported-version',
      `This backup was made by a newer JobIntel (data schema ${version}). Update the app and try again.`,
    )
  }
  const parsed = payloadSchema.safeParse(json)
  if (!parsed.success) {
    throw new BackupError('invalid-contents', 'The backup decrypted but its profile data is invalid.')
  }
  return parsed.data
}

export async function restoreFromText(text: string, passphrase: string): Promise<BackupPayload> {
  return decryptBackup(parseBackupFile(text), passphrase)
}

export function backupFileName(now: Date = new Date()): string {
  return `jobintel-backup-${now.toISOString().slice(0, 10)}.jibak.json`
}
