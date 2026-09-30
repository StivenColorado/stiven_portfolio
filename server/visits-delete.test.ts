import assert from 'node:assert/strict'
import type { Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { after, before, beforeEach, test } from 'node:test'
import { createApp } from './app.ts'
import { hashPassword } from './auth.ts'
import { loadConfig } from './config.ts'
import { openDb } from './db.ts'
import { clearCache } from './cache.ts'
import { resetBuckets } from './ratelimit.ts'

const EMAIL = 'admin@test.com'
const db = openDb(':memory:')
const config = loadConfig({
  ADMIN_EMAIL: EMAIL, ADMIN_PASSWORD_HASH: hashPassword('secreta-larga-1'), COOKIE_SECURE: '0',
  PUBLIC_URL: 'http://web.test', BREVO_API_KEY: 'k-test', MAIL_REPLY_TO: 'r@test.com',
})
const SAME = { 'Sec-Fetch-Site': 'same-origin', 'Content-Type': 'application/json' }
let server: Server
let base = ''
let cookie = ''

const count = () => (db.prepare('SELECT COUNT(*) AS n FROM visits').get() as { n: number }).n
const ids = () => (db.prepare('SELECT id FROM visits ORDER BY id').all() as { id: number }[]).map((r) => r.id)
const del = (body: unknown, headers: Record<string, string> = { ...SAME, Cookie: cookie }) =>
  fetch(`${base}/api/admin/visits/delete`, { method: 'POST', headers, body: JSON.stringify(body) })

function seed() {
  db.exec('DELETE FROM visits')
  const ins = db.prepare('INSERT INTO visits (ts, ip, country, city, ua, os, device, path, referrer) VALUES (?, ?, ?, NULL, \'ua\', ?, ?, ?, NULL)')
  ins.run(1000, '1.1.1.1', 'CO', 'windows', 'desktop', '/')
  ins.run(2000, '1.1.1.1', 'CO', 'android', 'mobile', '/about')
  ins.run(3000, '2.2.2.2', 'US', 'windows', 'desktop', '/')
  ins.run(4000, '3.3.3.3', 'MX', 'ios', 'mobile', '/')
}

before(async () => {
  server = createApp(config, db)
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r))
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
})
after(() => {
  server.close()
  db.close()
})
beforeEach(async () => {
  resetBuckets()
  clearCache()
  seed()
  const res = await fetch(`${base}/api/admin/login`, { method: 'POST', headers: SAME, body: JSON.stringify({ email: EMAIL, password: 'secreta-larga-1' }) })
  cookie = (res.headers.get('set-cookie') ?? '').split(';')[0] as string
})

test('borra por ids y responde {deleted}', async () => {
  const [a, b] = ids()
  const res = await del({ ids: [a, b, 9999] })
  assert.equal(res.status, 200)
  assert.deepEqual(await res.json(), { deleted: 2 })
  assert.equal(count(), 2)
})

test('borra por filtro (combinado y por rango de fechas)', async () => {
  assert.deepEqual(await (await del({ filter: { country: 'CO', os: 'windows' } })).json(), { deleted: 1 })
  assert.deepEqual(await (await del({ filter: { from: 2000, to: 3000 } })).json(), { deleted: 2 })
  assert.equal(count(), 1)
})

test('borra por ip', async () => {
  assert.deepEqual(await (await del({ ip: '1.1.1.1' })).json(), { deleted: 2 })
  assert.equal(count(), 2)
})

test('borra por ips (varias) y acepta dryRun', async () => {
  assert.deepEqual(await (await del({ ips: ['1.1.1.1', '3.3.3.3'], dryRun: true })).json(), { matched: 3 })
  assert.equal(count(), 4)
  assert.deepEqual(await (await del({ ips: ['1.1.1.1', '3.3.3.3', '1.1.1.1'] })).json(), { deleted: 3 })
  assert.equal(count(), 1)
})

test('ips inválido: vacío, demasiadas, no-IP o mezclado', async () => {
  const many = Array.from({ length: 201 }, (_, i) => `10.0.${Math.floor(i / 250)}.${(i % 250) + 1}`)
  for (const body of [{ ips: [] }, { ips: many }, { ips: ['nope'] }, { ips: [5] }, { ips: '1.1.1.1' }, { ips: ['1.1.1.1'], ip: '1.1.1.1' }]) {
    assert.equal((await del(body)).status, 400, JSON.stringify(body).slice(0, 60))
  }
  assert.equal(count(), 4)
})

test('dryRun cuenta sin borrar', async () => {
  assert.deepEqual(await (await del({ filter: { path: '/' }, dryRun: true })).json(), { matched: 3 })
  assert.equal(count(), 4)
})

test('invalida la caché de stats', async () => {
  const get = async () => ((await (await fetch(`${base}/api/admin/stats?days=90`, { headers: { Cookie: cookie } })).json()) as { total: number }).total
  db.exec(`UPDATE visits SET ts = ${Date.now()}`)
  assert.equal(await get(), 4)
  await del({ ip: '1.1.1.1' })
  assert.equal(await get(), 2)
})

test('400 ante entradas inválidas y no borra nada', async () => {
  const bad: unknown[] = [
    {}, [], { ids: [] }, { ids: [0] }, { ids: [-1] }, { ids: [1.5] }, { ids: ['1'] }, { ids: 'x' },
    { ids: Array.from({ length: 501 }, (_, i) => i + 1) },
    { filter: {} }, { filter: null }, { filter: { country: '' } }, { filter: { foo: 'x' } }, { filter: { from: 'a' } },
    { filter: { from: 1.5 } }, { filter: { os: 5 } }, { ip: '' }, { ip: 5 }, { ip: 'x'.repeat(46) },
    { ids: [1], ip: '1.1.1.1' }, { filter: { os: 'ios' }, ids: [1] }, { all: true }, { ids: [1], dryRun: 'yes' },
  ]
  for (const body of bad) assert.equal((await del(body)).status, 400, JSON.stringify(body).slice(0, 60))
  const raw = await fetch(`${base}/api/admin/visits/delete`, { method: 'POST', headers: { ...SAME, Cookie: cookie }, body: 'no-json' })
  assert.equal(raw.status, 400)
  assert.equal(count(), 4)
})

test('500 ids caben en el body', async () => {
  const res = await del({ ids: Array.from({ length: 500 }, (_, i) => i + 1_000_000) })
  assert.equal(res.status, 200)
})

test('401 sin sesión y 403 sin same-origin', async () => {
  assert.equal((await del({ ip: '1.1.1.1' }, SAME)).status, 401)
  assert.equal((await del({ ip: '1.1.1.1' }, { 'Content-Type': 'application/json', Cookie: cookie })).status, 403)
  assert.equal(count(), 4)
})

test('rate limit de 30 por minuto', async () => {
  const codes: number[] = []
  for (let i = 0; i < 31; i++) codes.push((await del({ ids: [999_999] })).status)
  assert.equal(codes.filter((c) => c === 200).length, 30)
  assert.equal(codes[30], 429)
})
