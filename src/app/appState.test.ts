import { describe, expect, it } from 'vitest'
import { backendProfile } from '../test/appFixture'
import { makeJob } from '../test/feedFixture'
import { DEFAULT_MIN_SCORE, emptyState, loadState, trackedFromJob } from './appState'
import { STORAGE_KEY, writeStored } from './storage-local'

describe('loadState', () => {
  it('is empty on a first visit', () => {
    expect(loadState()).toEqual(emptyState())
    expect(emptyState().profile).toBeNull()
    expect(emptyState().prefs.minScore).toBe(DEFAULT_MIN_SCORE)
  })

  it('round-trips a saved profile and tracked job', () => {
    const tracked = trackedFromJob(makeJob({ sourceId: 'x' }), new Date('2026-11-14T00:00:00Z'))
    writeStored({ ...emptyState(), profile: backendProfile(), tracked: [tracked], prefs: { minScore: 70 } })
    const s = loadState()
    expect(s.profile?.currentTitle).toBe('Software Engineer')
    expect(s.tracked).toEqual([tracked])
    expect(s.tracked[0].status).toBe('saved')
    expect(s.prefs.minScore).toBe(70)
  })

  it('drops an invalid part and keeps the rest', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ profile: { id: 'nope' }, resume: null, tracked: [{ jobId: 'a' }, trackedFromJob(makeJob({ sourceId: 'y' }))], prefs: { minScore: 500 } }),
    )
    const s = loadState()
    expect(s.profile).toBeNull()
    expect(s.tracked).toHaveLength(1)
    expect(s.prefs.minScore).toBe(DEFAULT_MIN_SCORE)
  })

  it('ignores a stored value that is not an object', () => {
    localStorage.setItem(STORAGE_KEY, '42')
    expect(loadState()).toEqual(emptyState())
  })
})
