import { useMemo } from 'react'
import { useApp } from '../../app/appContext'
import { useJobFeed } from '../../app/feed'
import { targetLevels } from '../../domain/jobs/feedback'
import { matchJob } from '../../domain/match/score'
import type { ScoredJob } from './search'

/** Every open job in the feed, scored against the saved profile. Scores are null until a profile has data to compare. */
export function useScoredJobs(): ScoredJob[] {
  const { jobs } = useJobFeed()
  const { profile } = useApp()
  return useMemo(() => {
    const targets = profile ? targetLevels(profile.targetSeniority) : []
    return jobs.map((job) => ({ job, match: matchJob(job, profile, targets) }))
  }, [jobs, profile])
}

/** The minimum score to apply by default: the saved preference, or none while no job can be scored. */
export const effectiveMinScore = (items: readonly ScoredJob[], preferred: number) =>
  items.some((i) => i.match.score !== null) ? preferred : 0
