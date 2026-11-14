import { createContext, useContext } from 'react'
import { feedSchema, type Job, type JobFeed } from '../domain/jobs/feedSchema'

export type FeedStatus = 'loading' | 'ready' | 'error'

export interface FeedState {
  status: FeedStatus
  feed: JobFeed | null
  /** Open jobs only. */
  jobs: Job[]
  error: string | null
  retry: () => void
}

export const FEED_URL = () => `${import.meta.env.BASE_URL}data/jobs.json`

/** Fetches and validates the public job feed. Throws an Error with a readable message on any failure. */
export async function loadFeed(fetchImpl: typeof fetch = (...a) => fetch(...a)): Promise<JobFeed> {
  const res = await fetchImpl(FEED_URL())
  if (!res.ok) throw new Error(`The job feed could not be downloaded (HTTP ${res.status}).`)
  let json: unknown
  try {
    json = await res.json()
  } catch {
    throw new Error('The job feed is not valid JSON.')
  }
  const parsed = feedSchema.safeParse(json)
  if (!parsed.success) throw new Error('The job feed does not have the expected format.')
  return parsed.data
}

export const FeedContext = createContext<FeedState | null>(null)

export function useJobFeed(): FeedState {
  const ctx = useContext(FeedContext)
  if (!ctx) throw new Error('useJobFeed must be used inside FeedProvider')
  return ctx
}
