import assert from 'node:assert/strict'
import { after, before, beforeEach, test } from 'node:test'
import { seedContent } from './content.ts'
import { SAME, startApp } from './cms-helpers.ts'

let app: Awaited<ReturnType<typeof startApp>>
const call = (...a: Parameters<typeof app.call>) => app.call(...a)

const project = (slug: string, extra: Record<string, unknown> = {}) => ({
  slug, title: `Proyecto ${slug}`, summary: 'Resumen', kind: 'demo', tags: ['REACT'], ...extra,
})
const service = (slug: string) => ({ slug, title: `Servicio ${slug}`, tagline: 'Lema', bullets: ['uno'], icon: 'Bot' })
const experience = (title: string) => ({ date: '2026', title, description: 'Descripción' })

before(async () => {
  app = await startApp()
})
after(() => app.close())
beforeEach(() => app.resetBuckets())

const count = (table: string) => (app.db.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get() as { n: number }).n

test('la siembra carga todo publicado y en orden, y es idempotente', async () => {
  assert.equal(count('projects'), 13)
  assert.equal(count('services'), 4)
  assert.equal(count('experience'), 9)
  seedContent(app.db, app.mediaDir)
  seedContent(app.db, app.mediaDir)
  assert.equal(count('projects'), 13)
  const content = await app.json(await fetch(`${app.base}/api/content`))
  assert.equal(content.projects[0].slug, 'azur')
  assert.deepEqual(content.projects[0].tags, ['NODEJS', 'TYPESCRIPT', 'REACT'])
  assert.deepEqual(content.services.map((s: { slug: string }) => s.slug), ['asesoria', 'desarrollo', 'ia', 'seguridad'])
  assert.equal(content.services[1].icon, 'Code2')
  assert.equal(content.experience[0].link, 'https://www.corprevenir.com/')
  assert.equal(content.experience[3].link, null)
  assert.equal(typeof content.experience[0].id, 'number')
  assert.equal('id' in content.projects[0], false)
})

test('sin sesión da 401 y sin same-origin da 403', async () => {
  const anon = { 'Content-Type': 'application/json' }
  assert.equal((await call('GET', '/api/admin/projects', undefined, anon)).status, 401)
  assert.equal((await call('POST', '/api/admin/projects', project('x'), anon)).status, 401)
  const noOrigin = { 'Content-Type': 'application/json', Cookie: app.cookie }
  assert.equal((await call('POST', '/api/admin/projects', project('x'), noOrigin)).status, 403)
  assert.equal((await call('PUT', '/api/admin/projects/1', project('x'), noOrigin)).status, 403)
  assert.equal((await call('DELETE', '/api/admin/projects/1', undefined, noOrigin)).status, 403)
  assert.equal((await call('POST', '/api/admin/projects/reorder', { ids: [] }, noOrigin)).status, 403)
  assert.equal((await call('GET', '/api/admin/projects', undefined, noOrigin)).status, 200)
})

test('CRUD de proyectos: nace oculto, edita, filtra y valida', async () => {
  const created = await call('POST', '/api/admin/projects', project('nuevo-uno', { year: 2026, links: { demo: 'https://x.dev' } }))
  assert.equal(created.status, 201)
  const { item } = await app.json(created)
  assert.equal(item.status, 'hidden')
  assert.equal(item.sortOrder, 13)
  assert.deepEqual(item.links, { demo: 'https://x.dev' })
  assert.deepEqual(item.images, [])

  const edited = await app.json(await call('PUT', `/api/admin/projects/${item.id}`, project('nuevo-uno', { title: 'Cambiado' })))
  assert.equal(edited.item.title, 'Cambiado')
  assert.equal(edited.item.year, null)
  assert.ok(edited.item.updatedAt >= item.updatedAt)

  assert.equal((await app.json(await call('GET', `/api/admin/projects/${item.id}`))).item.title, 'Cambiado')
  assert.equal((await call('GET', '/api/admin/projects/99999')).status, 404)
  assert.equal((await call('PUT', '/api/admin/projects/99999', project('zz'))).status, 404)

  const hidden = await app.json(await call('GET', '/api/admin/projects?status=hidden'))
  assert.deepEqual(hidden.items.map((i: { id: number }) => i.id), [item.id])
  const found = await app.json(await call('GET', '/api/admin/projects?q=cambiado'))
  assert.equal(found.items.length, 1)
  assert.equal((await call('GET', '/api/admin/projects?status=nope')).status, 400)
})

test('validación: 400 con fields por campo y claves desconocidas', async () => {
  const bad = await call('POST', '/api/admin/projects', {
    slug: 'Mal Slug', title: '', summary: 'x'.repeat(301), kind: 'otro', year: 1800, tags: ['react'], images: ['http://x.dev/a.png'],
    links: { demo: 'ftp://x' }, extra: 1,
  })
  assert.equal(bad.status, 400)
  const body = await app.json(bad)
  assert.equal(body.error, 'invalid')
  for (const key of ['slug', 'title', 'summary', 'kind', 'year', 'tags', 'images', 'links', 'extra']) {
    assert.equal(typeof body.fields[key], 'string', key)
  }
  const svc = await app.json(await call('POST', '/api/admin/services', { ...service('s'), bullets: [], icon: '1x' }))
  assert.ok(svc.fields.bullets && svc.fields.icon)
  const exp = await app.json(await call('POST', '/api/admin/experience', { title: 't', link: 'javascript:alert(1)' }))
  assert.ok(exp.fields.date && exp.fields.description && exp.fields.link)
  const raw = await fetch(`${app.base}/api/admin/projects`, { method: 'POST', headers: { ...SAME, Cookie: app.cookie }, body: '{no json' })
  assert.equal(raw.status, 400)
  const big = await call('POST', '/api/admin/projects', project('big', { description: 'x'.repeat(70_000) }))
  assert.equal(big.status, 413)
})

test('slug duplicado da 409 al crear y al editar', async () => {
  assert.equal((await call('POST', '/api/admin/projects', project('azur'))).status, 409)
  const { item } = await app.json(await call('POST', '/api/admin/projects', project('otro-slug')))
  const res = await call('PUT', `/api/admin/projects/${item.id}`, project('azur'))
  assert.equal(res.status, 409)
  assert.deepEqual(await app.json(res), { error: 'slug_taken' })
  assert.equal((await call('PUT', `/api/admin/projects/${item.id}`, project('otro-slug'))).status, 200)
  assert.equal((await call('POST', '/api/admin/services', service('ia'))).status, 409)
})

test('estado, eliminar solo archivado y featured', async () => {
  const { item } = await app.json(await call('POST', '/api/admin/projects', project('para-borrar')))
  const url = `/api/admin/projects/${item.id}`
  assert.equal((await call('DELETE', url)).status, 409)
  assert.deepEqual(await app.json(await call('DELETE', url)), { error: 'not_archived' })
  assert.equal((await call('POST', `${url}/status`, { status: 'nope' })).status, 400)
  assert.equal((await app.json(await call('POST', `${url}/status`, { status: 'published' }))).item.status, 'published')
  assert.equal((await call('DELETE', url)).status, 409)
  assert.equal((await app.json(await call('POST', `${url}/status`, { status: 'archived' }))).item.status, 'archived')

  const featured = await app.json(await call('POST', `${url}/featured`, { featured: true }))
  assert.equal(featured.item.featured, true)
  assert.equal((await call('POST', `${url}/featured`, { featured: 'si' })).status, 400)
  assert.equal((await call('POST', '/api/admin/services/1/featured', { featured: true })).status, 404)

  assert.equal((await call('DELETE', url)).status, 204)
  assert.equal((await call('GET', url)).status, 404)
  assert.equal((await call('DELETE', url)).status, 404)
})

test('servicios y experiencia: CRUD completo', async () => {
  const s = (await app.json(await call('POST', '/api/admin/services', service('nuevo-servicio')))).item
  assert.equal(s.status, 'hidden')
  assert.equal((await app.json(await call('PUT', `/api/admin/services/${s.id}`, { ...service('nuevo-servicio'), tagline: 'Otro' }))).item.tagline, 'Otro')
  await call('POST', `/api/admin/services/${s.id}/status`, { status: 'archived' })
  assert.equal((await call('DELETE', `/api/admin/services/${s.id}`)).status, 204)

  const e = (await app.json(await call('POST', '/api/admin/experience', { ...experience('Dev'), link: '/cv', stack: ['Node'] }))).item
  assert.equal(e.status, 'hidden')
  assert.equal(e.link, '/cv')
  assert.equal(e.role, null)
  assert.equal((await app.json(await call('PUT', `/api/admin/experience/${e.id}`, experience('Dev 2')))).item.title, 'Dev 2')
  assert.equal((await call('DELETE', `/api/admin/experience/${e.id}`)).status, 409)
  await call('POST', `/api/admin/experience/${e.id}/status`, { status: 'archived' })
  assert.equal((await call('DELETE', `/api/admin/experience/${e.id}`)).status, 204)
})

test('reorder cambia el orden y valida ids', async () => {
  const before = (await app.json(await call('GET', '/api/admin/services'))).items.map((i: { id: number }) => i.id)
  const next = [before[2], before[0]]
  assert.equal((await call('POST', '/api/admin/services/reorder', { ids: next })).status, 204)
  const after = (await app.json(await call('GET', '/api/admin/services'))).items.map((i: { id: number }) => i.id)
  assert.deepEqual(after.slice(0, 2), next)
  assert.equal(after.length, before.length)
  const pub = await app.json(await fetch(`${app.base}/api/content`))
  assert.equal(pub.services[0].slug, 'ia')
  assert.equal((await call('POST', '/api/admin/services/reorder', { ids: [99999] })).status, 400)
  assert.equal((await call('POST', '/api/admin/services/reorder', { ids: [1, 1] })).status, 400)
  assert.equal((await call('POST', '/api/admin/services/reorder', { ids: before })).status, 204)
})

test('/api/content solo publicado, con caché invalidada tras escribir', async () => {
  const get = async () => app.json(await fetch(`${app.base}/api/content`))
  const res = await fetch(`${app.base}/api/content`)
  assert.equal(res.headers.get('cache-control'), 'public, max-age=30, stale-while-revalidate=300')
  const total = (await get()).projects.length
  const { item } = await app.json(await call('POST', '/api/admin/projects', project('visible-luego')))
  assert.equal((await get()).projects.length, total)
  await call('POST', `/api/admin/projects/${item.id}/status`, { status: 'published' })
  const published = await get()
  assert.equal(published.projects.length, total + 1)
  assert.equal(published.projects.at(-1).slug, 'visible-luego')
  await call('PUT', `/api/admin/projects/${item.id}`, project('visible-luego', { title: 'Editado' }))
  assert.equal((await get()).projects.at(-1).title, 'Editado')
  await call('POST', `/api/admin/projects/${item.id}/status`, { status: 'hidden' })
  assert.equal((await get()).projects.length, total)
})
