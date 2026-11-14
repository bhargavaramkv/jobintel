export type PreviewLine = { kind: 'name' | 'text' | 'role' | 'bullet'; text: string; meta?: string; right?: string }
export interface PreviewSection {
  heading: string | null
  lines: PreviewLine[]
}

const clean = (s: string) =>
  s
    .replace(/\\\\(\[[^\]]*\])?/g, ' ')
    .replace(/\\(quad|hfill|LARGE|large|textbf|textit)\b/g, '')
    .replace(/\\([#%&$_])/g, '$1')
    .replace(/--/g, '–')
    .replace(/[{}]/g, '')
    .replace(/\s+/g, ' ')
    .trim()

/** A tiny structured reading of the resume LaTeX. It is a preview aid, not a compiler. */
export function previewFromTex(source: string): PreviewSection[] {
  const body = source.split('\\begin{document}')[1]?.split('\\end{document}')[0] ?? ''
  const sections: PreviewSection[] = [{ heading: null, lines: [] }]
  for (const raw of body.split('\n')) {
    const line = raw.trim()
    if (!line || line.startsWith('%') || /^\\(begin|end)\{(center|itemize)\}/.test(line)) continue
    const section = /^\\section\{(.+)\}$/.exec(line)
    if (section) {
      sections.push({ heading: clean(section[1]), lines: [] })
      continue
    }
    const current = sections[sections.length - 1].lines
    const role = /^\\role\{(.*?)\}\{(.*?)\}\{(.*?)\}/.exec(line)
    if (role) current.push({ kind: 'role', text: clean(role[1]), meta: clean(role[2]), right: clean(role[3]) })
    else if (line.startsWith('\\item')) current.push({ kind: 'bullet', text: clean(line.slice(5)) })
    else if (line.includes('\\LARGE')) current.push({ kind: 'name', text: clean(line) })
    else current.push({ kind: 'text', text: clean(line) })
  }
  return sections.filter((s) => s.heading || s.lines.length)
}
