/**
 * Minimal GitHub contents-API client for the automation loop. Talks only to the user's own
 * PRIVATE repository with a fine-grained token they created; refuses public repositories so a
 * typo can never publish candidate data.
 */
const API = 'https://api.github.com'

export class GitHubError extends Error {
  readonly status: number
  constructor(status: number, message: string) {
    super(message)
    this.name = 'GitHubError'
    this.status = status
  }
}

function toBase64Utf8(text: string): string {
  const bytes = new TextEncoder().encode(text)
  let bin = ''
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(bin)
}

function fromBase64Utf8(b64: string): string {
  const bin = atob(b64.replace(/\s/g, ''))
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return new TextDecoder().decode(bytes)
}

export interface DirEntry {
  name: string
  sha: string
  type: string
}

export interface GitHubClient {
  /** Throws unless the repository exists, the token can read it, and it is private. */
  checkAccess(): Promise<void>
  getFile(path: string): Promise<{ sha: string; text: string } | null>
  putFile(path: string, text: string, message: string): Promise<void>
  listDir(path: string): Promise<DirEntry[]>
}

function describe(status: number): string {
  if (status === 401) return 'GitHub rejected the token (expired or mistyped). Create a new one and paste it again.'
  if (status === 403) return 'The token cannot write to this repository. Give it "Contents: Read and write" on this repository.'
  if (status === 404) return 'Repository not found, or the token has no access to it.'
  if (status === 409 || status === 422) return 'GitHub refused the update (the file changed meanwhile). It will retry on the next sync.'
  return `GitHub returned HTTP ${status}.`
}

export function githubClient(repo: string, token: string, fetcher: typeof fetch = fetch): GitHubClient {
  if (!/^[\w.-]+\/[\w.-]+$/.test(repo)) throw new GitHubError(0, 'Repository must look like owner/name.')
  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  }

  async function call<T>(path: string, init: RequestInit = {}): Promise<T | null> {
    let res: Response
    try {
      res = await fetcher(`${API}/repos/${repo}${path}`, { ...init, headers: { ...headers, ...(init.headers ?? {}) }, cache: 'no-store' })
    } catch {
      throw new GitHubError(0, 'Could not reach GitHub. Check your connection.')
    }
    if (res.status === 404) return null
    if (!res.ok) throw new GitHubError(res.status, describe(res.status))
    return (await res.json()) as T
  }

  const contents = (path: string) => `/contents/${path.split('/').map(encodeURIComponent).join('/')}`

  return {
    async checkAccess() {
      const info = await call<{ private?: boolean }>('')
      if (!info) throw new GitHubError(404, describe(404))
      if (info.private !== true) throw new GitHubError(0, 'This repository is public. JobIntel only syncs to a private repository.')
    },
    async getFile(path) {
      const r = await call<{ sha: string; content?: string; type: string }>(contents(path))
      if (!r || r.type !== 'file' || typeof r.content !== 'string') return null
      return { sha: r.sha, text: fromBase64Utf8(r.content) }
    },
    async putFile(path, text, message) {
      const existing = await call<{ sha: string }>(contents(path))
      await call(contents(path), {
        method: 'PUT',
        body: JSON.stringify({ message, content: toBase64Utf8(text), ...(existing?.sha ? { sha: existing.sha } : {}) }),
      })
    },
    async listDir(path) {
      const r = await call<DirEntry[] | { type: string }>(contents(path))
      return Array.isArray(r) ? r : []
    },
  }
}

/** Link that opens GitHub's fine-grained token page with the right name and description pre-filled. */
export function tokenCreationUrl(): string {
  const p = new URLSearchParams({
    name: 'JobIntel sync',
    description: 'JobIntel: read/write Contents on the private jobintel-private repository only',
    expires_in: '366',
  })
  return `https://github.com/settings/personal-access-tokens/new?${p}`
}
