import { describe, expect, it } from 'vitest'
import { makeProfile } from '../../test/helpers'
import { contactSchema, rankLead, relationshipsOf, searchLinks, type Contact } from './contacts'

const base = (o: Partial<Contact> = {}): Contact => ({
  id: 'c1',
  name: 'Test Person',
  company: 'Acme Corp',
  role: 'Senior Backend Engineer',
  sourceUrl: 'https://example.com/team',
  pastCompanies: [],
  schools: [],
  knowsPersonally: false,
  workedTogether: false,
  status: 'new',
  note: '',
  createdAt: '2026-11-01T00:00:00.000Z',
  updatedAt: '2026-11-01T00:00:00.000Z',
  ...o,
})

const me = makeProfile({ currentCompany: 'Globex', pastEmployers: ['Initech Pvt Ltd'], schools: ['State University'], targetRoles: ['Backend Engineer'] })
const focus = { pipeline: new Set<string>(), targetCompanies: new Set<string>() }

describe('contact schema', () => {
  it('requires a traceable http(s) source', () => {
    expect(contactSchema.safeParse(base()).success).toBe(true)
    expect(contactSchema.safeParse(base({ sourceUrl: '' })).success).toBe(false)
    expect(contactSchema.safeParse(base({ sourceUrl: 'javascript:alert(1)' })).success).toBe(false)
  })

  it('has nowhere to store emails or phone numbers', () => {
    expect(contactSchema.safeParse({ ...base(), email: 'x@example.com' }).success).toBe(false)
  })
})

describe('relationshipsOf', () => {
  it('returns cold when nothing is shared, never an unsupported claim', () => {
    const r = relationshipsOf(base({ role: 'Designer' }), me)
    expect(r).toEqual([{ kind: 'cold', confidence: 'unknown', evidence: expect.any(String) }])
  })

  it('infers former colleagues only from overlapping employers (normalised)', () => {
    const r = relationshipsOf(base({ pastCompanies: ['Initech'] }), me)
    expect(r[0]).toMatchObject({ kind: 'former-colleague', confidence: 'inferred' })
    expect(r[0].evidence).toMatch(/Initech/)
    expect(relationshipsOf(base({ pastCompanies: ['Initech'], workedTogether: true }), me)[0].confidence).toBe('verified')
  })

  it('ignores "worked together" when there is no shared employer', () => {
    const r = relationshipsOf(base({ workedTogether: true, role: 'Designer' }), me)
    expect(r.map((x) => x.kind)).toEqual(['cold'])
  })

  it('detects alumni, mutual connections, recruiters and direct connections', () => {
    expect(relationshipsOf(base({ schools: ['state university'] }), me).map((x) => x.kind)).toContain('alumni')
    expect(relationshipsOf(base({ mutual: { name: 'A Friend', evidence: 'Listed as a mutual connection' } }), me)[0].kind).toBe('mutual-connection')
    expect(relationshipsOf(base({ role: 'Technical Recruiter' }), me)[0].kind).toBe('recruiter')
    expect(relationshipsOf(base({ knowsPersonally: true }), me)[0]).toMatchObject({ kind: 'direct-connection', confidence: 'verified' })
  })

  it('works without a profile', () => {
    expect(relationshipsOf(base({ pastCompanies: ['Initech'] }), null)[0].kind).toBe('hiring-team')
  })
})

describe('rankLead', () => {
  it('ranks genuine shared context and pipeline companies higher', () => {
    const cold = rankLead(base({ role: 'Designer' }), me, focus)
    const colleague = rankLead(base({ pastCompanies: ['Initech'] }), me, focus)
    const inPipeline = rankLead(base({ role: 'Designer' }), me, { ...focus, pipeline: new Set(['Acme Corp']) })
    expect(colleague.score).toBeGreaterThan(cold.score)
    expect(inPipeline.score).toBeGreaterThan(cold.score)
    expect(inPipeline.reasons).toContain('Company is in your pipeline')
    expect(rankLead(base({ status: 'dismissed' }), me, focus).score).toBe(-1)
  })
})

describe('searchLinks', () => {
  it('only builds URLs and encodes input', () => {
    const links = searchLinks('A&B Co')
    expect(links.every((l) => l.url.startsWith('https://'))).toBe(true)
    expect(links[0].url).toContain('A%26B')
  })
})
