/**
 * Dev tool: check candidate boards before adding them to sources.json.
 *   node collector/probe.ts greenhouse:stripe lever:palantir ashby:ramp
 * Prints how many engineering roles each board lists in Bengaluru / Hyderabad / elsewhere in India.
 */
import { ATS_KINDS, type AtsKind } from '../src/domain/jobs/feedSchema.ts'
import { fetchSource } from './adapters.ts'
import { makeTitleFilter } from './filter.ts'
import { classifyLocations } from './location.ts'
import { loadConfig, makeFetcher } from './run.ts'

const config = loadConfig()
const keep = makeTitleFilter(config.titleFilter)
const fetcher = makeFetcher(config.requestTimeoutMs)

const args = process.argv.slice(2)
const rows: string[] = []
await Promise.all(
  args.map(async (arg) => {
    const [ats, board] = arg.split(':') as [AtsKind, string]
    if (!ATS_KINDS.includes(ats) || !board) return rows.push(`?? ${arg}`)
    try {
      const raw = await fetchSource({ company: board, ats, board }, fetcher)
      let blr = 0
      let hyd = 0
      let india = 0
      for (const j of raw) {
        if (!keep(j.title)) continue
        const loc = classifyLocations(j.locations)
        if (!loc.inIndia) continue
        india++
        if (loc.cities.includes('Bengaluru')) blr++
        if (loc.cities.includes('Hyderabad')) hyd++
      }
      rows.push(`${blr + hyd > 0 ? 'OK ' : '-- '} ${arg.padEnd(32)} total=${raw.length} indiaEng=${india} blr=${blr} hyd=${hyd}`)
    } catch (err) {
      rows.push(`ERR ${arg.padEnd(32)} ${err instanceof Error ? err.message : err}`)
    }
  }),
)
console.log(rows.sort().join('\n'))
