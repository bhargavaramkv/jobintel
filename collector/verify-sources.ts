/**
 * Gate for automated source discovery (AI phase A4).
 *   node collector/verify-sources.ts <base-sources.json>
 * Compares collector/sources.json with the base version and passes only when:
 *   - entries were only ADDED (nothing removed or edited),
 *   - every new entry is well-formed, unique by ats:board and by company,
 *   - every new board is reachable and lists at least one engineering role in Bengaluru or Hyderabad.
 * The auto-sources workflow merges a discovery branch only when this exits 0.
 */
import { readFileSync } from 'node:fs'
import { ATS_KINDS, type AtsKind } from '../src/domain/jobs/feedSchema.ts'
import { fetchSource } from './adapters.ts'
import { makeTitleFilter } from './filter.ts'
import { classifyLocations } from './location.ts'
import { loadConfig, makeFetcher } from './run.ts'

interface Source {
  company: string
  ats: string
  board: string
}

const readSources = (path: string): Source[] => (JSON.parse(readFileSync(path, 'utf8')) as { sources: Source[] }).sources
const key = (s: Source) => `${s.ats}:${s.board}`.toLowerCase()

export function diffSources(base: Source[], next: Source[]): { added: Source[]; problems: string[] } {
  const problems: string[] = []
  const nextKeys = new Map(next.map((s) => [key(s), s]))
  for (const b of base) {
    const n = nextKeys.get(key(b))
    if (!n) problems.push(`removed ${key(b)} (automation may only add sources)`)
    else if (n.company !== b.company) problems.push(`edited ${key(b)} (automation may only add sources)`)
  }
  const baseKeys = new Set(base.map(key))
  const added = next.filter((s) => !baseKeys.has(key(s)))
  const seenKeys = new Set<string>()
  const seenCompanies = new Set(base.map((s) => s.company.toLowerCase()))
  for (const s of added) {
    if (!s.company?.trim() || !s.board?.trim() || !ATS_KINDS.includes(s.ats as AtsKind)) problems.push(`malformed entry ${JSON.stringify(s)}`)
    if (!/^[\w.-]+$/.test(s.board ?? '')) problems.push(`bad board slug ${s.board}`)
    if (seenKeys.has(key(s))) problems.push(`duplicate ${key(s)}`)
    if (seenCompanies.has(s.company.toLowerCase())) problems.push(`company already tracked: ${s.company}`)
    seenKeys.add(key(s))
    seenCompanies.add(s.company.toLowerCase())
  }
  if (added.length > 15) problems.push(`too many new sources at once (${added.length}); add at most 15`)
  return { added, problems }
}

async function main() {
  const basePath = process.argv[2]
  if (!basePath) {
    console.error('usage: node collector/verify-sources.ts <base-sources.json>')
    process.exit(2)
  }
  const current = new URL('./sources.json', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')
  const { added, problems } = diffSources(readSources(basePath), readSources(current))
  if (!added.length && !problems.length) {
    console.log('No new sources.')
    return
  }
  const config = loadConfig()
  const keep = makeTitleFilter(config.titleFilter)
  const fetcher = makeFetcher(config.requestTimeoutMs)
  for (const s of added) {
    try {
      const raw = await fetchSource({ company: s.company, ats: s.ats as AtsKind, board: s.board }, fetcher)
      const local = raw
        .filter((j) => keep(j.title))
        .filter((j) => {
          const loc = classifyLocations(j.locations)
          return loc.cities.includes('Bengaluru') || loc.cities.includes('Hyderabad')
        }).length
      if (local === 0) problems.push(`${key(s)} lists no engineering roles in Bengaluru or Hyderabad`)
      else console.log(`OK  ${key(s).padEnd(32)} ${local} matching role(s)`)
    } catch (err) {
      problems.push(`${key(s)} unreachable: ${err instanceof Error ? err.message : String(err)}`)
    }
  }
  if (problems.length) {
    console.error(`REJECTED:\n- ${problems.join('\n- ')}`)
    process.exit(1)
  }
  console.log(`ACCEPTED ${added.length} new source(s).`)
}

if (process.argv[1] && /verify-sources\.ts$/.test(process.argv[1])) await main()
