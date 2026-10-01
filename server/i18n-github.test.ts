import assert from 'node:assert/strict'
import { after, afterEach, before, beforeEach, test } from 'node:test'
import { backfillI18n, migrateGithubRepos, seedContent } from './content.ts'
import { PROJECTS_SEED } from './seed/projects.ts'
import { SAME, startApp } from './cms-helpers.ts'
import { createGithub } from './github.ts'

const realFetch = globalThis.fetch
let ghCalls: string[] = []
let ghHandler: (path: string) => { status?: number; body?: unknown } = () => ({ status: 404 })

beforeEach(() => {
  ghCalls = []
  globalThis.fetch = (async (input: Parameters<typeof fetch>[0], init?: RequestInit) => {
    const url = String(input instanceof Request ? input.url : input)
    if (!url.startsWith('https://api.github.com')) return realFetch(input, init)
    const path = url.slice('https://api.github.com'.length)
    ghCalls.push(path)
    const { status = 200, body = {} } = ghHandler(path)
    return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
  }) as typeof fetch
})
afterEach(() => {
  globalThis.fetch = realFetch
})

const commit = (message: string, n: number) => ({
  html_url: `https://github.com/o/r/commit/${n}`, commit: { message, author: { date: `2026-09-0${n}T10:00:00Z` } },
})
const happy = (isPrivate: boolean, repo = 'o/r') => (path: string) => {
  if (path.startsWith(`/repos/${repo}/commits`)) {
    return { body: [commit(`Primera línea ${'x'.repeat(200)}\n\ncuerpo`, 1), commit('dos', 2), commit('tres', 3), commit('cuatro', 4)] }
  }
  if (path === `/repos/${repo}`) return { body: { private: isPrivate, pushed_at: '2026-09-04T10:00:00Z' } }
  return { status: 404 }
}

let app: Awaited<ReturnType<typeof startApp>>
before(async () => {
  app = await startApp()
})
after(() => app.close())
beforeEach(() => app.resetBuckets())

const call = (...a: Parameters<typeof app.call>) => app.call(...a)
const content = async (lang?: string) => app.json(await fetch(`${app.base}/api/content${lang ? `?lang=${lang}` : ''}`))
const base = (slug: string, extra: Record<string, unknown> = {}) => ({
  slug, title: 'Título', summary: 'Resumen', description: 'Descripción', kind: 'demo', highlights: ['uno', 'dos'], client: 'Cliente', ...extra,
})
const publish = async (path: string, body: object) => {
  const { item } = await app.json(await call('POST', path, body))
  await call('POST', `${path}/${item.id}/status`, { status: 'published' })
  return item
}

test('i18n: merge con fallback campo por campo y caché por idioma', async () => {
  const item = await publish('/api/admin/projects', base('con-ingles', { i18n: { en: { title: 'Title', highlights: ['one'] } } }))
  assert.deepEqual(item.i18n, { en: { title: 'Title', highlights: ['one'] } })
  const find = (c: object) => (c as { projects: { slug: string }[] }).projects.find((p) => p.slug === 'con-ingles') as Record<string, unknown>

  const es = find(await content())
  assert.equal(es.title, 'Título')
  assert.equal('i18n' in es, false)
  const en = find(await content('en'))
  assert.equal(en.title, 'Title')
  assert.deepEqual(en.highlights, ['one'])
  assert.equal(en.summary, 'Resumen')
  assert.equal(en.client, 'Cliente')
  assert.equal(find(await content('fr')).title, 'Título')
  assert.equal(find(await content('en')).title, 'Title')

  await call('PUT', `/api/admin/projects/${item.id}`, base('con-ingles', { i18n: { en: { title: 'New title' } } }))
  assert.equal(find(await content('en')).title, 'New title')
  assert.equal(find(await content('es')).title, 'Título')
  assert.equal((await app.json(await call('GET', `/api/admin/projects/${item.id}`))).item.i18n.en.title, 'New title')
})

test('i18n: valida límites y rechaza claves y idiomas desconocidos', async () => {
  const bad = await call('POST', '/api/admin/projects', base('malo', {
    i18n: { en: { title: 'x'.repeat(121), highlights: 'no', slug: 'x' }, fr: {} },
  }))
  assert.equal(bad.status, 400)
  const { fields } = await app.json(bad)
  assert.ok(fields['i18n.en.title'] && fields['i18n.en.highlights'] && fields['i18n.en.slug'] && fields['i18n.fr'])
  const svc = await app.json(await call('POST', '/api/admin/services', {
    slug: 's-en', title: 'S', tagline: 'T', bullets: ['a'], icon: 'Bot', i18n: { en: { bullets: ['x'.repeat(161)] } },
  }))
  assert.ok(svc.fields['i18n.en.bullets'])
  const exp = await app.json(await call('POST', '/api/admin/experience', {
    date: '2026', title: 'T', description: 'D', i18n: { en: { date: 'y'.repeat(61), summary: 5 } },
  }))
  assert.ok(exp.fields['i18n.en.date'] && exp.fields['i18n.en.summary'])
  assert.equal((await call('POST', '/api/admin/projects', base('no-obj', { i18n: [] }))).status, 400)
})

test('la siembra trae inglés para todo el contenido', async () => {
  const en = await content('en')
  const es = await content('es')
  assert.equal(en.services[0].title, 'Technical consulting')
  assert.equal(es.services[0].title, 'Asesoría técnica')
  assert.match(en.experience[0].date, /Present/)
  assert.equal(en.projects[0].highlights.length, es.projects[0].highlights.length)
  const rows = (t: string) => app.db.prepare(`SELECT i18n FROM ${t}`).all() as { i18n: string }[]
  for (const t of ['services', 'experience']) {
    for (const r of rows(t)) assert.ok(Object.keys((JSON.parse(r.i18n) as { en: object }).en).length > 0, t)
  }
})

test('la migración rellena el en vacío y no pisa el existente', async () => {
  const set = (table: string, where: string, i18n: object) =>
    app.db.prepare(`UPDATE ${table} SET i18n = ? WHERE ${where}`).run(JSON.stringify(i18n))
  set('projects', "slug = 'azur'", {})
  set('services', "slug = 'ia'", { en: { title: 'Mi edición' } })
  set('experience', "json_extract(data, '$.title') = 'Desarrollador Backend - Contratista ICA'", { en: {} })
  app.db.prepare("DELETE FROM meta WHERE key LIKE 'i18n-en:%'").run()
  seedContent(app.db, app.mediaDir)

  const en = (table: string, where: string) =>
    JSON.parse((app.db.prepare(`SELECT i18n FROM ${table} WHERE ${where}`).get() as { i18n: string }).i18n).en
  assert.equal(en('projects', "slug = 'azur'").title, 'AZUR — wholesale catalog')
  assert.equal(en('services', "slug = 'ia'").title, 'Mi edición')
  assert.equal(en('experience', "json_extract(data, '$.title') = 'Desarrollador Backend - Contratista ICA'").role, 'Backend Developer')

  set('projects', "slug = 'azur'", {})
  backfillI18n(app.db)
  assert.deepEqual(en('projects', "slug = 'azur'"), undefined)
})

test('repos: sin token no hay llamadas; con token mapea y pagina', async () => {
  const none = await app.json(await call('GET', '/api/admin/github/repos'))
  assert.deepEqual(none, { configured: false, repos: [] })
  assert.equal(ghCalls.length, 0)
  assert.equal((await call('GET', '/api/admin/github/repos', undefined, { ...SAME, Cookie: '' })).status, 401)

  const page = (n: number, size: number) =>
    Array.from({ length: size }, (_, i) => ({
      full_name: `o/r${n}-${i}`, private: i % 2 === 0, pushed_at: '2026-09-01T00:00:00Z', description: null, html_url: `https://github.com/o/r${n}-${i}`, extra: 1,
    }))
  ghHandler = (path) => ({ body: page(Number(/[&?]page=(\d+)/.exec(path)?.[1] ?? 1), 100) })
  const gh = createGithub('tok')
  const repos = await gh.listRepos()
  assert.equal(repos.length, 300)
  assert.equal(ghCalls.length, 3)
  assert.deepEqual(repos[0], { fullName: 'o/r1-0', private: true, pushedAt: '2026-09-01T00:00:00Z', description: null, htmlUrl: 'https://github.com/o/r1-0' })
  await gh.listRepos()
  assert.equal(ghCalls.length, 3)
})

test('activity: solo con workingOn, privados sin commits ni nombre; fallo da null', async () => {
  const withToken = await startApp({ GITHUB_TOKEN: 'tok' })
  try {
    const find = async (slug: string) =>
      ((await withToken.json(await fetch(`${withToken.base}/api/content`))).projects as Record<string, unknown>[]).find((p) => p.slug === slug)
    const mk = async (slug: string, extra: Record<string, unknown>) => {
      const { item } = await withToken.json(await withToken.call('POST', '/api/admin/projects', base(slug, extra)))
      await withToken.call('POST', `/api/admin/projects/${item.id}/status`, { status: 'published' })
      return item
    }
    const waitFor = async (slug: string) => {
      for (let i = 0; i < 50; i++) {
        const p = await find(slug)
        if (p?.activity) return p
        await new Promise((r) => setTimeout(r, 20))
      }
      return find(slug)
    }

    ghHandler = happy(false)
    const created = await mk('publico', { githubRepo: 'o/r', workingOn: true })
    assert.equal(created.githubRepo, 'o/r')
    await mk('apagado', { githubRepo: 'o/r', workingOn: false })
    await mk('sin-repo', { workingOn: true })
    assert.equal((await find('publico'))?.activity, null)
    const pub = (await waitFor('publico')) as { workingOn: boolean; activity: { commits: { message: string; url: string }[]; commitsWeek: number; pushedAt: string } }
    assert.equal(pub.workingOn, true)
    assert.equal(pub.activity.commitsWeek, 4)
    assert.equal(pub.activity.pushedAt, '2026-09-04T10:00:00Z')
    assert.equal(pub.activity.commits.length, 3)
    assert.equal(pub.activity.commits[0]?.message.length, 120)
    assert.equal(pub.activity.commits[0]?.url, 'https://github.com/o/r/commit/1')
    assert.equal((await find('apagado'))?.activity, null)
    assert.equal((await find('sin-repo'))?.activity, null)
    assert.equal((await find('apagado'))?.workingOn, false)
    assert.equal('githubRepo' in (pub as object), false)
    assert.equal(JSON.stringify(await find('publico')).includes('github.com/o/r"'), false)

    ghHandler = happy(true, 'o/priv')
    await mk('privado', { githubRepo: 'o/priv', workingOn: true })
    const priv = (await waitFor('privado')) as { activity: { commits: unknown[]; commitsWeek: number } }
    assert.ok(priv.activity)
    assert.deepEqual(priv.activity.commits, [])
    const raw = JSON.stringify(await find('privado'))
    assert.equal(raw.includes('o/priv'), false)
    assert.equal(raw.includes('github.com'), false)

    ghHandler = () => ({ status: 500 })
    await mk('roto', { githubRepo: 'o/roto', workingOn: true })
    const res = await fetch(`${withToken.base}/api/content`)
    assert.equal(res.status, 200)
    await new Promise((r) => setTimeout(r, 50))
    assert.equal((await find('roto'))?.activity, null)
    assert.equal((await find('azur'))?.activity, null)
  } finally {
    withToken.close()
  }
})

test('stale-while-revalidate: devuelve lo cacheado, refresca en segundo plano y no duplica peticiones', async () => {
  let clock = 1_000_000
  let version = 1
  ghHandler = (path) => {
    if (path === '/repos/o/r') return { body: { private: false, pushed_at: `v${version}` } }
    return { body: [] }
  }
  const gh = createGithub('tok', () => clock)
  assert.equal((await gh.repoActivity('o/r'))?.pushedAt, 'v1')
  assert.equal(ghCalls.length, 2)
  await gh.repoActivity('o/r')
  assert.equal(ghCalls.length, 2)

  clock += 16 * 60_000
  version = 2
  const [a, b] = await Promise.all([gh.repoActivity('o/r'), gh.repoActivity('o/r')])
  assert.equal(a?.pushedAt, 'v1')
  assert.equal(b?.pushedAt, 'v1')
  await new Promise((r) => setTimeout(r, 30))
  assert.equal(ghCalls.length, 4)
  assert.equal((await gh.repoActivity('o/r'))?.pushedAt, 'v2')
  assert.equal(ghCalls.length, 4)

  clock += 16 * 60_000
  ghHandler = () => ({ status: 500 })
  assert.equal((await gh.repoActivity('o/r'))?.pushedAt, 'v2')
  await new Promise((r) => setTimeout(r, 30))
  assert.equal(gh.cachedActivity('o/r')?.pushedAt, 'v2')
})

test('githubRepo y workingOn: se validan y quedan en la auditoría', async () => {
  for (const githubRepo of ['sin-barra', 'a/b/c', 'a b/c', `${'x'.repeat(140)}/y`, 5]) {
    const res = await call('POST', '/api/admin/projects', base('gh-malo', { githubRepo }))
    assert.equal(res.status, 400, String(githubRepo))
    assert.ok((await app.json(res)).fields.githubRepo)
  }
  assert.ok((await app.json(await call('POST', '/api/admin/projects', base('gh-malo', { workingOn: 'si' })))).fields.workingOn)
  const { item } = await app.json(await call('POST', '/api/admin/projects', base('gh-ok')))
  assert.equal(item.githubRepo, null)
  assert.equal(item.workingOn, false)
  await call('PUT', `/api/admin/projects/${item.id}`, base('gh-ok', { githubRepo: 'StivenColorado/portfolio', workingOn: true }))
  const audit = await app.json(await call('GET', '/api/admin/audit?action=update&entity=projects&limit=1'))
  assert.match(audit.items[0].summary, /repo GitHub: StivenColorado\/portfolio; en desarrollo activo: sí/)
})

test('githubRepo: la siembra lo trae, la migración rellena sin pisar y es idempotente, y lo público nunca lo expone', async () => {
  const repoOf = (slug: string) =>
    (JSON.parse((app.db.prepare('SELECT data FROM projects WHERE slug = ?').get(slug) as { data: string }).data) as { githubRepo?: string | null }).githubRepo
  const setData = (slug: string, githubRepo?: string | null) => {
    const row = app.db.prepare('SELECT data FROM projects WHERE slug = ?').get(slug) as { data: string }
    const data = JSON.parse(row.data) as Record<string, unknown>
    if (githubRepo === undefined) delete data.githubRepo
    else data.githubRepo = githubRepo
    app.db.prepare('UPDATE projects SET data = ? WHERE slug = ?').run(JSON.stringify(data), slug)
  }
  const audits = () => (app.db.prepare("SELECT ip, summary FROM audit_log WHERE action = 'github.migrate'").all() as { ip: string; summary: string }[])

  assert.equal(repoOf('azur'), 'StivenColorado/AZUR')
  assert.equal(repoOf('ss-recorder'), 'StivenColorado/SS_RECORDER')
  assert.ok(PROJECTS_SEED.every((p) => typeof p.githubRepo === 'string'))

  setData('azur', undefined)
  setData('paraty', '')
  setData('finanzas', 'otro/mio')
  app.db.prepare("DELETE FROM meta WHERE key = 'github-repos'").run()
  assert.equal(migrateGithubRepos(app.db), 2)
  assert.equal(repoOf('azur'), 'StivenColorado/AZUR')
  assert.equal(repoOf('paraty'), 'StivenColorado/paraty')
  assert.equal(repoOf('finanzas'), 'otro/mio')
  assert.deepEqual(audits().map((a) => ({ ...a })), [{ ip: 'system', summary: 'Asignó repositorio de GitHub a 2 proyectos' }])

  setData('azur', undefined)
  assert.equal(migrateGithubRepos(app.db), 0)
  assert.equal(repoOf('azur'), undefined)
  assert.equal(audits().length, 1)

  const pub = JSON.stringify(await app.json(await fetch(`${app.base}/api/content`)))
  assert.equal(pub.includes('githubRepo'), false)
})
