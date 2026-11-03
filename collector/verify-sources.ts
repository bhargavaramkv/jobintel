/**
 * Gate for automated source discovery (AI phase A4).
 *   node collector/verify-sources.ts <base-sources.json>
 * Compares collector/sources.json with the base version and passes only when:
 *   - entries were only ADDED (nothing removed or edited),
 *   - every new entry is well-formed, unique by ats:board and by company,
 *   - every new board is reachable and lists at least one engineering role in Bengaluru or Hyderabad.
 * The auto-sources workflow merges a discovery branch only when this exits 0.
 */
import { readFileSync, writeFileSync } from 'node:fs'
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

/**
 * Usage: node collector/verify-sources.ts <base-sources.json> [--write-accepted]
 * Structural problems (removals, edits, malformed or duplicate entries) always fail.
 * A board that is unreachable or has no local engineering roles is dropped. With --write-accepted,
 * sources.json is rewritten as base + the boards that passed, and the run fails only if none passed.
 */
async function main() {
  const basePath = process.argv[2]
  const writeAccepted = process.argv.includes('--write-accepted')
  if (!basePath) {
    console.error('usage: node collector/verify-sources.ts <base-sources.json> [--write-accepted]')
    process.exit(2)
  }
  const current = new URL('./sources.json', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')
  const base = readSources(basePath)
  const { added, problems } = diffSources(base, readSources(current))
  if (problems.length) {
    console.error(`REJECTED (structure):\n- ${problems.join('\n- ')}`)
    process.exit(1)
  }
  if (!added.length) {
    console.log('No new sources.')
    return
  }
  const config = loadConfig()
  const keep = makeTitleFilter(config.titleFilter)
  const fetcher = makeFetcher(config.requestTimeoutMs)
  const accepted: Source[] = []
  const dropped: string[] = []
  for (const s of added) {
    try {
      const raw = await fetchSource({ company: s.company, ats: s.ats as AtsKind, board: s.board }, fetcher)
      const local = raw
        .filter((j) => keep(j.title))
        .filter((j) => {
          const loc = classifyLocations(j.locations)
          return loc.cities.includes('Bengaluru') || loc.cities.includes('Hyderabad')
        }).length
      if (local === 0) dropped.push(`${key(s)}: no engineering roles in Bengaluru or Hyderabad`)
      else {
        accepted.push(s)
        console.log(`OK   ${key(s).padEnd(32)} ${local} matching role(s)`)
      }
    } catch (err) {
      dropped.push(`${key(s)}: unreachable (${err instanceof Error ? err.message : String(err)})`)
    }
  }
  for (const d of dropped) console.log(`DROP ${d}`)
  if (!accepted.length) {
    console.error('REJECTED: no proposed board passed verification.')
    process.exit(1)
  }
  if (writeAccepted) {
    const file = JSON.parse(readFileSync(basePath, 'utf8')) as Record<string, unknown>
    writeFileSync(current, `${JSON.stringify({ ...file, sources: [...base, ...accepted] }, null, 2)}\n`)
  } else if (dropped.length) {
    process.exit(1)
  }
  console.log(`ACCEPTED ${accepted.length} new source(s)${dropped.length ? `, dropped ${dropped.length}` : ''}.`)
}

if (process.argv[1] && /verify-sources\.ts$/.test(process.argv[1])) await main()
