import { describe, expect, it } from 'vitest'
import { GitHubError, githubClient, tokenCreationUrl } from './github'

type Call = { url: string; init: RequestInit }
function mockFetch(handler: (url: string, init: RequestInit) => Response) {
  const calls: Call[] = []
  const f = (async (url: string, init: RequestInit) => {
    calls.push({ url, init })
    return handler(url, init)
  }) as unknown as typeof fetch
  return { f, calls }
}
const jsonRes = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })

describe('GitHub client', () => {
  it('refuses a public repository', async () => {
    const { f } = mockFetch(() => jsonRes({ private: false }))
    await expect(githubClient('me/repo', 't', f).checkAccess()).rejects.toThrow(/public/)
  })

  it('explains auth failures in plain language', async () => {
    const { f } = mockFetch(() => jsonRes({}, 401))
    await expect(githubClient('me/repo', 't', f).checkAccess()).rejects.toThrow(/rejected the token/)
    const forbidden = mockFetch(() => jsonRes({}, 403))
    await expect(githubClient('me/repo', 't', forbidden.f).listDir('results')).rejects.toBeInstanceOf(GitHubError)
  })

  it('round-trips non-ASCII text and sends the token only to api.github.com', async () => {
    let stored = ''
    const { f, calls } = mockFetch((_url, init) => {
      if (init.method === 'PUT') {
        stored = (JSON.parse(String(init.body)) as { content: string }).content
        return jsonRes({})
      }
      return stored ? jsonRes({ type: 'file', sha: 's', content: stored }) : jsonRes({}, 404)
    })
    const c = githubClient('me/repo', 'tok', f)
    const text = 'Bengaluru — C# ✓ नमस्ते'
    await c.putFile('profile/resume.md', text, 'm')
    expect((await c.getFile('profile/resume.md'))!.text).toBe(text)
    for (const call of calls) {
      expect(call.url.startsWith('https://api.github.com/repos/me/repo/')).toBe(true)
      expect((call.init.headers as Record<string, string>).Authorization).toBe('Bearer tok')
    }
  })

  it('treats a missing file or folder as empty, not as an error', async () => {
    const { f } = mockFetch(() => jsonRes({}, 404))
    const c = githubClient('me/repo', 't', f)
    expect(await c.getFile('nope.json')).toBeNull()
    expect(await c.listDir('results')).toEqual([])
  })

  it('rejects malformed repository names', () => {
    expect(() => githubClient('not a repo', 't')).toThrow(/owner\/name/)
  })

  it('links to the fine-grained token page', () => {
    expect(tokenCreationUrl()).toMatch(/^https:\/\/github\.com\/settings\/personal-access-tokens\/new\?/)
  })
})
