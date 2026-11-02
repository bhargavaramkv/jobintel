/** Minimal, dependency-free HTML -> plain text for job descriptions. */

const NAMED: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  ndash: '–',
  mdash: '—',
  hellip: '…',
  rsquo: '’',
  lsquo: '‘',
  rdquo: '”',
  ldquo: '“',
  bull: '•',
  middot: '·',
}

export function decodeEntities(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, code: string) => {
    if (code[0] === '#') {
      const n = code[1].toLowerCase() === 'x' ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10)
      return Number.isFinite(n) && n > 0 && n < 0x110000 ? String.fromCodePoint(n) : m
    }
    return NAMED[code.toLowerCase()] ?? m
  })
}

export function htmlToText(html: string): string {
  // Greenhouse returns entity-escaped HTML; decode once first so tags become real tags.
  let s = /&lt;[a-z/]/i.test(html) ? decodeEntities(html) : html
  s = s
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, '')
    .replace(/<li[^>]*>/gi, '\n• ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|ul|ol|h[1-6]|tr|section)>/gi, '\n')
    .replace(/<h[1-6][^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, '')
  s = decodeEntities(s)
  return s
    .replace(/ /g, ' ')
    .split('\n')
    .map((line) => line.replace(/[ \t]+/g, ' ').trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

export function truncate(s: string, max: number): string {
  if (s.length <= max) return s
  const cut = s.slice(0, max)
  const lastBreak = Math.max(cut.lastIndexOf('\n'), cut.lastIndexOf('. '))
  return (lastBreak > max * 0.6 ? cut.slice(0, lastBreak + 1) : cut).trimEnd() + ' …'
}

const REQUIREMENT_HEADING =
  /\b(requirements?|qualifications?|what you('|’)?ll (need|bring)|what we('|’)?re looking for|what we (require|value)|you (have|bring|should have)|who you are|must[- ]haves?|skills|experience|about you|preferred|look(ing)? for|competenc(y|ies)|ideal candidate|nice to have|bonus|you('|’)?ll need|you will need|basic|minimum)\b/i

const BULLET = /^(•|-|\*|–|\d+[.)])\s+/

/**
 * Collect bullet lines that follow a requirements-style heading.
 * Purely textual: nothing is inferred beyond what the posting says.
 */
export function extractRequirements(text: string, max = 15): string[] {
  const out: string[] = []
  let inSection = false
  for (const raw of text.split('\n')) {
    const line = raw.trim()
    if (!line) continue
    const isBullet = BULLET.test(line)
    if (!isBullet) {
      // A short non-bullet line is treated as a heading.
      if (line.length <= 80) inSection = REQUIREMENT_HEADING.test(line)
      continue
    }
    if (inSection) {
      const item = line.replace(BULLET, '').trim()
      if (item.length >= 2 && item.length <= 400) out.push(item)
      if (out.length >= max) break
    }
  }
  return out
}

/** Lever provides structured lists with headings; prefer those. */
export function requirementsFromLists(lists: Array<{ text?: string; content?: string }>, max = 15): string[] {
  const out: string[] = []
  for (const list of lists) {
    if (!list.text || !REQUIREMENT_HEADING.test(list.text)) continue
    for (const line of htmlToText(list.content ?? '').split('\n')) {
      const item = line.replace(BULLET, '').trim()
      if (item.length >= 2 && item.length <= 400) out.push(item)
      if (out.length >= max) return out
    }
  }
  return out
}
