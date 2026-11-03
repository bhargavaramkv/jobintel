import type { AtsKind } from '../src/domain/jobs/feedSchema.ts'
import { extractRequirementSections, htmlToText, requirementSectionsFromLists } from './text.ts'

/** A posting as read from an ATS, before location/title filtering and merging. */
export interface RawJob {
  sourceId: string
  title: string
  locations: string[]
  workModeRaw?: string
  isRemote?: boolean
  department?: string
  employmentType?: string
  descriptionText: string
  requirements: string[]
  /** Subset of `requirements` listed under a preferred / nice-to-have heading. */
  preferred?: string[]
  url: string
  postedAt?: string
}

export interface SourceConfig {
  company: string
  ats: AtsKind
  /** Board token / site name / job-board name used in the public API URL. */
  board: string
}

export type Fetcher = (url: string) => Promise<unknown>

const str = (v: unknown): string | undefined => (typeof v === 'string' && v.trim() ? v.trim() : undefined)
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : [])
const obj = (v: unknown): Record<string, unknown> => (v && typeof v === 'object' ? (v as Record<string, unknown>) : {})
const uniq = (xs: Array<string | undefined>) => [...new Set(xs.filter((x): x is string => !!x))]

const sections = (s: { all: string[]; preferred: string[] }) => ({
  requirements: s.all,
  ...(s.preferred.length ? { preferred: s.preferred } : {}),
})

function toIso(v: unknown): string | undefined {
  if (typeof v === 'number' && Number.isFinite(v)) return new Date(v).toISOString()
  if (typeof v === 'string') {
    const d = new Date(v)
    return Number.isNaN(d.getTime()) ? undefined : d.toISOString()
  }
  return undefined
}

export function apiUrl(source: SourceConfig): string {
  const b = encodeURIComponent(source.board)
  switch (source.ats) {
    case 'greenhouse':
      return `https://boards-api.greenhouse.io/v1/boards/${b}/jobs?content=true`
    case 'lever':
      return `https://api.lever.co/v0/postings/${b}?mode=json`
    case 'ashby':
      return `https://api.ashbyhq.com/posting-api/job-board/${b}`
  }
}

export function parseGreenhouse(data: unknown): RawJob[] {
  const jobs = arr(obj(data).jobs)
  if (!Array.isArray(obj(data).jobs)) throw new Error('Unexpected Greenhouse response shape')
  return jobs.flatMap((j): RawJob[] => {
    const o = obj(j)
    const id = o.id != null ? String(o.id) : undefined
    const title = str(o.title)
    const url = str(o.absolute_url)
    if (!id || !title || !url) return []
    const text = htmlToText(str(o.content) ?? '')
    const offices = arr(o.offices).map((x) => str(obj(x).location) ?? str(obj(x).name))
    return [
      {
        sourceId: id,
        title,
        locations: uniq([str(obj(o.location).name), ...offices]),
        department: str(obj(arr(o.departments)[0]).name),
        descriptionText: text,
        ...sections(extractRequirementSections(text)),
        url,
        postedAt: toIso(o.first_published) ?? toIso(o.updated_at),
      },
    ]
  })
}

export function parseLever(data: unknown): RawJob[] {
  if (!Array.isArray(data)) throw new Error('Unexpected Lever response shape')
  return data.flatMap((j): RawJob[] => {
    const o = obj(j)
    const id = str(o.id)
    const title = str(o.text)
    const url = str(o.hostedUrl)
    if (!id || !title || !url) return []
    const cat = obj(o.categories)
    const lists = arr(o.lists).map((l) => ({ text: str(obj(l).text), content: str(obj(l).content) }))
    const text = [str(o.descriptionPlain), ...lists.map((l) => `${l.text ?? ''}\n${htmlToText(l.content ?? '')}`), str(o.additionalPlain)]
      .filter(Boolean)
      .join('\n\n')
    const fromLists = requirementSectionsFromLists(lists)
    return [
      {
        sourceId: id,
        title,
        locations: uniq([str(cat.location), ...arr(cat.allLocations).map(str)]),
        workModeRaw: str(o.workplaceType),
        department: str(cat.team) ?? str(cat.department),
        employmentType: str(cat.commitment),
        descriptionText: text,
        ...sections(fromLists.all.length ? fromLists : extractRequirementSections(text)),
        url,
        postedAt: toIso(o.createdAt),
      },
    ]
  })
}

export function parseAshby(data: unknown): RawJob[] {
  const jobs = obj(data).jobs
  if (!Array.isArray(jobs)) throw new Error('Unexpected Ashby response shape')
  return jobs.flatMap((j): RawJob[] => {
    const o = obj(j)
    if (o.isListed === false) return []
    const id = str(o.id)
    const title = str(o.title)
    const url = str(o.jobUrl)
    if (!id || !title || !url) return []
    const text = str(o.descriptionPlain) ?? htmlToText(str(o.descriptionHtml) ?? '')
    const htmlText = str(o.descriptionHtml) ? htmlToText(str(o.descriptionHtml)!) : text
    return [
      {
        sourceId: id,
        title,
        locations: uniq([str(o.location), ...arr(o.secondaryLocations).map((l) => str(obj(l).location))]),
        workModeRaw: str(o.workplaceType),
        isRemote: o.isRemote === true,
        department: str(o.department),
        employmentType: str(o.employmentType),
        descriptionText: text,
        ...sections(extractRequirementSections(htmlText)),
        url,
        postedAt: toIso(o.publishedAt),
      },
    ]
  })
}

export const PARSERS: Record<AtsKind, (data: unknown) => RawJob[]> = {
  greenhouse: parseGreenhouse,
  lever: parseLever,
  ashby: parseAshby,
}

export async function fetchSource(source: SourceConfig, fetcher: Fetcher): Promise<RawJob[]> {
  return PARSERS[source.ats](await fetcher(apiUrl(source)))
}
