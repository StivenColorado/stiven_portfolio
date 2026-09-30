import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import assert from 'node:assert/strict'
import type { Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { after, before, beforeEach, test } from 'node:test'
import { createApp } from './app.ts'
import { hashPassword, sha256 } from './auth.ts'
import { loadConfig } from './config.ts'
import { openDb } from './db.ts'
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
type BrevoBody = { to: unknown; replyTo: unknown; htmlContent: string; textContent: string }
let brevo: { headers: Record<string, string>; body: BrevoBody }[] = []
const realFetch = globalThis.fetch

const post = (path: string, body: unknown, headers: Record<string, string> = SAME) =>
  fetch(base + path, { method: 'POST', headers, body: JSON.stringify(body) })
const login = async (password: string, email = EMAIL) => post('/api/admin/login', { email, password })
const sidOf = (res: Response) => (res.headers.get('set-cookie') ?? '').split(';')[0] as string
const sessionCount = () => (db.prepare('SELECT COUNT(*) AS n FROM sessions').get() as { n: number }).n
const tick = () => new Promise((r) => setTimeout(r, 30))

function tokenFromMail(): string {
  const link = /token=([A-Za-z0-9_-]+)/.exec(brevo.at(-1)!.body.textContent)![1]!
  return link
}

before(async () => {
  globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
    if (String(input).startsWith('https://api.brevo.com/')) {
      brevo.push({ headers: init!.headers as Record<string, string>, body: JSON.parse(String(init!.body)) as BrevoBody })
      return new Response('{}', { status: 201 })
    }
    return realFetch(input, init)
  }) as typeof fetch
  server = createApp(config, db)
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r))
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
})
after(() => {
  globalThis.fetch = realFetch
  server.close()
  db.close()
})
beforeEach(() => {
  resetBuckets()
  brevo = []
  db.exec('DELETE FROM sessions; DELETE FROM reset_tokens')
  db.prepare('UPDATE admins SET password_hash = ?').run(hashPassword('secreta-larga-1'))
})

test('login correcto (email normalizado) e incorrecto con error genérico', async () => {
  const ok = await login('secreta-larga-1', '  ADMIN@Test.com ')
  assert.equal(ok.status, 200)
  assert.deepEqual(await ok.json(), { ok: true, email: EMAIL })
  const me = await fetch(base + '/api/admin/me', { headers: { Cookie: sidOf(ok) } })
  assert.deepEqual(await me.json(), { ok: true, email: EMAIL })

  const badPass = await login('mala')
  const badMail = await login('secreta-larga-1', 'otro@test.com')
  assert.equal(badPass.status, 401)
  assert.equal(badMail.status, 401)
  assert.deepEqual(await badPass.json(), await badMail.json())
})

test('rate limit por email: 6.º intento con el mismo correo', async () => {
  const codes: number[] = []
  for (let i = 0; i < 6; i++) codes.push((await login('x')).status)
  assert.deepEqual(codes, [401, 401, 401, 401, 401, 429])
})

test('forgot: existente e inexistente dan 204, solo el existente llama a Brevo', async () => {
  const a = await post('/api/admin/forgot', { email: EMAIL })
  const b = await post('/api/admin/forgot', { email: 'nadie@test.com' })
  assert.equal(a.status, 204)
  assert.equal(b.status, 204)
  await tick()
  assert.equal(brevo.length, 1)
  assert.equal(brevo[0]!.headers['api-key'], 'k-test')
  assert.deepEqual(brevo[0]!.body.to, [{ email: EMAIL }])
  assert.deepEqual(brevo[0]!.body.replyTo, { email: 'r@test.com' })
  assert.match(brevo[0]!.body.htmlContent, /http:\/\/web\.test\/admin\/restablecer\?token=/)
  const token = tokenFromMail()
  const row = db.prepare('SELECT hash, used FROM reset_tokens').all() as { hash: string; used: number }[]
  assert.equal(row.length, 1)
  assert.equal(row[0]!.hash, sha256(token))
  assert.notEqual(row[0]!.hash, token)
})

test('forgot: exige same-origin y limita a 3 por email por hora', async () => {
  assert.equal((await post('/api/admin/forgot', { email: EMAIL }, { 'Content-Type': 'application/json' })).status, 403)
  resetBuckets()
  const codes: number[] = []
  for (let i = 0; i < 4; i++) codes.push((await post('/api/admin/forgot', { email: EMAIL })).status)
  assert.deepEqual(codes, [204, 204, 204, 429])
  await tick()
  assert.equal(brevo.length, 3)
})

test('reset válido cambia la contraseña; reutilizado da 400', async () => {
  await post('/api/admin/forgot', { email: EMAIL })
  await tick()
  const token = tokenFromMail()
  assert.equal((await post('/api/admin/reset', { token, password: 'corta' })).status, 400)
  const ok = await post('/api/admin/reset', { token, password: 'nueva-clave-segura' })
  assert.equal(ok.status, 200)
  assert.equal((await post('/api/admin/reset', { token, password: 'otra-clave-segura' })).status, 400)
  assert.equal((await login('secreta-larga-1')).status, 401)
  assert.equal((await login('nueva-clave-segura')).status, 200)
})

test('reset con token vencido o inventado da 400', async () => {
  await post('/api/admin/forgot', { email: EMAIL })
  await tick()
  const token = tokenFromMail()
  db.prepare('UPDATE reset_tokens SET expires = ?').run(Date.now() - 1)
  const res = await post('/api/admin/reset', { token, password: 'nueva-clave-segura' })
  assert.equal(res.status, 400)
  assert.deepEqual(await res.json(), { error: 'invalid_token' })
  assert.equal((await post('/api/admin/reset', { token: 'inventado', password: 'nueva-clave-segura' })).status, 400)
})

test('el reset invalida todas las sesiones del correo', async () => {
  const s1 = sidOf(await login('secreta-larga-1'))
  resetBuckets()
  const s2 = sidOf(await login('secreta-larga-1'))
  assert.equal(sessionCount(), 2)
  await post('/api/admin/forgot', { email: EMAIL })
  await tick()
  await post('/api/admin/reset', { token: tokenFromMail(), password: 'nueva-clave-segura' })
  assert.equal(sessionCount(), 0)
  for (const sid of [s1, s2]) assert.equal((await fetch(base + '/api/admin/me', { headers: { Cookie: sid } })).status, 401)
})

test('cambio de contraseña: valida current, conserva la sesión actual y borra las demás', async () => {
  const keep = sidOf(await login('secreta-larga-1'))
  resetBuckets()
  const other = sidOf(await login('secreta-larga-1'))
  const H = { ...SAME, Cookie: keep }
  assert.equal((await post('/api/admin/password', { current: 'secreta-larga-1', next: 'nueva-clave-segura' }, { 'Content-Type': 'application/json', Cookie: keep })).status, 403)
  assert.equal((await post('/api/admin/password', { current: 'secreta-larga-1', next: 'corta' }, H)).status, 400)
  assert.equal((await post('/api/admin/password', { current: 'equivocada', next: 'nueva-clave-segura' }, H)).status, 400)
  assert.equal((await post('/api/admin/password', { current: 'secreta-larga-1', next: 'nueva-clave-segura' }, { ...SAME })).status, 401)
  const ok = await post('/api/admin/password', { current: 'secreta-larga-1', next: 'nueva-clave-segura' }, H)
  assert.equal(ok.status, 200)
  assert.equal((await fetch(base + '/api/admin/me', { headers: { Cookie: keep } })).status, 200)
  assert.equal((await fetch(base + '/api/admin/me', { headers: { Cookie: other } })).status, 401)
  assert.equal((await login('nueva-clave-segura')).status, 200)
})

test('la migración es idempotente y recrea sessions del esquema viejo', () => {
  const dir = mkdtempSync(join(tmpdir(), 'mig-'))
  const path = join(dir, 'v.sqlite')
  const old = new DatabaseSync(path)
  old.exec("CREATE TABLE sessions (token TEXT PRIMARY KEY, expires INTEGER NOT NULL); INSERT INTO sessions VALUES ('t', 1)")
  old.close()
  for (let i = 0; i < 2; i++) {
    const d = openDb(path)
    const cols = (d.prepare('PRAGMA table_info(sessions)').all() as { name: string }[]).map((c) => c.name)
    assert.deepEqual(cols, ['token', 'email', 'expires'])
    d.close()
  }
  rmSync(dir, { recursive: true })
})
