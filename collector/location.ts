import { CITY_ORDER, CITY_PATTERNS } from '../src/domain/jobs/cities.ts'
import type { City, JobWorkMode } from '../src/domain/jobs/feedSchema.ts'

const OTHER_INDIA =
  /\b(india|kolkata|ahmedabad|jaipur|kochi|cochin|coimbatore|thiruvananthapuram|trivandrum|chandigarh|indore|mysuru|mysore|vadodara|nagpur|bhubaneswar|visakhapatnam|vizag|goa)\b/i

export interface LocationInfo {
  cities: City[]
  /** Any location is in India (city or the country itself). */
  inIndia: boolean
  /** Explicit remote-within-India offer. */
  remoteIndia: boolean
}

/**
 * Classify published location strings. Only what the text states is used:
 * "Remote" alone (no country) is NOT treated as India.
 */
export function classifyLocations(locations: string[]): LocationInfo {
  const cities = new Set<City>()
  let inIndia = false
  let remoteIndia = false
  let otherIndia = false
  for (const loc of locations) {
    let matched = false
    for (const [city, re] of CITY_PATTERNS) {
      if (re.test(loc)) {
        cities.add(city)
        matched = true
      }
    }
    const india = matched || OTHER_INDIA.test(loc)
    if (india) {
      inIndia = true
      const remote = /\bremote\b/i.test(loc)
      if (remote) remoteIndia = true
      // Another Indian city (e.g. Kochi) or a bare "India" on-site listing.
      else if (!matched) otherIndia = true
    }
  }
  // "Other India" only when no named city was found at all.
  if (otherIndia && cities.size === 0) cities.add('Other India')
  return { cities: CITY_ORDER.filter((c) => cities.has(c)), inIndia, remoteIndia }
}

export function normalizeWorkMode(raw: string | undefined | null, locations: string[], isRemote?: boolean): JobWorkMode {
  const v = (raw ?? '').toLowerCase().replace(/[^a-z]/g, '')
  if (v === 'remote') return 'remote'
  if (v === 'hybrid') return 'hybrid'
  if (v === 'onsite' || v === 'inoffice' || v === 'office') return 'onsite'
  const joined = locations.join(' ').toLowerCase()
  if (/\bhybrid\b/.test(joined)) return 'hybrid'
  if (isRemote || /\bremote\b/.test(joined)) return 'remote'
  return 'unknown'
}
