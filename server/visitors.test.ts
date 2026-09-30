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

const get = (path: string, headers: Record<string, string> = { Cookie: cookie }) => fetch(`${base}/api/admin/${path}`, { headers })

function seed() {
  db.exec('DELETE FROM visits')
  const ins = db.prepare('INSERT INTO visits (ts, ip, country, city, ua, os, device, path, referrer) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
  ins.run(1000, '1.1.1.1', 'CO', 'Bogota', 'ua-a', 'windows', 'desktop', '/', null)
  ins.run(2000, '1.1.1.1', 'CO', 'Cali', 'ua-b', 'android', 'mobile', '/about', 'https://x.test')
  ins.run(3000, '1.1.1.1', 'CO', 'Cali', 'ua-b', 'android', 'mobile', '/about', null)
  ins.run(4000, '2.2.2.2', 'US', 'NYC', 'ua-c', 'ios', 'mobile', '/', null)
  ins.run(5000, '::1234', 'MX', null, 'ua-d', 'linux', 'desktop', '/', null)
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

type V = { ip: string; visits: number; firstSeen: number; lastSeen: number; country: string; city: string; os: string; device: string; oses: string[]; devices: string[]; paths: { key: string; n: number }[]; referrers: string[] }
const visitors = async (q = '') => ((await (await get(`visitors${q}`)).json()) as { visitors: V[] }).visitors

test('una fila por IP, ordenada por última visita y con agregados', async () => {
  const rows = await visitors()
  assert.deepEqual(rows.map((r) => r.ip), ['::1234', '2.2.2.2', '1.1.1.1'])
  const a = rows[2] as V
  assert.equal(a.visits, 3)
  assert.equal(a.firstSeen, 1000)
  assert.equal(a.lastSeen, 3000)
  assert.equal(a.city, 'Cali')
  assert.equal(a.os, 'android')
  assert.equal(a.device, 'mobile')
  assert.deepEqual([...a.oses].sort(), ['android', 'windows'])
  assert.deepEqual([...a.devices].sort(), ['desktop', 'mobile'])
  assert.deepEqual(a.paths, [{ key: '/about', n: 2 }, { key: '/', n: 1 }])
  assert.deepEqual(a.referrers, ['https://x.test'])
})

test('filtros y paginación aplican sobre visitantes', async () => {
  assert.deepEqual((await visitors('?os=windows')).map((r) => [r.ip, r.visits]), [['1.1.1.1', 1]])
  assert.deepEqual((await visitors('?country=US')).map((r) => r.ip), ['2.2.2.2'])
  assert.deepEqual((await visitors('?from=2500&to=4000')).map((r) => [r.ip, r.visits]), [['2.2.2.2', 1], ['1.1.1.1', 1]])
  assert.deepEqual((await visitors('?limit=1&offset=1')).map((r) => r.ip), ['2.2.2.2'])
  assert.equal((await get('visitors?from=abc')).status, 400)
  assert.equal((await get(`visitors?os=${'x'.repeat(201)}`)).status, 400)
})

test('detalle por IP: visitas en orden descendente', async () => {
  const res = await get('visitors/1.1.1.1/visits')
  const { visits } = (await res.json()) as { visits: { ts: number; ua: string }[] }
  assert.deepEqual(visits.map((v) => v.ts), [3000, 2000, 1000])
  const v6 = (await (await get('visitors/%3A%3A1234/visits')).json()) as { visits: unknown[] }
  assert.equal(v6.visits.length, 1)
})

test('detalle con IP inválida responde 400; sin sesión 401', async () => {
  for (const bad of ['nope', '1.1.1.999', "1.1.1.1'%20OR%201=1"]) assert.equal((await get(`visitors/${bad}/visits`)).status, 400, bad)
  assert.equal((await get('visitors/1.1.1.1/visits', {})).status, 401)
  assert.equal((await get('visitors', {})).status, 401)
})
