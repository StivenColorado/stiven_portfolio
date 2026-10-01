const API = 'https://api.github.com'
const REPOS_TTL = 10 * 60_000
const ACTIVITY_TTL = 15 * 60_000
const RETRY_AFTER_FAILURE = 60_000
const WEEK = 7 * 24 * 3_600_000
const MAX_PAGES = 3

export type RepoInfo = { fullName: string; private: boolean; pushedAt: string | null; description: string | null; htmlUrl: string }
export type Commit = { message: string; date: string; url: string }
export type Activity = { private: boolean; pushedAt: string; commitsWeek: number; commits: Commit[] }

type RawCommit = { html_url?: string; commit?: { message?: string; author?: { date?: string }; committer?: { date?: string } } }
type Entry = { value: Activity | null; at: number; failedAt: number }

/** Cliente de solo lectura de GitHub con cachés en memoria; ningún fallo se propaga al llamador. */
export function createGithub(token: string, now: () => number = Date.now) {
  const activity = new Map<string, Entry>()
  const inflight = new Map<string, Promise<Activity | null>>()
  let repos: { value: RepoInfo[]; at: number } | null = null

  async function get(path: string): Promise<{ status: number; body: unknown; ok: boolean }> {
    const res = await fetch(`${API}${path}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'X-GitHub-Api-Version': '2022-11-28',
        Accept: 'application/vnd.github+json',
        'User-Agent': 'stiven-portfolio',
      },
      signal: AbortSignal.timeout(8000),
    })
    return { status: res.status, ok: res.ok, body: res.ok ? await res.json() : null }
  }

  async function listRepos(): Promise<RepoInfo[]> {
    if (!token) return []
    if (repos && now() - repos.at < REPOS_TTL) return repos.value
    try {
      const all: RepoInfo[] = []
      for (let page = 1; page <= MAX_PAGES; page++) {
        const res = await get(`/user/repos?per_page=100&sort=pushed&affiliation=owner,collaborator,organization_member&page=${page}`)
        if (!res.ok) throw new Error(`GitHub /user/repos respondió ${res.status}`)
        const batch = res.body as Record<string, unknown>[]
        for (const r of batch) {
          all.push({
            fullName: String(r.full_name),
            private: r.private === true,
            pushedAt: typeof r.pushed_at === 'string' ? r.pushed_at : null,
            description: typeof r.description === 'string' ? r.description : null,
            htmlUrl: String(r.html_url),
          })
        }
        if (batch.length < 100) break
      }
      repos = { value: all, at: now() }
      return all
    } catch (err) {
      console.error('[github] listRepos', err instanceof Error ? err.message : err)
      return repos?.value ?? []
    }
  }

  async function fetchActivity(fullName: string): Promise<Activity | null> {
    const meta = await get(`/repos/${fullName}`)
    if (!meta.ok) throw new Error(`GitHub /repos/${fullName} respondió ${meta.status}`)
    const info = meta.body as { private?: boolean; pushed_at?: string | null }
    const since = new Date(now() - WEEK).toISOString()
    const res = await get(`/repos/${fullName}/commits?since=${encodeURIComponent(since)}&per_page=100`)
    if (!res.ok && res.status !== 409) throw new Error(`GitHub commits de ${fullName} respondió ${res.status}`)
    const list = res.ok ? (res.body as RawCommit[]) : []
    const commits = list.slice(0, 3).map((c) => ({
      message: (c.commit?.message ?? '').split('\n')[0]?.trim().slice(0, 120) ?? '',
      date: c.commit?.author?.date ?? c.commit?.committer?.date ?? '',
      url: c.html_url ?? '',
    }))
    return { private: info.private === true, pushedAt: info.pushed_at ?? '', commitsWeek: list.length, commits }
  }

  function refresh(fullName: string): Promise<Activity | null> {
    const running = inflight.get(fullName)
    if (running) return running
    const previous = activity.get(fullName)
    const job = fetchActivity(fullName)
      .then((value) => {
        activity.set(fullName, { value, at: now(), failedAt: 0 })
        return value
      })
      .catch((err: unknown) => {
        console.error('[github] repoActivity', err instanceof Error ? err.message : err)
        activity.set(fullName, { value: previous?.value ?? null, at: previous?.at ?? 0, failedAt: now() })
        return previous?.value ?? null
      })
      .finally(() => inflight.delete(fullName))
    inflight.set(fullName, job)
    return job
  }

  function peek(fullName: string): Activity | null {
    if (!token) return null
    const entry = activity.get(fullName)
    if (!entry) {
      void refresh(fullName)
      return null
    }
    const stale = now() - entry.at >= ACTIVITY_TTL
    const cooling = entry.failedAt > 0 && now() - entry.failedAt < RETRY_AFTER_FAILURE
    if (stale && !cooling) void refresh(fullName)
    return entry.value
  }

  async function repoActivity(fullName: string): Promise<Activity | null> {
    if (!token) return null
    const entry = activity.get(fullName)
    if (!entry) return refresh(fullName)
    return peek(fullName)
  }

  return { configured: token !== '', listRepos, repoActivity, cachedActivity: peek }
}

export type Github = ReturnType<typeof createGithub>
