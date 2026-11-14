import { LIMITS } from '../profile/schema'

/**
 * Suggests roles, seniority and skills from a LaTeX resume. Pure and local: a fixed skill
 * dictionary and simple rules, nothing is sent anywhere.
 */

export interface ResumeInference {
  displayName?: string
  currentTitle?: string
  currentCompany?: string
  yearsExperience?: number
  professionalSummary?: string
  targetRoles: string[]
  targetSeniority: string[]
  primarySkills: string[]
  secondarySkills: string[]
}

const SKILL_TERMS = [
  'C#', '.NET', 'ASP.NET', 'SQL Server', 'PostgreSQL', 'MySQL', 'REST APIs', 'GraphQL', 'React', 'Next.js', 'Angular', 'Vue',
  'TypeScript', 'JavaScript', 'Node.js', 'Python', 'Java', 'Go', 'Docker', 'Kubernetes', 'Azure', 'AWS', 'GCP', 'Redis',
  'Kafka', 'RabbitMQ', 'Terraform', 'Microservices', 'CI/CD', 'Git', 'Linux',
]

const BACKEND_SIGNALS = ['.NET', 'ASP.NET', 'SQL Server', 'PostgreSQL', 'REST APIs', 'Redis', 'Kafka', 'RabbitMQ', 'Microservices', 'Java', 'Go', 'Python', 'Node.js']
const FRONTEND_SIGNALS = ['React', 'Angular', 'Vue', 'Next.js', 'TypeScript', 'JavaScript']
const MAX_SKILLS = 8
const MAX_ROLES = 3

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** Undo the LaTeX escapes that commonly appear in skill names (C\# becomes C#). */
function plainText(tex: string): string {
  return tex.replace(/\\#/g, '#').replace(/\\&/g, '&').replace(/\\%/g, '%')
}

/** Skill terms found in the text, most frequent first. */
function findSkills(text: string): Array<{ term: string; count: number; index: number }> {
  return SKILL_TERMS.flatMap((term) => {
    const re = new RegExp(`(?<![A-Za-z0-9+#.])${escapeRegex(term)}(?![A-Za-z0-9+#])`, 'g')
    const matches = [...text.matchAll(re)]
    return matches.length ? [{ term, count: matches.length, index: matches[0].index ?? 0 }] : []
  }).sort((a, b) => b.count - a.count || a.index - b.index)
}

/** The body of a section, from its heading to the next section heading. */
function sectionBody(text: string, name: string): string {
  const heading = `\\section{${name}}`
  const start = text.indexOf(heading)
  if (start < 0) return ''
  const rest = text.slice(start + heading.length)
  const next = rest.indexOf('\\section{')
  return next < 0 ? rest : rest.slice(0, next)
}

interface RoleEntry {
  title: string
  company: string
  dates: string
}

/** Entries from \role{Title}{Company}{Dates} lines, newest first (the resume lists newest first). */
function roleEntries(text: string): RoleEntry[] {
  return [...text.matchAll(/\\role\{([^}]*)\}\{([^}]*)\}\{([^}]*)\}/g)].map((m) => ({
    title: m[1].trim(),
    company: m[2].trim(),
    dates: m[3],
  }))
}

/** Full name from the header line \LARGE \textbf{Name}. */
function nameFrom(text: string): string | undefined {
  return text.match(/\\LARGE\s*\\textbf\{([^}]+)\}/)?.[1].trim()
}

/** Years from the earliest dated role until this year. */
function yearsFrom(entries: RoleEntry[], thisYear: number): number | undefined {
  const years = entries.flatMap((e) => [...e.dates.matchAll(/\b(?:19|20)\d{2}\b/g)].map((m) => Number(m[0])))
  return years.length ? Math.max(0, thisYear - Math.min(...years)) : undefined
}

function seniorityFrom(title: string): string[] {
  if (/\bIntern\b/i.test(title)) return ['Intern']
  if (/\bStaff\b/i.test(title)) return ['Staff']
  if (/\bLead\b/i.test(title)) return ['Lead']
  if (/\bSenior\b/i.test(title)) return ['Senior']
  if (/\b(II|2)\b|SDE-?2/i.test(title)) return ['SDE-2']
  if (/\b(I|1)\b|SDE-?1/i.test(title)) return ['SDE-1']
  return []
}

export function inferFromTex(tex: string, thisYear = new Date().getFullYear()): ResumeInference {
  const text = plainText(tex)
  const entries = roleEntries(text)
  const summary = sectionBody(text, 'Summary').replace(/\s+/g, ' ').trim()
  const found = findSkills(text)
  const names = new Set(found.map((f) => f.term))
  const inSkillsSection = findSkills(sectionBody(text, 'Skills')).map((f) => f.term)

  // Skills listed in the Skills section come first; the rest of the resume fills the secondary list.
  const primary = inSkillsSection.slice(0, MAX_SKILLS)
  const secondary = found.map((f) => f.term).filter((t) => !primary.includes(t)).slice(0, MAX_SKILLS)

  const current = entries[0]?.title ?? ''
  const roles: string[] = []
  if (current) roles.push(current.replace(/\s+(I|II|III|IV)$/, ''))
  const hasBackend = BACKEND_SIGNALS.some((s) => names.has(s))
  const hasFrontend = FRONTEND_SIGNALS.some((s) => names.has(s))
  if (/Engineer/i.test(current) && hasBackend && hasFrontend) {
    roles.push('Full-stack Engineer')
  } else if (/Engineer/i.test(current) && hasBackend) {
    roles.push('Backend Engineer')
  }

  return {
    displayName: nameFrom(text),
    currentTitle: entries[0]?.title,
    currentCompany: entries[0]?.company,
    yearsExperience: yearsFrom(entries, thisYear),
    professionalSummary: summary && summary.length <= LIMITS.summary ? summary : undefined,
    targetRoles: [...new Set(roles)].slice(0, MAX_ROLES),
    targetSeniority: seniorityFrom(current),
    primarySkills: primary,
    secondarySkills: secondary,
  }
}
