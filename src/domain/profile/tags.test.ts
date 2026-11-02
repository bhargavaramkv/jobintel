import { describe, expect, it } from 'vitest'
import { LIMITS } from './schema'
import { splitTagInput, validateTag } from './tags'

describe('validateTag', () => {
  it('trims and collapses whitespace', () => {
    expect(validateTag('  ASP.NET   Core ', [])).toEqual({ ok: true, value: 'ASP.NET Core' })
  })

  it('rejects empty input', () => {
    expect(validateTag('   ', []).ok).toBe(false)
  })

  it('rejects case-insensitive duplicates', () => {
    const r = validateTag('react', ['React'])
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toContain('React')
  })

  it('rejects overly long values', () => {
    expect(validateTag('x'.repeat(LIMITS.tag + 1), []).ok).toBe(false)
  })

  it('rejects when the list is full', () => {
    const full = Array.from({ length: LIMITS.tagsPerList }, (_, i) => `t${i}`)
    expect(validateTag('new', full).ok).toBe(false)
  })
})

describe('splitTagInput', () => {
  it('splits on commas, semicolons and newlines', () => {
    expect(splitTagInput('React, Node.js;SQL\nGo,, ')).toEqual(['React', 'Node.js', 'SQL', 'Go'])
  })
})
