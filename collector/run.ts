/**
 * Job discovery collector. Runs in GitHub Actions (or locally):
 *   node collector/run.ts [--out public/data/jobs.json]
 *
 * Reads only public job-board APIs. Never reads, needs or writes candidate data.
 * Exits non-zero WITHOUT writing when every source fails, so the last good feed stays published.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { z } from 'zod'
import { ATS_KINDS, feedSchema, type JobFeed } from '../src/domain/jobs/feedSchema.ts'
import { fetchSource, type SourceConfig } from './adapters.ts'
import { makeTitleFilter } from './filter.ts'
import { mergeFeed, type SourceResult } from './merge.ts'

const here = dirname(fileURLToPath(import.meta.url))

const configSchema = z.object({
  titleFilter: z.object({ include: z.array(z.string()).min(1), exclude: z.array(z.string()) }),
  maxDescriptionChars: z.number().int().positive(),
  closedRetentionDays: z.number().int().nonnegative(),
  requestTimeoutMs: z.number().int().positive(),
  concurrency: z.number().int().positive(),
})

const sourcesSchema = z.object({
  sources: z.array(
    z.object({
      company: z.string().min(1),
      ats: z.enum(ATS_KINDS),
      board: z.string().regex(/^[A-Za-z0-9._-]+$/),
      enabled: z.boolean().optional(),
    }),
  ),
})

export function loadConfig() {
  return configSchema.parse(JSON.parse(readFileSync(resolve(here, 'config.json'), 'utf8')))
}

export function loadSources(): SourceConfig[] {
  const parsed = sourcesSchema.parse(JSON.parse(readFileSync(resolve(here, 'sources.json'), 'utf8')))
  const seen = new Set<string>()
  return parsed.sources
    .filter((s) => s.enabled !== false)
    .filter((s) => {
      const k = `${s.ats}:${s.board.toLowerCase()}`
      if (seen.has(k)) return false
      seen.add(k)
      return true
    })
    .map(({ company, ats, board }) => ({ company, ats, board }))
}

export function makeFetcher(timeoutMs: number) {
  return async (url: string): Promise<unknown> => {
    let lastErr: unknown
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const res = await fetch(url, {
          signal: AbortSignal.timeout(timeoutMs),
          headers: { accept: 'application/json', 'user-agent': 'JobIntel-collector (+https://github.com/bhargavaramkv/jobintel)' },
        })
        if (res.status === 404) throw new Error('Board not found (404)')
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return await res.json()
      } catch (err) {
        lastErr = err
        if (err instanceof Error && err.message.includes('404')) break
        await new Promise((r) => setTimeout(r, 1500))
      }
    }
    throw lastErr instanceof Error ? lastErr : new Error(String(lastErr))
  }
}

export async function collect(
  sources: SourceConfig[],
  fetcher: (url: string) => Promise<unknown>,
  concurrency: number,
): Promise<SourceResult[]> {
  const results: SourceResult[] = new Array(sources.length)
  let next = 0
  const worker = async () => {
    while (next < sources.length) {
      const i = next++
      const source = sources[i]
      const start = performance.now()
      try {
        const raw = await fetchSource(source, fetcher)
        results[i] = { source, ok: true, raw, durationMs: performance.now() - start }
      } catch (err) {
        results[i] = {
          source,
          ok: false,
          raw: [],
          error: err instanceof Error ? err.message : String(err),
          durationMs: performance.now() - start,
        }
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, sources.length) }, worker))
  return results
}

/** Compact JSON with one job per line, so git diffs between scans stay readable. */
export function serializeFeed(feed: JobFeed): string {
  const { jobs, sources, ...head } = feed
  const lines = (xs: unknown[]) => (xs.length ? '[\n' + xs.map((x) => JSON.stringify(x)).join(',\n') + '\n]' : '[]')
  const headJson = JSON.stringify(head).slice(0, -1)
  return `${headJson},
"sources":${lines(sources)},
"jobs":${lines(jobs)}}
`
}

function readPrevious(path: string): JobFeed | null {
  if (!existsSync(path)) return null
  const parsed = feedSchema.safeParse(JSON.parse(readFileSync(path, 'utf8')))
  if (!parsed.success) {
    console.warn('Previous feed is invalid; starting fresh.')
    return null
  }
  return parsed.data
}

async function main() {
  const outArg = process.argv.indexOf('--out')
  const out = resolve(outArg > 0 ? process.argv[outArg + 1] : resolve(here, '../public/data/jobs.json'))
  const config = loadConfig()
  const sources = loadSources()
  console.log(`Scanning ${sources.length} sources…`)

  const results = await collect(sources, makeFetcher(config.requestTimeoutMs), config.concurrency)
  const okCount = results.filter((r) => r.ok).length
  for (const r of results) {
    console.log(`${r.ok ? '✓' : '✗'} ${r.source.company} (${r.source.ats}/${r.source.board})${r.ok ? ` ${r.raw.length} listed` : ` ${r.error}`}`)
  }
  if (okCount === 0) {
    console.error('All sources failed; keeping the previous feed unchanged.')
    process.exit(1)
  }

  const feed = mergeFeed(readPrevious(out), results, {
    now: new Date(),
    keepTitle: makeTitleFilter(config.titleFilter),
    maxDescriptionChars: config.maxDescriptionChars,
    closedRetentionDays: config.closedRetentionDays,
  })
  feedSchema.parse(feed) // never publish an invalid feed

  mkdirSync(dirname(out), { recursive: true })
  writeFileSync(out, serializeFeed(feed))
  const open = feed.jobs.filter((j) => j.status === 'open').length
  console.log(`Wrote ${feed.jobs.length} jobs (${open} open) from ${okCount}/${results.length} healthy sources to ${out}`)
  if (okCount < results.length) console.log(`::warning::${results.length - okCount} source(s) failed this scan`)
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main()
}
