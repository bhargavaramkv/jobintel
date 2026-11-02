import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { JobFeedContext, loadFeed, type FeedState, type JobFeedContextValue } from './jobFeed'

export function JobFeedProvider({ children, fetcher }: { children: ReactNode; fetcher?: typeof fetch }) {
  const [state, setState] = useState<FeedState>({ status: 'loading' })
  const [nonce, setNonce] = useState(0)

  useEffect(() => {
    let cancelled = false
    loadFeed(fetcher).then((s) => !cancelled && setState(s))
    return () => {
      cancelled = true
    }
  }, [fetcher, nonce])

  const reload = useCallback(() => {
    setState({ status: 'loading' })
    setNonce((n) => n + 1)
  }, [])

  const value = useMemo<JobFeedContextValue>(() => ({ state, reload }), [state, reload])
  return <JobFeedContext.Provider value={value}>{children}</JobFeedContext.Provider>
}
