// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { completeProfile } from '../test/helpers'
import {
  BACKUP_FORMAT_VERSION,
  BackupError,
  createBackup,
  decryptBackup,
  parseBackupFile,
  restoreFromText,
} from './backup'

// Lower iteration count keeps tests fast; production default is 600k.
const FAST = { iterations: 100_000 }
const PASS = 'correct horse battery'

async function expectCode(p: Promise<unknown>, code: BackupError['code']) {
  const err = await p.then(
    () => null,
    (e: unknown) => e,
  )
  expect(err).toBeInstanceOf(BackupError)
  expect((err as BackupError).code).toBe(code)
}

describe('encrypted backup', () => {
  it('round-trips a profile', async () => {
    const profile = completeProfile()
    const env = await createBackup(profile, PASS, FAST)
    const text = JSON.stringify(env)
    const restored = await restoreFromText(text, PASS)
    expect(restored.profile).toEqual(profile)
  })

  it('does not contain plaintext profile data', async () => {
    const profile = completeProfile()
    const text = JSON.stringify(await createBackup(profile, PASS, FAST))
    expect(text).not.toContain(profile.currentTitle!)
    expect(text).not.toContain('Backend Engineer')
  })

  it('uses a fresh salt and IV each time', async () => {
    const a = await createBackup(null, PASS, FAST)
    const b = await createBackup(null, PASS, FAST)
    expect(a.kdf.salt).not.toBe(b.kdf.salt)
    expect(a.cipher.iv).not.toBe(b.cipher.iv)
  })

  it('records format and KDF parameters', async () => {
    const env = await createBackup(null, PASS, FAST)
    expect(env.formatVersion).toBe(BACKUP_FORMAT_VERSION)
    expect(env.kdf).toMatchObject({ name: 'PBKDF2', hash: 'SHA-256', iterations: 100_000 })
    expect(env.cipher).toMatchObject({ name: 'AES-GCM', keyLength: 256 })
  })

  it('rejects an incorrect passphrase', async () => {
    const env = await createBackup(completeProfile(), PASS, FAST)
    await expectCode(decryptBackup(env, 'wrong passphrase!'), 'wrong-passphrase')
  })

  it('detects tampered ciphertext', async () => {
    const env = await createBackup(completeProfile(), PASS, FAST)
    const bytes = Uint8Array.from(atob(env.ciphertext), (c) => c.charCodeAt(0))
    bytes[0] ^= 0xff
    const tampered = { ...env, ciphertext: btoa(String.fromCharCode(...bytes)) }
    await expectCode(decryptBackup(tampered, PASS), 'wrong-passphrase')
  })

  it('rejects weak passphrases on export', async () => {
    await expectCode(createBackup(null, 'short'), 'weak-passphrase')
  })

  it.each([
    ['not json', 'nope'],
    ['wrong shape', JSON.stringify({ hello: 'world' })],
    ['missing ciphertext', JSON.stringify({ format: 'jobintel-backup', formatVersion: 1 })],
  ])('rejects malformed files: %s', (_, text) => {
    expect(() => parseBackupFile(text)).toThrow(BackupError)
    try {
      parseBackupFile(text)
    } catch (e) {
      expect((e as BackupError).code).toBe('malformed')
    }
  })

  it('rejects out-of-range KDF iterations', async () => {
    const env = await createBackup(null, PASS, FAST)
    const text = JSON.stringify({ ...env, kdf: { ...env.kdf, iterations: 1_000_000_000 } })
    expect(() => parseBackupFile(text)).toThrow(/unsupported key-derivation/)
  })

  it('rejects an unsupported format version', async () => {
    const env = await createBackup(null, PASS, FAST)
    const text = JSON.stringify({ ...env, formatVersion: 99 })
    try {
      parseBackupFile(text)
      expect.unreachable()
    } catch (e) {
      expect((e as BackupError).code).toBe('unsupported-version')
    }
  })

  it('rejects a backup from a newer data schema', async () => {
    // Build an envelope whose encrypted payload claims a future schema.
    const subtle = globalThis.crypto.subtle
    const salt = crypto.getRandomValues(new Uint8Array(16))
    const iv = crypto.getRandomValues(new Uint8Array(12))
    const material = await subtle.importKey('raw', new TextEncoder().encode(PASS), 'PBKDF2', false, ['deriveKey'])
    const key = await subtle.deriveKey(
      { name: 'PBKDF2', hash: 'SHA-256', salt, iterations: 100_000 },
      material,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt'],
    )
    const payload = new TextEncoder().encode(JSON.stringify({ schemaVersion: 999, exportedAt: 'x', profile: null }))
    const ct = new Uint8Array(await subtle.encrypt({ name: 'AES-GCM', iv }, key, payload))
    const b64 = (u: Uint8Array) => btoa(String.fromCharCode(...u))
    const env = await createBackup(null, PASS, FAST)
    const forged = { ...env, kdf: { ...env.kdf, salt: b64(salt) }, cipher: { ...env.cipher, iv: b64(iv) }, ciphertext: b64(ct) }
    await expectCode(decryptBackup(forged, PASS), 'unsupported-version')
  })
})
