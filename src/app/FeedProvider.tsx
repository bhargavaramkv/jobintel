import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { JobFeed } from '../domain/jobs/feedSchema'
import { FeedContext, loadFeed, type FeedState } from './feed'

type Load = { attempt: number; feed: JobFeed | null; error: string | null; done: boolean }

/** Loads the job feed once and shares it with every screen. */
export function FeedProvider({ children, fetchImpl }: { children: ReactNode; fetchImpl?: typeof fetch }) {
  const [attempt, setAttempt] = useState(0)
  const [load, setLoad] = useState<Load>({ attempt: 0, feed: null, error: null, done: false })

  useEffect(() => {
    let cancelled = false
    loadFeed(fetchImpl).then(
      (feed) => !cancelled && setLoad({ attempt, feed, error: null, done: true }),
      (e: unknown) => !cancelled && setLoad({ attempt, feed: null, error: e instanceof Error ? e.message : 'The job feed could not be loaded.', done: true }),
    )
    return () => {
      cancelled = true
    }
  }, [attempt, fetchImpl])

  const retry = useCallback(() => setAttempt((n) => n + 1), [])
  const value = useMemo<FeedState>(() => {
    const current = load.done && load.attempt === attempt
    return {
      status: !current ? 'loading' : load.error ? 'error' : 'ready',
      feed: current ? load.feed : null,
      jobs: current && load.feed ? load.feed.jobs.filter((j) => j.status === 'open') : [],
      error: current ? load.error : null,
      retry,
    }
  }, [load, attempt, retry])

  return <FeedContext.Provider value={value}>{children}</FeedContext.Provider>
}
