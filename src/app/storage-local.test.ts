import { afterEach, describe, expect, it, vi } from 'vitest'
import { readStored, STORAGE_KEY, writeStored } from './storage-local'

afterEach(() => vi.restoreAllMocks())

describe('localStorage wrapper', () => {
  it('writes and reads back JSON under the single app key', () => {
    expect(writeStored({ a: 1 })).toBe(true)
    expect(localStorage.getItem(STORAGE_KEY)).toBe('{"a":1}')
    expect(readStored()).toEqual({ a: 1 })
  })

  it('returns null when nothing is stored or the stored text is not JSON', () => {
    expect(readStored()).toBeNull()
    localStorage.setItem(STORAGE_KEY, '{not json')
    expect(readStored()).toBeNull()
  })

  it('does not throw when reading or writing throws (blocked or full storage)', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('full', 'QuotaExceededError')
    })
    expect(readStored()).toBeNull()
    expect(writeStored({ a: 1 })).toBe(false)
  })

  it('does not throw when window.localStorage itself throws', () => {
    vi.spyOn(window, 'localStorage', 'get').mockImplementation(() => {
      throw new DOMException('denied', 'SecurityError')
    })
    expect(readStored()).toBeNull()
    expect(writeStored({ a: 1 })).toBe(false)
  })
})
