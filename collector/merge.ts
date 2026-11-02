import type { City, Job, JobFeed, SourceHealth } from '../src/domain/jobs/feedSchema.ts'
import { FEED_FORMAT_VERSION } from '../src/domain/jobs/feedSchema.ts'
import type { RawJob, SourceConfig } from './adapters.ts'
import { classifyLocations, normalizeWorkMode } from './location.ts'
import { truncate } from './text.ts'

export const sourceKey = (s: SourceConfig) => `${s.ats}:${s.board}`

export interface SourceResult {
  source: SourceConfig
  ok: boolean
  raw: RawJob[]
  error?: string
  durationMs: number
}

export interface MergeOptions {
  now: Date
  keepTitle: (title: string) => boolean
  /** Keep only jobs located in at least one of these cities. Empty = any city in India. */
  cities: readonly City[]
  maxDescriptionChars: number
  closedRetentionDays: number
}

/** Turn a raw posting into a feed job, or null if it is outside the configured cities or not an engineering role. */
export function toJob(source: SourceConfig, raw: RawJob, opts: MergeOptions): Omit<Job, 'firstSeenAt' | 'lastVerifiedAt' | 'status'> | null {
  if (!opts.keepTitle(raw.title)) return null
  const loc = classifyLocations(raw.locations)
  if (!loc.inIndia) return null
  // City scope: a remote-India listing with no named city is outside a city-scoped feed.
  if (opts.cities.length && !loc.cities.some((c) => opts.cities.includes(c))) return null
  const key = sourceKey(source)
  return {
    id: `${key}:${raw.sourceId}`,
    sourceKey: key,
    ats: source.ats,
    sourceId: raw.sourceId,
    company: source.company,
    title: raw.title.replace(/\s+/g, ' ').trim(),
    locations: raw.locations,
    cities: loc.cities,
    remoteIndia: loc.remoteIndia,
    workMode: normalizeWorkMode(raw.workModeRaw, raw.locations, raw.isRemote),
    department: raw.department,
    employmentType: raw.employmentType,
    description: truncate(raw.descriptionText, opts.maxDescriptionChars),
    requirements: raw.requirements,
    url: raw.url,
    postedAt: raw.postedAt,
  }
}

/** Secondary duplicate key for the same role listed twice (e.g. two boards, or re-posted with a new id). */
export function dedupeKey(j: Pick<Job, 'company' | 'title' | 'cities' | 'locations'>): string {
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
  const where = j.cities.length ? j.cities.join('|') : j.locations.map(norm).sort().join('|')
  return `${norm(j.company)}::${norm(j.title)}::${where}`
}

/**
 * Merge this scan's results into the previous feed.
 * - Jobs from sources that FAILED this scan are carried over unchanged (never marked closed).
 * - Jobs missing from a source that SUCCEEDED are marked closed, and dropped after the retention window.
 * - Duplicates (same id, or same company/title/location) appear once.
 */
export function mergeFeed(previous: JobFeed | null, results: SourceResult[], opts: MergeOptions): JobFeed {
  const now = opts.now.toISOString()
  const prevJobs = new Map((previous?.jobs ?? []).map((j) => [j.id, j]))
  const prevHealth = new Map((previous?.sources ?? []).map((s) => [s.key, s]))
  const okKeys = new Set(results.filter((r) => r.ok).map((r) => sourceKey(r.source)))
  const configuredKeys = new Set(results.map((r) => sourceKey(r.source)))
  const retentionMs = opts.closedRetentionDays * 86_400_000

  const out = new Map<string, Job>()
  const sources: SourceHealth[] = []

  for (const r of results) {
    const key = sourceKey(r.source)
    let kept = 0
    if (r.ok) {
      for (const raw of r.raw) {
        const j = toJob(r.source, raw, opts)
        if (!j || out.has(j.id)) continue
        const prev = prevJobs.get(j.id)
        out.set(j.id, {
          ...j,
          firstSeenAt: prev?.firstSeenAt ?? now,
          lastVerifiedAt: now,
          status: 'open',
        })
        kept++
      }
    }
    const prevH = prevHealth.get(key)
    sources.push({
      key,
      company: r.source.company,
      ats: r.source.ats,
      board: r.source.board,
      status: r.ok ? 'ok' : 'error',
      totalListed: r.ok ? r.raw.length : (prevH?.totalListed ?? 0),
      kept: r.ok ? kept : (prevH?.kept ?? 0),
      lastAttemptAt: now,
      lastSuccessAt: r.ok ? now : prevH?.lastSuccessAt,
      error: r.ok ? undefined : (r.error ?? 'Unknown error').slice(0, 300),
      durationMs: Math.round(r.durationMs),
    })
  }

  for (const prev of prevJobs.values()) {
    if (out.has(prev.id)) continue
    // Source removed from the registry: drop its jobs.
    if (!configuredKeys.has(prev.sourceKey)) continue
    // Outside the current city scope (e.g. scope was narrowed): drop, don't mark closed.
    if (opts.cities.length && !prev.cities.some((c) => opts.cities.includes(c))) continue
    if (!okKeys.has(prev.sourceKey)) {
      out.set(prev.id, prev) // source failed: keep last known state
      continue
    }
    const closedAt = prev.status === 'closed' ? (prev.closedAt ?? now) : now
    if (opts.now.getTime() - new Date(closedAt).getTime() > retentionMs) continue
    out.set(prev.id, { ...prev, status: 'closed', closedAt })
  }

  // Secondary de-duplication: prefer open, then earliest firstSeen.
  const byKey = new Map<string, Job>()
  const sorted = [...out.values()].sort(
    (a, b) =>
      (a.status === b.status ? 0 : a.status === 'open' ? -1 : 1) || a.firstSeenAt.localeCompare(b.firstSeenAt) || a.id.localeCompare(b.id),
  )
  for (const j of sorted) {
    const k = dedupeKey(j)
    if (!byKey.has(k)) byKey.set(k, j)
  }

  const jobs = [...byKey.values()].sort(
    (a, b) => b.firstSeenAt.localeCompare(a.firstSeenAt) || a.company.localeCompare(b.company) || a.title.localeCompare(b.title),
  )

  return {
    formatVersion: FEED_FORMAT_VERSION,
    generatedAt: now,
    lastSuccessfulScanAt: okKeys.size > 0 ? now : previous?.lastSuccessfulScanAt,
    ...(opts.cities.length ? { cityScope: [...opts.cities] } : {}),
    jobs,
    sources: sources.sort((a, b) => a.company.localeCompare(b.company)),
  }
}
