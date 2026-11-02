import { createContext, useContext } from 'react'
import { feedSchema, type JobFeed } from '../../domain/jobs/feedSchema.ts'

export type FeedState =
  | { status: 'loading' }
  | { status: 'empty' }
  | { status: 'ready'; feed: JobFeed }
  | { status: 'error'; message: string }

export interface JobFeedContextValue {
  state: FeedState
  reload: () => void
}

export const JobFeedContext = createContext<JobFeedContextValue | null>(null)

export function useJobFeed(): JobFeedContextValue {
  const ctx = useContext(JobFeedContext)
  if (!ctx) throw new Error('useJobFeed must be used inside <JobFeedProvider>')
  return ctx
}

/** URL of the public feed, served from the same GitHub Pages origin as the app. */
export function feedUrl(): string {
  return `${import.meta.env.BASE_URL}data/jobs.json`
}

/**
 * Plain GET of a static public file. No query parameters, headers or body carry any
 * profile data, so fetching the feed reveals nothing about the user.
 */
export async function loadFeed(fetcher: typeof fetch = fetch): Promise<FeedState> {
  let res: Response
  try {
    res = await fetcher(feedUrl(), { cache: 'no-cache' })
  } catch {
    return { status: 'error', message: 'Could not reach the job feed. Check your connection and try again.' }
  }
  if (res.status === 404) return { status: 'empty' }
  if (!res.ok) return { status: 'error', message: `The job feed could not be loaded (HTTP ${res.status}).` }
  let json: unknown
  try {
    json = await res.json()
  } catch {
    return { status: 'error', message: 'The job feed is not valid JSON.' }
  }
  const parsed = feedSchema.safeParse(json)
  if (!parsed.success) return { status: 'error', message: 'The job feed has an unexpected format. It may be from a newer version.' }
  return parsed.data.jobs.length || parsed.data.sources.length ? { status: 'ready', feed: parsed.data } : { status: 'empty' }
}
