import { FEED_FORMAT_VERSION, type Job, type JobFeed } from '../domain/jobs/feedSchema'

/** Synthetic feed for UI tests. Companies and URLs are placeholders, not real postings. */
export function makeJob(overrides: Partial<Job> & Pick<Job, 'sourceId'>): Job {
  const id = `greenhouse:acme:${overrides.sourceId}`
  return {
    id,
    sourceKey: 'greenhouse:acme',
    ats: 'greenhouse',
    company: 'Acme Corp',
    title: 'Software Engineer',
    locations: ['Bengaluru, India'],
    cities: ['Bengaluru'],
    remoteIndia: false,
    workMode: 'unknown',
    description: 'Build things.',
    requirements: ['3+ years C#'],
    url: `https://example.com/jobs/${overrides.sourceId}`,
    postedAt: '2026-10-30T00:00:00.000Z',
    firstSeenAt: '2026-11-01T00:00:00.000Z',
    lastVerifiedAt: '2026-11-02T00:00:00.000Z',
    status: 'open',
    ...overrides,
  }
}

export function makeFeed(jobs: Job[], generatedAt = '2026-11-02T00:00:00.000Z'): JobFeed {
  return {
    formatVersion: FEED_FORMAT_VERSION,
    generatedAt,
    lastSuccessfulScanAt: generatedAt,
    jobs,
    sources: [
      {
        key: 'greenhouse:acme',
        company: 'Acme Corp',
        ats: 'greenhouse',
        board: 'acme',
        status: 'ok',
        totalListed: 10,
        kept: jobs.length,
        lastAttemptAt: generatedAt,
        lastSuccessAt: generatedAt,
        durationMs: 100,
      },
    ],
  }
}

export function mockFetchFeed(feed: JobFeed | null): typeof fetch {
  return (async () =>
    feed
      ? new Response(JSON.stringify(feed), { status: 200, headers: { 'content-type': 'application/json' } })
      : new Response('not found', { status: 404 })) as typeof fetch
}
