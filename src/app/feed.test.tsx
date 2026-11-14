import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import { testFeed } from '../test/appFixture'
import { mockFetchFeed } from '../test/feedFixture'
import { FeedProvider } from './FeedProvider'
import { loadFeed, useJobFeed } from './feed'

const json = (body: unknown) => (async () => new Response(JSON.stringify(body), { status: 200 })) as typeof fetch

describe('loadFeed', () => {
  it('parses a valid feed', async () => {
    const feed = await loadFeed(mockFetchFeed(testFeed()))
    expect(feed.jobs).toHaveLength(4)
  })

  it('requests the feed under the app base path', async () => {
    let url = ''
    await loadFeed((async (u: string) => {
      url = u
      return new Response(JSON.stringify(testFeed()))
    }) as unknown as typeof fetch)
    expect(url).toBe(`${import.meta.env.BASE_URL}data/jobs.json`)
  })

  it('rejects a feed that does not match the schema', async () => {
    await expect(loadFeed(json({ formatVersion: 99, jobs: [] }))).rejects.toThrow(/expected format/)
  })

  it('rejects a job with a missing field', async () => {
    const feed = testFeed()
    const broken = { ...feed, jobs: [{ ...feed.jobs[0], company: undefined }] }
    await expect(loadFeed(json(broken))).rejects.toThrow(/expected format/)
  })

  it('rejects an HTTP error and text that is not JSON', async () => {
    await expect(loadFeed(mockFetchFeed(null))).rejects.toThrow(/HTTP 404/)
    await expect(loadFeed((async () => new Response('<html>', { status: 200 })) as typeof fetch)).rejects.toThrow(/not valid JSON/)
  })
})

describe('FeedProvider', () => {
  const wrapper = (fetchImpl: typeof fetch) =>
    function Wrapper({ children }: { children: ReactNode }) {
      return <FeedProvider fetchImpl={fetchImpl}>{children}</FeedProvider>
    }

  it('goes from loading to ready with open jobs only', async () => {
    const { result } = renderHook(() => useJobFeed(), { wrapper: wrapper(mockFetchFeed(testFeed())) })
    expect(result.current.status).toBe('loading')
    await waitFor(() => expect(result.current.status).toBe('ready'))
    expect(result.current.jobs).toHaveLength(3)
    expect(result.current.jobs.every((j) => j.status === 'open')).toBe(true)
  })

  it('reports an error for an invalid feed', async () => {
    const { result } = renderHook(() => useJobFeed(), { wrapper: wrapper(json({ nope: true })) })
    await waitFor(() => expect(result.current.status).toBe('error'))
    expect(result.current.error).toMatch(/expected format/)
    expect(result.current.jobs).toEqual([])
  })
})
