import { createReadStream } from 'node:fs'
import { createServer } from 'node:http'
import type { IncomingMessage, Server, ServerResponse } from 'node:http'
import { isIP } from 'node:net'
import type { DatabaseSync } from 'node:sqlite'
import { randomBytes } from 'node:crypto'
import {
  DUMMY_HASH, clearCookie, createSession, destroyOtherSessions, destroySession, hashPassword, readSid,
  sessionCookie, sessionEmail, sha256, verify,
} from './auth.ts'
import { listAudit, recordAudit } from './audit.ts'
import { clearCache, memo } from './cache.ts'
import type { Config } from './config.ts'
import {
  SlugTakenError, createItem, migrateGithubRepos, getItem, listItems, publicContent, removeItem, reorder, seedContent, setFeatured,
  setStatus, updateItem,
} from './content.ts'
import type { Entity } from './content.ts'
import { parseLang } from './content.ts'
import { seedAdmin } from './db.ts'
import { geoReady } from './geo.ts'
import { createGithub } from './github.ts'
import { clientIp } from './ip.ts'
import { sendResetMail } from './mail.ts'
import {
  MAX_IMAGE, MAX_VIDEO, MEDIA_NAME, detectMedia, extensionMatches, mediaSize, mimeOf, parseRange, saveMedia,
} from './media.ts'
import { migrateMediaOnce } from './media-migrate.ts'
import { hit } from './ratelimit.ts'
import {
  STATUSES, validateExperience, validateFeatured, validateProject, validateReorder, validateService, validateStatus,
} from './validate.ts'
import type { Result } from './validate.ts'
import {
  countMatching, deleteVisits, filterFromQuery, listVisitors, listVisits, parseDeleteSpec, recordVisit, stats, visitsOfIp,
} from './visits.ts'

const MAX_BODY = 1024
const MAX_DELETE_BODY = 16 * 1024
const MAX_CONTENT_BODY = 64 * 1024
const MAX_UPLOAD = MAX_VIDEO + 64 * 1024
const LABEL: Record<Entity, string> = { projects: 'proyecto', services: 'servicio', experience: 'experiencia' }
const VALIDATORS: Record<Entity, (b: Record<string, unknown>) => Result<object>> = {
  projects: validateProject,
  services: validateService,
  experience: validateExperience,
}
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

function readBuffer(req: IncomingMessage, max: number): Promise<Buffer | null> {
  return new Promise((resolve) => {
    const chunks: Buffer[] = []
    let size = 0
    let tooBig = false
    req.on('data', (chunk: Buffer) => {
      size += chunk.length
      if (size > max) {
        tooBig = true
        chunks.length = 0
      } else if (!tooBig) chunks.push(chunk)
    })
    req.on('error', () => resolve(null))
    req.on('end', () => resolve(tooBig ? null : Buffer.concat(chunks)))
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
  seedContent(db, config.mediaDir)
  migrateMediaOnce(db, config.mediaDir, config.publicDir || null)
  if (migrateGithubRepos(db) > 0) clearCache()
  const github = createGithub(config.githubToken)

  const audit = (email: string | null, ip: string, action: string, entity: string | null, entityId: number | null, summary: string) =>
    recordAudit(db, { email, ip, action, entity, entityId, summary })

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
      audit(email, ip, 'login_failed', 'auth', null, `Intento de inicio de sesión fallido${email ? ` (${email})` : ''}`)
      await sleep(500)
      return send(res, 401, { error: 'unauthorized' })
    }
    const token = createSession(db, email as string, config.sessionHours)
    audit(email, ip, 'login', 'auth', null, 'Inicio de sesión')
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
    let resetEmail = ''
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
      resetEmail = row.email
    } catch (err) {
      db.exec('ROLLBACK')
      throw err
    }
    audit(resetEmail, ip, 'password_reset', 'auth', null, 'Contraseña restablecida con enlace de correo')
    send(res, 200, { ok: true }, { 'Set-Cookie': clearCookie(config.cookieSecure) })
  }

  async function changePassword(req: IncomingMessage, res: ServerResponse, email: string, sid: string, ip: string): Promise<void> {
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
    audit(email, ip, 'password_change', 'auth', null, 'Cambió su contraseña')
    send(res, 200, { ok: true })
  }

  async function deleteRoute(req: IncomingMessage, res: ServerResponse, email: string, ip: string): Promise<void> {
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
    audit(email, ip, 'visits_delete', 'visits', null, `Borró ${deleted} visita${deleted === 1 ? '' : 's'}`)
    send(res, 200, { deleted })
  }

  const invalid = (res: ServerResponse, fields: Record<string, string>) => send(res, 400, { error: 'invalid', fields })

  async function jsonBody(req: IncomingMessage, res: ServerResponse): Promise<Record<string, unknown> | null> {
    const body = await readJson(req, MAX_CONTENT_BODY)
    if (body.tooBig) send(res, 413, { error: 'payload_too_large' })
    else if (!body.json) invalid(res, { _: 'JSON inválido' })
    return body.json
  }

  const githubNote = (entity: Entity, prev: Record<string, unknown> | null, item: Record<string, unknown>): string => {
    if (entity !== 'projects') return ''
    const repo = (i: Record<string, unknown> | null) => (typeof i?.githubRepo === 'string' ? i.githubRepo : null)
    const parts: string[] = []
    if (repo(prev) !== repo(item)) parts.push(`repo GitHub: ${repo(item) ?? 'ninguno'}`)
    if ((prev?.workingOn === true) !== (item.workingOn === true)) parts.push(`en desarrollo activo: ${item.workingOn === true ? 'sí' : 'no'}`)
    return parts.length > 0 ? ` (${parts.join('; ')})` : ''
  }

  const titleOf = (item: Record<string, unknown>) => String(item.title ?? '').slice(0, 80)

  async function crud(
    req: IncomingMessage, res: ServerResponse, entity: Entity, seg: string | undefined, sub: string | undefined,
    email: string, ip: string,
  ): Promise<void> {
    const label = LABEL[entity]
    const id = seg !== undefined && seg !== 'reorder' ? Number(seg) : null
    const method = req.method
    const url = new URL(req.url ?? '/', 'http://localhost')

    if (method === 'GET' && seg === undefined) {
      const raw = url.searchParams.get('status') ?? 'all'
      if (raw !== 'all' && !(STATUSES as readonly string[]).includes(raw)) return send(res, 400, { error: 'invalid_request' })
      const q = (url.searchParams.get('q') ?? '').slice(0, 100)
      return send(res, 200, { items: listItems(db, entity, raw as 'all', q) })
    }
    if (method === 'GET') {
      const item = getItem(db, entity, id as number)
      return item ? send(res, 200, { item }) : send(res, 404, { error: 'not_found' })
    }

    if (!isSameOrigin(req)) {
      req.resume()
      return send(res, 403, { error: 'forbidden' })
    }
    if (method === 'DELETE') {
      const item = getItem(db, entity, id as number)
      const outcome = removeItem(db, entity, id as number)
      if (outcome === 'not_found') return send(res, 404, { error: 'not_found' })
      if (outcome === 'not_archived') return send(res, 409, { error: 'not_archived' })
      clearCache()
      audit(email, ip, 'delete', entity, id, `Eliminó ${label} «${titleOf(item ?? {})}»`)
      return send(res, 204)
    }

    const body = await jsonBody(req, res)
    if (!body) return
    try {
      if (seg === 'reorder') {
        const r = validateReorder(body)
        if (!r.ok) return invalid(res, r.fields)
        if (!reorder(db, entity, r.value)) return invalid(res, { ids: 'Hay ids que no existen' })
        clearCache()
        audit(email, ip, 'reorder', entity, null, `Reordenó ${entity === 'experience' ? 'la experiencia' : `los ${LABEL[entity]}s`}`)
        return send(res, 204)
      }
      if (sub === 'status') {
        const r = validateStatus(body)
        if (!r.ok) return invalid(res, r.fields)
        const item = setStatus(db, entity, id as number, r.value)
        if (!item) return send(res, 404, { error: 'not_found' })
        clearCache()
        const verb = { published: 'Publicó', hidden: 'Ocultó', archived: 'Archivó' }[r.value]
        audit(email, ip, 'status', entity, id, `${verb} ${label} «${titleOf(item)}»`)
        return send(res, 200, { item })
      }
      if (sub === 'featured') {
        const r = validateFeatured(body)
        if (!r.ok) return invalid(res, r.fields)
        const item = setFeatured(db, id as number, r.value)
        if (!item) return send(res, 404, { error: 'not_found' })
        clearCache()
        audit(email, ip, 'featured', entity, id, `${r.value ? 'Destacó' : 'Quitó el destacado de'} proyecto «${titleOf(item)}»`)
        return send(res, 200, { item })
      }
      const r = VALIDATORS[entity](body)
      if (!r.ok) return invalid(res, r.fields)
      if (method === 'POST') {
        const item = createItem(db, entity, r.value)
        clearCache()
        audit(email, ip, 'create', entity, item.id, `Creó ${label} «${titleOf(item)}»${githubNote(entity, null, item)}`)
        return send(res, 201, { item })
      }
      const prev = getItem(db, entity, id as number)
      const item = updateItem(db, entity, id as number, r.value)
      if (!item) return send(res, 404, { error: 'not_found' })
      clearCache()
      audit(email, ip, 'update', entity, id, `Editó ${label} «${titleOf(item)}»${githubNote(entity, prev, item)}`)
      return send(res, 200, { item })
    } catch (err) {
      if (err instanceof SlugTakenError) return send(res, 409, { error: 'slug_taken' })
      throw err
    }
  }

  async function upload(req: IncomingMessage, res: ServerResponse, email: string, ip: string): Promise<void> {
    if (!isSameOrigin(req)) {
      req.resume()
      return send(res, 403, { error: 'forbidden' })
    }
    const contentType = header(req, 'content-type')
    if (!/^multipart\/form-data;/i.test(contentType)) {
      req.resume()
      return send(res, 400, { error: 'invalid', fields: { file: 'Se esperaba multipart/form-data' } })
    }
    if (Number(req.headers['content-length'] ?? 0) > MAX_UPLOAD) {
      req.resume()
      return send(res, 413, { error: 'payload_too_large' }, { Connection: 'close' })
    }
    const raw = await readBuffer(req, MAX_UPLOAD)
    if (!raw) return send(res, 413, { error: 'payload_too_large' }, { Connection: 'close' })
    let file: unknown
    try {
      file = (await new Request('http://localhost/', { method: 'POST', headers: { 'content-type': contentType }, body: raw }).formData()).get('file')
    } catch {
      return send(res, 400, { error: 'invalid', fields: { file: 'Multipart inválido' } })
    }
    if (!(file instanceof File)) return send(res, 400, { error: 'invalid', fields: { file: 'Falta el archivo' } })
    const data = Buffer.from(await file.arrayBuffer())
    const kind = detectMedia(data)
    if (!kind || !extensionMatches(file.name, kind)) return send(res, 415, { error: 'unsupported_media_type' })
    if (data.length > (kind.type === 'image' ? MAX_IMAGE : MAX_VIDEO)) return send(res, 413, { error: 'payload_too_large' })
    const { name } = saveMedia(config.mediaDir, data, kind)
    const kb = Math.max(1, Math.round(data.length / 1024))
    audit(email, ip, 'media_upload', 'media', null, `Subió ${kind.type === 'image' ? 'imagen' : 'video'} ${name} (${kb} KB)`)
    send(res, 201, { url: `/api/media/${name}`, type: kind.type, size: data.length })
  }

  function serveMedia(req: IncomingMessage, res: ServerResponse, name: string): void {
    const size = MEDIA_NAME.test(name) ? mediaSize(config.mediaDir, name) : null
    if (size === null) return send(res, 404, { error: 'not_found' })
    const headers = {
      'Content-Type': mimeOf(name),
      'Cache-Control': 'public, max-age=31536000, immutable',
      'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': "default-src 'none'",
      'Accept-Ranges': 'bytes',
    }
    const range = parseRange(header(req, 'range') || undefined, size)
    if (range === 'invalid') {
      res.writeHead(416, { ...headers, 'Content-Range': `bytes */${size}` })
      return void res.end()
    }
    const [status, start, end] = range ? [206, range.start, range.end] : [200, 0, size - 1]
    res.writeHead(status, {
      ...headers,
      'Content-Length': String(end - start + 1),
      ...(range ? { 'Content-Range': `bytes ${start}-${end}/${size}` } : {}),
    })
    const stream = createReadStream(`${config.mediaDir}/${name}`, { start, end })
    stream.on('error', () => res.destroy())
    stream.pipe(res)
  }

  async function handle(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const ip = clientIp(req, config.trustProxy)
    const url = new URL(req.url ?? '/', 'http://localhost')
    const detail = req.method === 'GET' ? /^\/api\/admin\/visitors\/([^/]+)\/visits$/.exec(url.pathname) : null
    const crudMatch = /^\/api\/admin\/(projects|services|experience)(?:\/(reorder|\d+))?(?:\/(status|featured))?$/.exec(url.pathname)
    const [, entity, seg, sub] = crudMatch ?? []
    const crudRoute = crudMatch
      ? `${req.method} /api/admin/:entity${seg === undefined ? '' : seg === 'reorder' ? '/reorder' : '/:id'}${sub ? `/${sub}` : ''}`
      : null
    const mediaMatch = req.method === 'GET' ? /^\/api\/media\/([^/]+)$/.exec(url.pathname) : null
    const route = detail ? 'GET /api/admin/visitors/:ip/visits' : (crudRoute ?? `${req.method} ${url.pathname}`)

    if (route === 'POST /api/track') return track(req, res, ip)
    if (route === 'POST /api/admin/login') return login(req, res, ip)
    if (route === 'POST /api/admin/forgot') return forgot(req, res, ip)
    if (route === 'POST /api/admin/reset') return reset(req, res, ip)

    if (mediaMatch) {
      if (!hit(`media:${ip}`, 1200, MINUTE)) return send(res, 429, { error: 'too_many_requests' })
      let name = ''
      try {
        name = decodeURIComponent(mediaMatch[1] ?? '')
      } catch {
        name = ''
      }
      return serveMedia(req, res, name)
    }

    if (route === 'GET /api/content') {
      if (!hit(`content:${ip}`, 120, MINUTE)) return send(res, 429, { error: 'too_many_requests' })
      const lang = parseLang(url.searchParams.get('lang'))
      const base = memo(`content:${lang}`, 60_000, () => publicContent(db, lang))
      const projects = base.projects.map(({ githubRepo, workingOn, ...project }) => {
        const repo = typeof githubRepo === 'string' ? githubRepo : null
        const active = workingOn === true
        const found = active && repo ? github.cachedActivity(repo) : null
        const activity = found
          ? { pushedAt: found.pushedAt, commitsWeek: found.commitsWeek, commits: found.private ? [] : found.commits }
          : null
        return { ...project, workingOn: active, activity }
      })
      return send(res, 200, { ...base, projects }, {
        'Cache-Control': 'public, max-age=30, stale-while-revalidate=300',
      })
    }

    if (route === 'GET /api/health') {
      if (!hit(`health:${ip}`, 60, MINUTE)) return send(res, 429, { error: 'too_many_requests' })
      const row = db.prepare('SELECT COUNT(*) AS n FROM visits').get() as { n: number }
      return send(res, 200, { ok: true, geo: geoReady(), visits: row.n })
    }

    const admin = new Set(['POST /api/admin/logout', 'POST /api/admin/password', 'GET /api/admin/me', 'GET /api/admin/visits', 'GET /api/admin/visitors', 'GET /api/admin/visitors/:ip/visits', 'POST /api/admin/visits/delete', 'GET /api/admin/stats', 'POST /api/admin/media', 'GET /api/admin/audit', 'GET /api/admin/github/repos', 'GET /api/admin/:entity', 'POST /api/admin/:entity', 'GET /api/admin/:entity/:id', 'PUT /api/admin/:entity/:id', 'DELETE /api/admin/:entity/:id', 'POST /api/admin/:entity/reorder', 'POST /api/admin/:entity/:id/status', 'POST /api/admin/:entity/:id/featured'])
    if (!admin.has(route)) return send(res, 404, { error: 'not_found' })

    const limit = route === 'POST /api/admin/logout' ? 60 : route === 'POST /api/admin/visits/delete' ? 30 : route === 'POST /api/admin/media' ? 30 : 120
    if (!hit(`admin:${route}:${ip}`, limit, MINUTE)) return send(res, 429, { error: 'too_many_requests' })

    const sid = readSid(req.headers.cookie)
    const email = sessionEmail(db, sid)
    if (email === null) return send(res, 401, { error: 'unauthorized' })

    if (crudMatch) {
      if (sub === 'featured' && entity !== 'projects') return send(res, 404, { error: 'not_found' })
      return crud(req, res, entity as Entity, seg, sub, email, ip)
    }

    switch (route) {
      case 'POST /api/admin/media':
        return upload(req, res, email, ip)
      case 'GET /api/admin/github/repos':
        return send(res, 200, { configured: github.configured, repos: await github.listRepos() })
      case 'GET /api/admin/audit': {
        const lim = clampInt(url.searchParams.get('limit'), 1, 200, 50)
        const beforeRaw = url.searchParams.get('before')
        const before = beforeRaw === null ? null : clampInt(beforeRaw, 0, Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER)
        const action = url.searchParams.get('action')?.slice(0, 40) || null
        const ent = url.searchParams.get('entity')?.slice(0, 40) || null
        return send(res, 200, { items: listAudit(db, { limit: lim, before, action, entity: ent }) })
      }
      case 'POST /api/admin/logout':
        if (!isSameOrigin(req)) return send(res, 403, { error: 'forbidden' })
        destroySession(db, sid as string)
        audit(email, ip, 'logout', 'auth', null, 'Cierre de sesión')
        return send(res, 200, { ok: true }, { 'Set-Cookie': clearCookie(config.cookieSecure) })
      case 'POST /api/admin/password':
        return changePassword(req, res, email, sid as string, ip)
      case 'POST /api/admin/visits/delete':
        return deleteRoute(req, res, email, ip)
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
