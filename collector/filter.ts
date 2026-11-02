export interface TitleFilter {
  include: string[]
  exclude: string[]
}

const toRegex = (words: string[]) =>
  new RegExp(`(^|[^a-z0-9])(${words.map((w) => w.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})($|[^a-z0-9])`, 'i')

/** Keep software-engineering roles; drop non-engineering and out-of-scope titles. */
export function makeTitleFilter(f: TitleFilter): (title: string) => boolean {
  const inc = toRegex(f.include)
  const exc = f.exclude.length ? toRegex(f.exclude) : null
  return (title) => inc.test(title) && !(exc?.test(title) ?? false)
}
