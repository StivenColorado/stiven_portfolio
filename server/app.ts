import { createServer } from 'node:http'
import type { IncomingMessage, Server, ServerResponse } from 'node:http'
import { isIP } from 'node:net'
import type { DatabaseSync } from 'node:sqlite'
import { randomBytes } from 'node:crypto'
import {
  DUMMY_HASH, clearCookie, createSession, destroyOtherSessions, destroySession, hashPassword, readSid,
  sessionCookie, sessionEmail, sha256, verify,
} from './auth.ts'
import { clearCache, memo } from './cache.ts'
import type { Config } from './config.ts'
import { seedAdmin } from './db.ts'
import { geoReady } from './geo.ts'
import { clientIp } from './ip.ts'
import { sendResetMail } from './mail.ts'
import { hit } from './ratelimit.ts'
import {
  countMatching, deleteVisits, filterFromQuery, listVisitors, listVisits, parseDeleteSpec, recordVisit, stats, visitsOfIp,
} from './visits.ts'

const MAX_BODY = 1024
const MAX_DELETE_BODY = 16 * 1024
const MINUTE = 60_000
const MIN_PASSWORD = 12
const RESET_TTL_MS = 30 * MINUTE

function send(res: ServerResponse, status: number, body?: unknown, extra: Record<string, string> = {}): void {
  const payload = body === undefined ? undefined : JSON.stringify(body)
  res.writeHead(status, {
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer',
    ...(payload ? { 'Content-Type': 'application/json; charset=utf-8' } : {}),
    ...extra,
  })
  res.end(payload)
}

type Body = { tooBig: boolean; json: Record<string, unknown> | null }

function readJson(req: IncomingMessage, max = MAX_BODY): Promise<Body> {
  return new Promise((resolve) => {
    const declared = Number(req.headers['content-length'] ?? 0)
    if (declared > max) {
      req.resume()
      resolve({ tooBig: true, json: null })
      return
    }
    const chunks: Buffer[] = []
    let size = 0
    let tooBig = false
    req.on('data', (chunk: Buffer) => {
      size += chunk.length
      if (size > max) tooBig = true
      else chunks.push(chunk)
    })
    req.on('error', () => resolve({ tooBig, json: null }))
    req.on('end', () => {
      if (tooBig) return resolve({ tooBig, json: null })
      try {
        const parsed: unknown = JSON.parse(Buffer.concat(chunks).toString('utf8'))
        const isObject = typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)
        resolve({ tooBig, json: isObject ? (parsed as Record<string, unknown>) : null })
      } catch {
        resolve({ tooBig, json: null })
      }
    })
  })
}

function header(req: IncomingMessage, name: string): string {
  const v = req.headers[name]
  return (Array.isArray(v) ? v[0] : v) ?? ''
}

function isSameOrigin(req: IncomingMessage): boolean {
  const site = header(req, 'sec-fetch-site')
  if (site) return site === 'same-origin'
  const origin = header(req, 'origin')
  if (!origin) return false
  try {
    return new URL(origin).host === header(req, 'host')
  } catch {
    return false
  }
}

const normalizeEmail = (v: unknown): string | null =>
  typeof v === 'string' && v.length <= 254 ? v.trim().toLowerCase() : null

function clampInt(raw: string | null, min: number, max: number, fallback: number): number {
  const n = Number.parseInt(raw ?? '', 10)
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

export function createApp(config: Config, db: DatabaseSync): Server {
  seedAdmin(db, config.adminEmail, config.adminPasswordHash)

  async function track(req: IncomingMessage, res: ServerResponse, ip: string): Promise<void> {
    const body = await readJson(req)
    send(res, 204)
    if (!hit(`track:${ip}`, 60, MINUTE)) return
    if (body.tooBig || !body.json || header(req, 'sec-gpc') === '1') return
    const { path, ref, touch } = body.json
    if (typeof path !== 'string' || !path.startsWith('/') || path.length > 200) return
    if (path === '/admin' || path.startsWith('/admin/')) return
    recordVisit(db, {
      ip,
      ua: header(req, 'user-agent'),
      platform: header(req, 'sec-ch-ua-platform') || undefined,
      mobile: header(req, 'sec-ch-ua-mobile') || undefined,
      path,
      ref: typeof ref === 'string' ? ref.slice(0, 300) : undefined,
      touch: touch === true,
    })
  }

  function adminHash(email: string | null): string | null {
    if (email === null) return null
    const row = db.prepare('SELECT password_hash FROM admins WHERE email = ?').get(email) as
      | { password_hash: string }
      | undefined
    return row?.password_hash ?? null
  }

  async function login(req: IncomingMessage, res: ServerResponse, ip: string): Promise<void> {
    const okIp = hit(`login:${ip}`, 5, 15 * MINUTE)
    const okGlobal = hit('login:global', 30, 15 * MINUTE)
    if (!okIp || !okGlobal) {
      req.resume()
      return send(res, 429, { error: 'too_many_requests' })
    }
    if (!isSameOrigin(req)) {
      req.resume()
      return send(res, 403, { error: 'forbidden' })
    }
    const body = await readJson(req)
    if (body.tooBig) return send(res, 413, { error: 'payload_too_large' })
    const email = normalizeEmail(body.json?.email)
    if (email !== null && !hit(`login:email:${email}`, 5, 15 * MINUTE)) {
      return send(res, 429, { error: 'too_many_requests' })
    }
    const password = body.json?.password
    const stored = adminHash(email)
    const valid = verify(typeof password === 'string' ? password : '', stored ?? DUMMY_HASH)
    if (!(stored !== null && typeof password === 'string' && valid)) {
      await sleep(500)
      return send(res, 401, { error: 'unauthorized' })
    }
    const token = createSession(db, email as string, config.sessionHours)
    send(res, 200, { ok: true, email }, { 'Set-Cookie': sessionCookie(token, config.sessionHours, config.cookieSecure) })
  }

  async function forgot(req: IncomingMessage, res: ServerResponse, ip: string): Promise<void> {
    if (!hit(`forgot:${ip}`, 3, 60 * MINUTE)) {
      req.resume()
      return send(res, 429, { error: 'too_many_requests' })
    }
    if (!isSameOrigin(req)) {
      req.resume()
      return send(res, 403, { error: 'forbidden' })
    }
    const body = await readJson(req)
    if (body.tooBig) return send(res, 413, { error: 'payload_too_large' })
    const email = normalizeEmail(body.json?.email)
    send(res, 204)
    if (email === null || !hit(`forgot:email:${email}`, 3, 60 * MINUTE)) return
    if (adminHash(email) === null) return
    const token = randomBytes(32).toString('base64url')
    db.prepare('INSERT INTO reset_tokens (hash, email, expires, used) VALUES (?, ?, ?, 0)').run(
      sha256(token),
      email,
      Date.now() + RESET_TTL_MS,
    )
    const link = `${config.publicUrl}/admin/restablecer?token=${token}`
    sendResetMail(config, email, link).catch((err: unknown) => console.error('[mail]', (err as Error).message))
  }

  async function reset(req: IncomingMessage, res: ServerResponse, ip: string): Promise<void> {
    if (!hit(`reset:${ip}`, 10, 15 * MINUTE)) {
      req.resume()
      return send(res, 429, { error: 'too_many_requests' })
    }
    if (!isSameOrigin(req)) {
      req.resume()
      return send(res, 403, { error: 'forbidden' })
    }
    const body = await readJson(req)
    if (body.tooBig) return send(res, 413, { error: 'payload_too_large' })
    const { token, password } = body.json ?? {}
    if (typeof password !== 'string' || password.length < MIN_PASSWORD) return send(res, 400, { error: 'weak_password' })
    if (typeof token !== 'string' || token.length > 100) return send(res, 400, { error: 'invalid_token' })
    const passwordHash = hashPassword(password)
    const now = Date.now()
    db.exec('BEGIN IMMEDIATE')
    try {
      const row = db
        .prepare('UPDATE reset_tokens SET used = 1 WHERE hash = ? AND used = 0 AND expires > ? RETURNING email')
        .get(sha256(token), now) as { email: string } | undefined
      if (!row) {
        db.exec('ROLLBACK')
        return send(res, 400, { error: 'invalid_token' })
      }
      db.prepare('UPDATE admins SET password_hash = ?, updated = ? WHERE email = ?').run(passwordHash, now, row.email)
      db.prepare('DELETE FROM sessions WHERE email = ?').run(row.email)
      db.exec('COMMIT')
    } catch (err) {
      db.exec('ROLLBACK')
      throw err
    }
    send(res, 200, { ok: true }, { 'Set-Cookie': clearCookie(config.cookieSecure) })
  }

  async function changePassword(req: IncomingMessage, res: ServerResponse, email: string, sid: string): Promise<void> {
    if (!hit(`password:${email}`, 5, 15 * MINUTE)) {
      req.resume()
      return send(res, 429, { error: 'too_many_requests' })
    }
    if (!isSameOrigin(req)) {
      req.resume()
      return send(res, 403, { error: 'forbidden' })
    }
    const body = await readJson(req)
    if (body.tooBig) return send(res, 413, { error: 'payload_too_large' })
    const { current, next } = body.json ?? {}
    if (typeof next !== 'string' || next.length < MIN_PASSWORD) return send(res, 400, { error: 'weak_password' })
    const stored = adminHash(email)
    if (typeof current !== 'string' || stored === null || !verify(current, stored)) {
      await sleep(500)
      return send(res, 400, { error: 'invalid_current' })
    }
    db.prepare('UPDATE admins SET password_hash = ?, updated = ? WHERE email = ?').run(hashPassword(next), Date.now(), email)
    destroyOtherSessions(db, email, sid)
    send(res, 200, { ok: true })
  }

  async function deleteRoute(req: IncomingMessage, res: ServerResponse): Promise<void> {
    if (!isSameOrigin(req)) {
      req.resume()
      return send(res, 403, { error: 'forbidden' })
    }
    const body = await readJson(req, MAX_DELETE_BODY)
    if (body.tooBig) return send(res, 413, { error: 'payload_too_large' })
    const spec = body.json ? parseDeleteSpec(body.json) : null
    if (!spec || (body.json?.dryRun !== undefined && typeof body.json.dryRun !== 'boolean')) {
      return send(res, 400, { error: 'invalid_request' })
    }
    if (body.json?.dryRun === true) return send(res, 200, { matched: countMatching(db, spec) })
    const deleted = deleteVisits(db, spec)
    clearCache()
    send(res, 200, { deleted })
  }

  async function handle(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const ip = clientIp(req, config.trustProxy)
    const url = new URL(req.url ?? '/', 'http://localhost')
    const detail = req.method === 'GET' ? /^\/api\/admin\/visitors\/([^/]+)\/visits$/.exec(url.pathname) : null
    const route = detail ? 'GET /api/admin/visitors/:ip/visits' : `${req.method} ${url.pathname}`

    if (route === 'POST /api/track') return track(req, res, ip)
    if (route === 'POST /api/admin/login') return login(req, res, ip)
    if (route === 'POST /api/admin/forgot') return forgot(req, res, ip)
    if (route === 'POST /api/admin/reset') return reset(req, res, ip)

    if (route === 'GET /api/health') {
      if (!hit(`health:${ip}`, 60, MINUTE)) return send(res, 429, { error: 'too_many_requests' })
      const row = db.prepare('SELECT COUNT(*) AS n FROM visits').get() as { n: number }
      return send(res, 200, { ok: true, geo: geoReady(), visits: row.n })
    }

    const admin = new Set(['POST /api/admin/logout', 'POST /api/admin/password', 'GET /api/admin/me', 'GET /api/admin/visits', 'GET /api/admin/visitors', 'GET /api/admin/visitors/:ip/visits', 'POST /api/admin/visits/delete', 'GET /api/admin/stats'])
    if (!admin.has(route)) return send(res, 404, { error: 'not_found' })

    const limit = route === 'POST /api/admin/logout' ? 60 : route === 'POST /api/admin/visits/delete' ? 30 : 120
    if (!hit(`admin:${route}:${ip}`, limit, MINUTE)) return send(res, 429, { error: 'too_many_requests' })

    const sid = readSid(req.headers.cookie)
    const email = sessionEmail(db, sid)
    if (email === null) return send(res, 401, { error: 'unauthorized' })

    switch (route) {
      case 'POST /api/admin/logout':
        if (!isSameOrigin(req)) return send(res, 403, { error: 'forbidden' })
        destroySession(db, sid as string)
        return send(res, 200, { ok: true }, { 'Set-Cookie': clearCookie(config.cookieSecure) })
      case 'POST /api/admin/password':
        return changePassword(req, res, email, sid as string)
      case 'POST /api/admin/visits/delete':
        return deleteRoute(req, res)
      case 'GET /api/admin/me':
        return send(res, 200, { ok: true, email })
      case 'GET /api/admin/visits': {
        const lim = clampInt(url.searchParams.get('limit'), 1, 200, 50)
        const beforeRaw = url.searchParams.get('before')
        const before = beforeRaw === null ? null : clampInt(beforeRaw, 0, Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER)
        const data = memo(`visits:${lim}:${before}`, 15_000, () => listVisits(db, lim, before))
        return send(res, 200, { visits: data })
      }
      case 'GET /api/admin/visitors': {
        const filter = filterFromQuery(url.searchParams)
        if (!filter) return send(res, 400, { error: 'invalid_request' })
        const lim = clampInt(url.searchParams.get('limit'), 1, 200, 50)
        const offset = clampInt(url.searchParams.get('offset'), 0, 1_000_000, 0)
        const key = `visitors:${url.searchParams.toString()}`
        return send(res, 200, { visitors: memo(key, 15_000, () => listVisitors(db, filter, lim, offset)) })
      }
      case 'GET /api/admin/visitors/:ip/visits': {
        let ip = ''
        try {
          ip = decodeURIComponent(detail?.[1] ?? '')
        } catch {
          ip = ''
        }
        if (isIP(ip) === 0) return send(res, 400, { error: 'invalid_ip' })
        return send(res, 200, { visits: visitsOfIp(db, ip) })
      }
      default: {
        const days = clampInt(url.searchParams.get('days'), 1, 90, 7)
        return send(res, 200, memo(`stats:${days}`, 60_000, () => stats(db, days)))
      }
    }
  }

  const server = createServer((req, res) => {
    handle(req, res).catch((err: unknown) => {
      console.error('[server]', err)
      if (!res.headersSent) send(res, 500, { error: 'internal' })
      else res.end()
    })
  })
  server.requestTimeout = 10_000
  server.headersTimeout = 10_000
  return server
}
