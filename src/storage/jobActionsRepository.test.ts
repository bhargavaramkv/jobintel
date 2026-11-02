import { beforeEach, describe, expect, it } from 'vitest'
import { refOf, withApplied, withRejected } from '../domain/jobs/actions'
import { makeJob } from '../test/feedFixture'
import { completeProfile, freshDatabase } from '../test/helpers'
import { openDatabase, STORES } from './db'
import { jobActionsRepository } from './jobActionsRepository'
import { profileRepository } from './profileRepository'

beforeEach(freshDatabase)

const ref = refOf(makeJob({ sourceId: 'x1' }))
const now = new Date('2026-11-02T10:00:00Z')

describe('jobActionsRepository', () => {
  it('stores, updates and removes decisions', async () => {
    await jobActionsRepository.put(withApplied(ref, undefined, now))
    expect((await jobActionsRepository.getAll()).actions[0].decision).toBe('applied')
    await jobActionsRepository.put(withRejected(ref, undefined, ['company'], now))
    const { actions } = await jobActionsRepository.getAll()
    expect(actions).toHaveLength(1)
    expect(actions[0].rejectReasons).toEqual(['company'])
    await jobActionsRepository.remove(ref.jobId)
    expect((await jobActionsRepository.getAll()).actions).toEqual([])
  })

  it('skips corrupted rows instead of failing', async () => {
    await jobActionsRepository.put(withApplied(ref, undefined, now))
    const db = await openDatabase()
    const tx = db.transaction(STORES.jobActions, 'readwrite')
    tx.objectStore(STORES.jobActions).put({ jobId: 'bad', decision: 'maybe' })
    await new Promise((r) => (tx.oncomplete = r))
    expect(await jobActionsRepository.getAll()).toMatchObject({ skipped: 1 })
  })

  it('is cleared together with the profile', async () => {
    await profileRepository.save(completeProfile())
    await jobActionsRepository.put(withApplied(ref, undefined, now))
    await profileRepository.clearAll()
    expect((await jobActionsRepository.getAll()).actions).toEqual([])
  })
})
