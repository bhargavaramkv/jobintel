// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { CONTEXT_ID, storedBriefing, storedRec } from '../test/aiFixture'
import { completeProfile } from '../test/helpers'
import { BackupError, createBackup, decryptBackup, restoreFromText, type BackupEnvelope } from './backup'
import { SCHEMA_VERSION } from './constants'

const FAST = { iterations: 100_000 }
const PASS = 'correct horse battery'
const b64 = (u: Uint8Array) => btoa(String.fromCharCode(...u))

/** Encrypt an arbitrary payload the way the app does, to impersonate older or tampered backups. */
async function forge(payload: unknown): Promise<BackupEnvelope> {
  const subtle = globalThis.crypto.subtle
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const material = await subtle.importKey('raw', new TextEncoder().encode(PASS), 'PBKDF2', false, ['deriveKey'])
  const key = await subtle.deriveKey({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: 100_000 }, material, { name: 'AES-GCM', length: 256 }, false, ['encrypt'])
  const ct = new Uint8Array(await subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(JSON.stringify(payload))))
  const env = await createBackup(null, PASS, FAST)
  return { ...env, kdf: { ...env.kdf, salt: b64(salt) }, cipher: { ...env.cipher, iv: b64(iv) }, ciphertext: b64(ct) }
}

const expectCode = async (p: Promise<unknown>, code: BackupError['code']) => {
  const e = await p.then(() => null, (x: unknown) => x)
  expect(e).toBeInstanceOf(BackupError)
  expect((e as BackupError).code).toBe(code)
}

describe('backup with AI recommendations (data schema 5)', () => {
  it('is data schema 5', () => {
    expect(SCHEMA_VERSION).toBe(5)
  })

  it('round-trips recommendations, briefings and the export log, including their review state', async () => {
    const accepted = storedRec({ status: 'accepted', reviewedAt: '2026-11-03T09:00:00.000Z', decidedAt: '2026-11-03T09:05:00.000Z', outcome: 'Shortlisted Backend Engineer at Acme.' })
    const rejected = storedRec({ id: `${CONTEXT_ID}:other`, status: 'rejected', decidedAt: '2026-11-03T09:06:00.000Z' })
    const briefing = storedBriefing()
    const exportRecord = {
      id: CONTEXT_ID,
      createdAt: '2026-11-03T08:00:00.000Z',
      includes: { profile: true, identity: false, compensation: false, pipeline: true, applications: true, notes: false, referrals: true, referralNames: false, topMatches: 10 },
      counts: { pipelineJobs: 1, topMatches: 5, applications: 2, referrals: 1 },
      bytes: 9_000,
    }
    const env = await createBackup(completeProfile(), PASS, { ...FAST, aiRecommendations: [accepted, rejected], aiBriefings: [briefing], aiExports: [exportRecord] })
    const restored = await restoreFromText(JSON.stringify(env), PASS)
    expect(restored.aiRecommendations).toEqual([accepted, rejected])
    expect(restored.aiBriefings).toEqual([briefing])
    expect(restored.aiExports).toEqual([exportRecord])
  })

  it('keeps AI content encrypted: no recommendation text appears in the file', async () => {
    const env = await createBackup(null, PASS, { ...FAST, aiRecommendations: [storedRec({ title: 'DISTINCTIVE-TITLE-XYZ' })] })
    expect(JSON.stringify(env)).not.toContain('DISTINCTIVE-TITLE-XYZ')
  })

  it('restores a backup made before the AI feature (schema 4, no AI fields) with an empty inbox', async () => {
    const legacy = await forge({ schemaVersion: 4, exportedAt: '2026-11-02T00:00:00.000Z', profile: completeProfile(), jobActions: [], contacts: [], messages: [] })
    const restored = await decryptBackup(legacy, PASS)
    expect(restored.profile).toEqual(completeProfile())
    expect(restored.aiRecommendations).toEqual([])
    expect(restored.aiBriefings).toEqual([])
    expect(restored.aiExports).toEqual([])
  })

  it.each([1, 2, 3])('restores a schema %i backup too', async (v) => {
    const legacy = await forge({ schemaVersion: v, exportedAt: 'x', profile: completeProfile() })
    const restored = await decryptBackup(legacy, PASS)
    expect(restored.aiRecommendations).toEqual([])
    expect(restored.jobActions).toEqual([])
  })

  it('rejects a backup whose AI records are tampered or malformed, without partial restore', async () => {
    const bad = { ...storedRec(), confidence: 3 }
    await expectCode(decryptBackup(await forge({ schemaVersion: 5, exportedAt: 'x', profile: null, aiRecommendations: [bad] }), PASS), 'invalid-contents')
    const unknownStatus = { ...storedRec(), status: 'applied' }
    await expectCode(decryptBackup(await forge({ schemaVersion: 5, exportedAt: 'x', profile: null, aiRecommendations: [unknownStatus] }), PASS), 'invalid-contents')
    const injected = { ...storedRec(), action: { type: 'send-message' } }
    await expectCode(decryptBackup(await forge({ schemaVersion: 5, exportedAt: 'x', profile: null, aiRecommendations: [injected] }), PASS), 'invalid-contents')
  })

  it('rejects an unknown extra top-level field instead of ignoring it', async () => {
    await expectCode(decryptBackup(await forge({ schemaVersion: 5, exportedAt: 'x', profile: null, aiSecrets: [] }), PASS), 'invalid-contents')
  })

  it('still refuses a backup from a newer data schema', async () => {
    await expectCode(decryptBackup(await forge({ schemaVersion: 6, exportedAt: 'x', profile: null }), PASS), 'unsupported-version')
  })
})
