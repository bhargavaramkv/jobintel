import { useMemo } from 'react'
import type { Job } from '../../domain/jobs/feedSchema'
import { useJobFeed } from '../jobs/jobFeed'
import { useJobActions } from '../jobs/useJobActions'

/** Resolve a job id to a feed job or to the snapshot the user's own record kept. */
export function useJobLookup() {
  const { state } = useJobFeed()
  const { actions } = useJobActions()
  const jobs = useMemo<ReadonlyMap<string, Job>>(
    () => new Map(state.status === 'ready' ? state.feed.jobs.map((j) => [j.id, j]) : []),
    [state],
  )
  const labelOf = useMemo(
    () => (jobId: string | undefined): string | null => {
      if (!jobId) return null
      const job = jobs.get(jobId)
      if (job) return `${job.title} · ${job.company}`
      const snap = actions.get(jobId)?.snapshot
      return snap ? `${snap.title} · ${snap.company}` : null
    },
    [jobs, actions],
  )
  return { jobs, actions, labelOf }
}
