import assert from 'node:assert/strict'
import { after, before, beforeEach, test } from 'node:test'
import { recordAudit } from './audit.ts'
import { EMAIL, PASSWORD, SAME, startApp } from './cms-helpers.ts'
import { purge } from './visits.ts'

let app: Awaited<ReturnType<typeof startApp>>
before(async () => {
  app = await startApp()
})
after(() => app.close())
beforeEach(() => app.resetBuckets())

const audit = async (query = '') => (await app.json(await app.call('GET', `/api/admin/audit${query}`))).items as {
  id: number; ts: number; email: string | null; ip: string; action: string; entity: string | null; entityId: number | null; summary: string
}[]
const last = async (query = '') => (await audit(query))[0]!

test('el login correcto queda registrado con correo e IP', async () => {
  const entry = (await audit('?action=login')).at(-1)!
  assert.equal(entry.email, EMAIL)
  assert.equal(entry.ip, '127.0.0.1')
  assert.equal(entry.entity, 'auth')
})

test('el login fallido guarda el correo normalizado y nunca la contraseña', async () => {
  const res = await app.call('POST', '/api/admin/login', { email: '  Otro@Test.com ', password: 'clave-secreta-mala' }, SAME)
  assert.equal(res.status, 401)
  const entry = await last('?action=login_failed')
  assert.equal(entry.email, 'otro@test.com')
  assert.ok(!JSON.stringify(await audit()).includes('clave-secreta-mala'))
})

test('el CRUD escribe summary legible, correo de sesión y entityId', async () => {
  const { item } = await app.json(await app.call('POST', '/api/admin/projects', { slug: 'aud', title: 'AZUR 2', summary: 's', kind: 'demo' }))
  let e = await last()
  assert.deepEqual([e.action, e.entity, e.entityId, e.email, e.summary], ['create', 'projects', item.id, EMAIL, 'Creó proyecto «AZUR 2»'])
  await app.call('PUT', `/api/admin/projects/${item.id}`, { slug: 'aud', title: 'AZUR 2', summary: 's2', kind: 'demo' })
  assert.equal((await last()).summary, 'Editó proyecto «AZUR 2»')
  await app.call('POST', `/api/admin/projects/${item.id}/status`, { status: 'published' })
  assert.equal((await last()).summary, 'Publicó proyecto «AZUR 2»')
  await app.call('POST', `/api/admin/projects/${item.id}/featured`, { featured: true })
  assert.equal((await last()).summary, 'Destacó proyecto «AZUR 2»')
  await app.call('POST', '/api/admin/projects/reorder', { ids: [item.id] })
  assert.equal((await last()).action, 'reorder')
  await app.call('POST', `/api/admin/projects/${item.id}/status`, { status: 'archived' })
  await app.call('DELETE', `/api/admin/projects/${item.id}`)
  e = await last()
  assert.deepEqual([e.action, e.summary], ['delete', 'Eliminó proyecto «AZUR 2»'])
})

test('lo rechazado no se audita', async () => {
  const total = (await audit('?limit=200')).length
  await app.call('POST', '/api/admin/projects', { slug: 'Mal' })
  await app.call('DELETE', '/api/admin/projects/1')
  assert.equal((await audit('?limit=200')).length, total)
})

test('la subida de media y el borrado de visitas se auditan', async () => {
  const form = new FormData()
  form.append('file', new Blob([Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(2048)])]), 'a.png')
  await fetch(`${app.base}/api/admin/media`, { method: 'POST', headers: { 'Sec-Fetch-Site': 'same-origin', Cookie: app.cookie }, body: form })
  const up = await last('?action=media_upload')
  assert.match(up.summary, /^Subió imagen [a-f0-9]{16}\.png \(2 KB\)$/)

  app.db.prepare("INSERT INTO visits (ts, ip, path) VALUES (1, '9.9.9.9', '/')").run()
  await app.call('POST', '/api/admin/visits/delete', { ips: ['9.9.9.9'] })
  assert.equal((await last('?action=visits_delete')).summary, 'Borró 1 visita')
})

test('logout, cambio de contraseña y reset se auditan', async () => {
  const pass = await app.call('POST', '/api/admin/password', { current: PASSWORD, next: 'otra-clave-larga-2' })
  assert.equal(pass.status, 200)
  assert.equal((await last('?action=password_change')).email, EMAIL)

  app.db.prepare("INSERT INTO reset_tokens (hash, email, expires, used) VALUES (?, ?, ?, 0)").run(
    (await import('./auth.ts')).sha256('tok'), EMAIL, Date.now() + 60_000,
  )
  const reset = await app.call('POST', '/api/admin/reset', { token: 'tok', password: 'nueva-clave-larga-3' }, SAME)
  assert.equal(reset.status, 200)

  const relogin = async (password: string) => {
    const res = await app.call('POST', '/api/admin/login', { email: EMAIL, password }, SAME)
    return (res.headers.get('set-cookie') ?? '').split(';')[0] as string
  }
  app.cookie = await relogin('nueva-clave-larga-3')
  assert.equal((await last('?action=password_reset')).email, EMAIL)

  const out = await app.call('POST', '/api/admin/logout', undefined, { ...SAME, Cookie: app.cookie })
  assert.equal(out.status, 200)
  app.cookie = await relogin('nueva-clave-larga-3')
  const entry = await last('?action=logout')
  assert.deepEqual([entry.email, entry.entity, entry.summary], [EMAIL, 'auth', 'Cierre de sesión'])
})

test('filtros por acción y entidad, paginación con before y límite', async () => {
  app.db.exec('DELETE FROM audit_log')
  for (let i = 1; i <= 5; i++) {
    recordAudit(app.db, { email: EMAIL, ip: '1.1.1.1', action: i % 2 ? 'create' : 'update', entity: i < 3 ? 'projects' : 'services', entityId: i, summary: `n${i}` }, i * 1000)
  }
  assert.deepEqual((await audit('?action=create')).map((x) => x.summary), ['n5', 'n3', 'n1'])
  assert.deepEqual((await audit('?entity=projects')).map((x) => x.summary), ['n2', 'n1'])
  assert.deepEqual((await audit('?action=create&entity=services')).map((x) => x.summary), ['n5', 'n3'])
  assert.deepEqual((await audit('?limit=2&before=4000')).map((x) => x.summary), ['n3', 'n2'])
  assert.equal((await audit('?limit=1')).length, 1)
  assert.equal((await app.call('GET', '/api/admin/audit', undefined, { ...SAME })).status, 401)
})

test('la retención purga el registro viejo', () => {
  app.db.exec('DELETE FROM audit_log')
  const now = 400 * 86_400_000
  recordAudit(app.db, { email: null, ip: 'x', action: 'login', entity: 'auth', entityId: null, summary: 'viejo' }, 1000)
  recordAudit(app.db, { email: null, ip: 'x', action: 'login', entity: 'auth', entityId: null, summary: 'reciente' }, now - 86_400_000)
  purge(app.db, 30, now, 365)
  assert.deepEqual((app.db.prepare('SELECT summary FROM audit_log').all() as { summary: string }[]).map((r) => r.summary), ['reciente'])
})
