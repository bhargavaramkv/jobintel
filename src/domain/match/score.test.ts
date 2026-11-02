import { describe, expect, it } from 'vitest'
import { makeJob } from '../../test/feedFixture'
import { makeProfile } from '../../test/helpers'
import { targetLevels } from '../jobs/feedback'
import { bandOf, isStalePosting, jobSkills, matchJob, requiredYears, similarPostings, splitRequirements } from './score'
import { canonicalSkill, mentionsSkill, skillsIn } from './skills'

describe('skill vocabulary', () => {
  it('maps .NET spellings to one skill but keeps languages apart', () => {
    expect(canonicalSkill('ASP.NET Core')).toBe('.NET')
    expect(canonicalSkill('dotnet')).toBe('.NET')
    expect(canonicalSkill('C#')).toBe('C#')
    expect(skillsIn('Experience with JavaScript')).toEqual(['JavaScript'])
    expect(skillsIn('Experience with TypeScript')).toEqual(['TypeScript'])
    expect(skillsIn('Java and Kotlin')).toEqual(['Java', 'Kotlin'])
    expect(skillsIn('JavaScript only')).not.toContain('Java')
    expect(skillsIn('C++ and C#')).toEqual(['C#', 'C++'])
  })

  it('avoids common-word false positives', () => {
    expect(skillsIn('the rest of the team will go to the office')).toEqual([])
    expect(skillsIn('Build REST APIs in Go')).toEqual(expect.arrayContaining(['Go', 'REST']))
    expect(skillsIn('Use Node.js, Postgres and k8s')).toEqual(['Node.js', 'PostgreSQL', 'Kubernetes'])
  })

  it('matches custom skills literally', () => {
    expect(mentionsSkill('Experience with Temporal workflows', 'Temporal')).toBe(true)
    expect(mentionsSkill('Experience with temporary data', 'Temporal')).toBe(false)
  })
})

describe('requirement parsing', () => {
  it('reads the binding years requirement', () => {
    expect(requiredYears({ requirements: ['2+ years with Kafka', '5+ years building backend services'], description: '' })).toMatchObject({ min: 5 })
    expect(requiredYears({ requirements: ['3-5 years of experience'], description: '' })).toMatchObject({ min: 3, max: 5 })
    expect(requiredYears({ requirements: [], description: 'We need 4 to 6 yrs of experience.' })).toMatchObject({ min: 4, max: 6 })
    expect(requiredYears({ requirements: ['Strong C#'], description: 'Founded 10 years ago' })).toMatchObject({ min: 10 })
    expect(requiredYears({ requirements: ['Strong C#'], description: 'No numbers here' })).toBeNull()
  })

  it('splits mandatory and preferred bullets', () => {
    const job = { requirements: ['C# and .NET', 'Kafka is a plus', 'AWS'], preferred: ['AWS'] }
    expect(splitRequirements(job)).toEqual({ mandatory: ['C# and .NET'], preferred: ['Kafka is a plus', 'AWS'] })
    expect(jobSkills({ ...job, title: 'Backend Engineer', description: '' })).toEqual({ mandatory: ['C#', '.NET'], preferred: ['Kafka', 'AWS'] })
  })
})

const backendJob = makeJob({
  sourceId: 'b1',
  title: 'Backend Engineer II',
  requirements: ['3+ years building services in C# / ASP.NET Core', 'SQL Server', 'Kafka is a plus'],
})

const dev = makeProfile({
  currentTitle: 'Software Engineer',
  yearsExperience: 4,
  primarySkills: [{ name: 'C#' }, { name: 'asp.net core' }, { name: 'SQL Server' }],
  targetRoles: ['Backend Engineer'],
  targetSeniority: ['SDE-2'],
  preferredLocations: ['Bengaluru'],
  workModes: ['hybrid', 'onsite'],
})

describe('matchJob', () => {
  it('scores a well-matched job highly and explains it', () => {
    const r = matchJob(backendJob, dev, targetLevels(dev.targetSeniority))
    expect(r.score).toBeGreaterThanOrEqual(80)
    expect(r.band).toBe('strong')
    const skills = r.factors.find((f) => f.id === 'skills')!
    expect(skills.matched).toEqual(expect.arrayContaining(['C#', '.NET', 'SQL Server']))
    expect(skills.missing).toEqual(['Kafka (preferred)'])
    expect(r.gaps).toEqual({ mandatory: [], preferred: ['Kafka'] })
  })

  it('scores a mismatched job low', () => {
    const job = makeJob({ sourceId: 'f1', title: 'Senior Frontend Engineer', requirements: ['7+ years with React and TypeScript'], cities: ['Hyderabad'], locations: ['Hyderabad'] })
    const r = matchJob(job, dev, targetLevels(dev.targetSeniority))
    expect(r.score!).toBeLessThan(30)
    expect(r.band).toBe('weak')
    expect(r.gaps.mandatory.sort()).toEqual(['React', 'TypeScript'])
    expect(r.factors.find((f) => f.id === 'experience')!.value).toBe(0)
  })

  it('never counts missing data as a match', () => {
    const empty = makeProfile()
    const r = matchJob(backendJob, empty)
    expect(r.factors.every((f) => f.value === null)).toBe(true)
    expect(r.score).toBeNull()
    expect(r.band).toBe('unknown')

    const noYears = makeJob({ sourceId: 'n', requirements: ['C#'], description: 'Build things.' })
    const r2 = matchJob(noYears, dev)
    expect(r2.factors.find((f) => f.id === 'experience')!.value).toBeNull()
    expect(r2.coverage).toBeLessThan(100)
  })

  it('returns an unknown result without a profile', () => {
    expect(matchJob(backendJob, null)).toMatchObject({ score: null, band: 'unknown', coverage: 0 })
  })

  it('weights required skills above preferred ones', () => {
    const job = makeJob({ sourceId: 'x', requirements: ['Go', 'Python'], preferred: ['Python'] })
    const onlyReq = matchJob(job, makeProfile({ primarySkills: [{ name: 'Go' }] }))
    const onlyPref = matchJob(job, makeProfile({ primarySkills: [{ name: 'Python' }] }))
    expect(onlyReq.factors[0].value!).toBeGreaterThan(onlyPref.factors[0].value!)
  })

  it('handles experience edge cases', () => {
    const job = makeJob({ sourceId: 'e', requirements: ['2-3 years of experience'] })
    expect(matchJob(job, makeProfile({ yearsExperience: 2 })).factors[1].value).toBe(1)
    expect(matchJob(job, makeProfile({ yearsExperience: 1 })).factors[1].value).toBe(0.6)
    expect(matchJob(job, makeProfile({ yearsExperience: 10 })).factors[1].value).toBe(0.7)
  })

  it('zeroes the "other" factor for excluded titles and rewards target companies', () => {
    const p = makeProfile({ excludedTitles: ['manager'], targetCompanies: ['Acme Corp'] })
    expect(matchJob(makeJob({ sourceId: 'm', title: 'Engineering Manager' }), p).factors[5].value).toBe(0)
    expect(matchJob(makeJob({ sourceId: 'k' }), p).factors[5].value).toBe(1)
  })

  it('caps the score when most required skills are missing', () => {
    const job = makeJob({ sourceId: 'cap', title: 'Backend Engineer II', requirements: ['3+ years', 'Go', 'Kafka', 'Redis', 'Cassandra'] })
    const r = matchJob(job, dev, [2])
    expect(r.score).toBe(50)
    expect(r.notes[0]).toMatch(/Capped/)
  })

  it('is deterministic', () => {
    expect(matchJob(backendJob, dev, [2])).toEqual(matchJob(backendJob, dev, [2]))
  })
})

describe('bands, staleness and duplicates', () => {
  it('needs enough coverage for a band', () => {
    expect(bandOf(90, 40)).toBe('unknown')
    expect(bandOf(90, 60)).toBe('strong')
    expect(bandOf(50, 60)).toBe('partial')
  })

  it('flags long-posted jobs as possibly stale', () => {
    const now = new Date('2026-11-02T00:00:00Z')
    expect(isStalePosting({ postedAt: '2026-07-01T00:00:00Z' }, now)).toBe(true)
    expect(isStalePosting({ postedAt: '2026-10-20T00:00:00Z' }, now)).toBe(false)
    expect(isStalePosting({}, now)).toBe(false)
  })

  it('groups similar postings at one company', () => {
    const a = makeJob({ sourceId: 'a', title: 'Backend Engineer (Payments)' })
    const b = makeJob({ sourceId: 'b', title: 'Backend Engineer', cities: ['Hyderabad'] })
    const c = makeJob({ sourceId: 'c', title: 'Frontend Engineer' })
    const g = similarPostings([a, b, c])
    expect(g.get(a.id)).toEqual([b.id])
    expect(g.has(c.id)).toBe(false)
  })
})
