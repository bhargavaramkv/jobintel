import { describe, expect, it } from 'vitest'
import { diffSources } from './verify-sources.ts'

const base = [
  { company: 'Acme', ats: 'greenhouse', board: 'acme' },
  { company: 'Globex', ats: 'lever', board: 'globex' },
]

describe('automated source discovery gate', () => {
  it('accepts pure additions', () => {
    const r = diffSources(base, [...base, { company: 'Initech', ats: 'ashby', board: 'initech' }])
    expect(r.problems).toEqual([])
    expect(r.added).toEqual([{ company: 'Initech', ats: 'ashby', board: 'initech' }])
  })

  it('rejects removals and edits', () => {
    expect(diffSources(base, [base[0]]).problems.join()).toMatch(/removed lever:globex/)
    expect(diffSources(base, [base[0], { ...base[1], company: 'Renamed' }]).problems.join()).toMatch(/edited/)
  })

  it('rejects duplicates, unknown ATSs, bad slugs and companies already tracked', () => {
    const r = diffSources(base, [
      ...base,
      { company: 'New1', ats: 'workday', board: 'new1' },
      { company: 'New2', ats: 'greenhouse', board: '../etc' },
      { company: 'acme', ats: 'lever', board: 'acme2' },
      { company: 'Dup', ats: 'ashby', board: 'dup' },
      { company: 'Dup2', ats: 'ashby', board: 'dup' },
    ])
    const text = r.problems.join(' | ')
    expect(text).toMatch(/malformed/)
    expect(text).toMatch(/bad board slug/)
    expect(text).toMatch(/company already tracked: acme/)
    expect(text).toMatch(/duplicate ashby:dup/)
  })

  it('caps how many sources one run may add', () => {
    const many = Array.from({ length: 16 }, (_, i) => ({ company: `C${i}`, ats: 'greenhouse', board: `c${i}` }))
    expect(diffSources(base, [...base, ...many]).problems.join()).toMatch(/too many/)
  })
})
