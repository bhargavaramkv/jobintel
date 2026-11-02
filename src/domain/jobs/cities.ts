import type { City } from './feedSchema.ts'

/** Shared by the collector (job locations) and the app (profile locations). */
export const CITY_PATTERNS: ReadonlyArray<readonly [Exclude<City, 'Other India'>, RegExp]> = [
  ['Bengaluru', /\b(bengaluru|bangalore|blr)\b/i],
  ['Hyderabad', /\b(hyderabad|secunderabad|hyd)\b/i],
  ['Pune', /\bpune\b/i],
  ['Mumbai', /\b(mumbai|bombay|navi mumbai|thane)\b/i],
  ['Chennai', /\b(chennai|madras)\b/i],
  ['Delhi NCR', /\b(new delhi|delhi|gurgaon|gurugram|noida|ncr|faridabad|ghaziabad)\b/i],
]

export const CITY_ORDER: readonly City[] = ['Bengaluru', 'Hyderabad', 'Pune', 'Mumbai', 'Chennai', 'Delhi NCR', 'Other India']

export function citiesIn(text: string): City[] {
  return CITY_PATTERNS.filter(([, re]) => re.test(text)).map(([c]) => c)
}
