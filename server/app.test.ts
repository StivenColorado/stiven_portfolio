import assert from 'node:assert/strict'
import type { Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { after, before, test } from 'node:test'
import { createApp } from './app.ts'
import { hashPassword } from './auth.ts'
import { clearCache } from './cache.ts'
import { loadConfig } from './config.ts'
import { openDb } from './db.ts'
import { resetBuckets } from './ratelimit.ts'
import { purge, recordVisit } from './visits.ts'

const db = openDb(':memory:')
const config = loadConfig({ ADMIN_EMAIL: 'Admin@Test.com', PUBLIC_URL: 'http://web.test', BREVO_API_KEY: 'k-test', ADMIN_PASSWORD_HASH: hashPassword('secreta'), COOKIE_SECURE: '0', TRUST_PROXY: '0' })
let server: Server
let base = ''

const EMAIL = 'admin@test.com'
const SAME = { 'Sec-Fetch-Site': 'same-origin', 'Content-Type': 'application/json' }
const post = (path: string, body: unknown, headers: Record<string, string> = {}) =>
  fetch(base + path, { method: 'POST', headers, body: JSON.stringify(body) })

before(async () => {
  server = createApp(config, db)
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r))
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
})
after(() => {
  server.close()
  db.close()
})

test('track inserta con OS y dispositivo y purga lo viejo', () => {
  recordVisit(db, { ip: '8.8.8.8', ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) Mobile/15E148', path: '/', touch: true })
  recordVisit(db, { ip: '1.1.1.1', ua: 'curl/8', path: '/old', touch: false }, Date.now() - 40 * 86_400_000)
  const rows = db.prepare('SELECT os, device, path FROM visits ORDER BY id').all()
  assert.deepEqual({ ...rows[0] }, { os: 'ios', device: 'mobile', path: '/' })
  assert.equal(rows.length, 2)
  purge(db, 30)
  assert.equal((db.prepare('SELECT COUNT(*) AS n FROM visits').get() as { n: number }).n, 1)
})

test('POST /api/track responde 204, guarda y respeta /admin, GPC y tamaño', async () => {
  resetBuckets()
  const count = () => (db.prepare('SELECT COUNT(*) AS n FROM visits').get() as { n: number }).n
  const before0 = count()
  const ua = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0) Chrome/124', 'Content-Type': 'application/json' }
  assert.equal((await post('/api/track', { path: '/about', ref: '', touch: false }, ua)).status, 204)
  assert.equal((await post('/api/track', { path: '/admin/x' }, ua)).status, 204)
  assert.equal((await post('/api/track', { path: '/gpc' }, { ...ua, 'Sec-GPC': '1' })).status, 204)
  assert.equal((await post('/api/track', { path: '/' + 'a'.repeat(2000) }, ua)).status, 204)
  assert.equal(count(), before0 + 1)
  const row = db.prepare("SELECT os, device FROM visits WHERE path = '/about'").get()
  assert.deepEqual({ ...row }, { os: 'windows', device: 'desktop' })
})

test('admin sin cookie devuelve 401', async () => {
  resetBuckets()
  assert.equal((await fetch(base + '/api/admin/visits')).status, 401)
  assert.equal((await fetch(base + '/api/admin/stats')).status, 401)
  assert.equal((await fetch(base + '/api/admin/me')).status, 401)
})

test('login exige same-origin, fija cookie segura y permite consultar', async () => {
  resetBuckets()
  assert.equal((await post('/api/admin/login', { email: ' ADMIN@test.com ', password: 'secreta' }, { 'Content-Type': 'application/json' })).status, 403)
  assert.equal((await post('/api/admin/login', { email: EMAIL, password: 'mala' }, SAME)).status, 401)
  const ok = await post('/api/admin/login', { email: ' ADMIN@test.com ', password: 'secreta' }, SAME)
  assert.equal(ok.status, 200)
  const cookie = ok.headers.get('set-cookie') ?? ''
  assert.match(cookie, /HttpOnly/)
  assert.match(cookie, /SameSite=Strict/)
  const sid = cookie.split(';')[0]

  clearCache()
  const visits = await fetch(base + '/api/admin/visits?limit=5', { headers: { Cookie: sid } })
  assert.equal(visits.status, 200)
  assert.ok(Array.isArray(((await visits.json()) as { visits: unknown[] }).visits))
  const st = await fetch(base + '/api/admin/stats?days=7', { headers: { Cookie: sid } })
  assert.ok('os' in ((await st.json()) as object))

  assert.equal((await post('/api/admin/logout', {}, { Cookie: sid })).status, 403)
  assert.equal((await post('/api/admin/logout', {}, { ...SAME, Cookie: sid })).status, 200)
  assert.equal((await fetch(base + '/api/admin/me', { headers: { Cookie: sid } })).status, 401)
})

test('el sexto login desde la misma IP devuelve 429', async () => {
  resetBuckets()
  const codes: number[] = []
  for (let i = 0; i < 6; i++) codes.push((await post('/api/admin/login', { email: EMAIL, password: 'mala' }, SAME)).status)
  assert.deepEqual(codes, [401, 401, 401, 401, 401, 429])
})

test('body de login demasiado grande devuelve 413', async () => {
  resetBuckets()
  assert.equal((await post('/api/admin/login', { email: EMAIL, password: 'x'.repeat(2000) }, SAME)).status, 413)
})

test('X-Real-IP falso se ignora con TRUST_PROXY=0', async () => {
  resetBuckets()
  for (let i = 0; i < 5; i++) await post('/api/admin/login', { email: EMAIL, password: 'mala' }, { ...SAME, 'X-Real-IP': `9.9.9.${i}` })
  assert.equal((await post('/api/admin/login', { email: EMAIL, password: 'mala' }, { ...SAME, 'X-Real-IP': '9.9.9.99' })).status, 429)
})

test('health', async () => {
  resetBuckets()
  const body = (await (await fetch(base + '/api/health')).json()) as { ok: boolean }
  assert.equal(body.ok, true)
})
