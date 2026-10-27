import type { IncomingMessage, ServerResponse } from 'node:http'
import type { DatabaseSync } from 'node:sqlite'
import { isSameOrigin, readJson, send } from './http.ts'
import { reader } from './validate.ts'
import type { Fields, Result } from './validate.ts'

export const PROSPECT_STATUSES = ['new', 'contacted', 'replied', 'meeting', 'proposal', 'won', 'lost'] as const
export type ProspectStatus = (typeof PROSPECT_STATUSES)[number]

export type ProspectInput = {
  business: string; owner: string; phones: string[]; emails: string[]; websites: string[]; sourceLinks: string[]; source: string
}
export type Prospect = ProspectInput & {
  id: number; status: ProspectStatus; lastContactAt: number | null; createdAt: number; updatedAt: number; noteCount: number
}
export type ProspectNote = { id: number; text: string; ts: number }

type Row = {
  id: number; business: string; status: ProspectStatus; last_contact: number | null
  created_at: number; updated_at: number; data: string; note_count?: number
}
type Audit = (email: string | null, ip: string, action: string, entity: string | null, entityId: number | null, summary: string) => void

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE = /^\+?[0-9][0-9\s().-]{5,28}$/
const ID = /^\d{1,10}$/
const MAX_BODY = 16 * 1024
const short = (s: string, n = 80) => (s.length > n ? `${s.slice(0, n - 1)}…` : s)

function strings(r: ReturnType<typeof reader>, body: Record<string, unknown>, key: string, max: number, maxLen: number, norm: (v: string) => string | null, message: string): string[] {
  const v = body[key]
  if (v === undefined) return []
  if (!Array.isArray(v) || v.length > max) return r.fail(key, `Máximo ${max} elementos`), []
  const out: string[] = []
  for (const item of v) {
    const t = typeof item === 'string' ? item.trim() : ''
    if (t === '') continue
    const n = t.length <= maxLen ? norm(t) : null
    if (n === null) return r.fail(key, message), []
    if (!out.includes(n)) out.push(n)
  }
  return out
}

export function validateProspect(body: Record<string, unknown>): Result<ProspectInput> {
  const r = reader(body, ['business', 'owner', 'phones', 'emails', 'websites', 'sourceLinks', 'source'])
  const business = r.text('business', 120)
  const owner = r.text('owner', 120, false)
  const source = r.text('source', 120, false)
  const phones = strings(r, body, 'phones', 5, 30, (v) => (PHONE.test(v) ? v : null), 'Teléfono inválido')
  const emails = strings(r, body, 'emails', 5, 254, (v) => (EMAIL.test(v) ? v.toLowerCase() : null), 'Correo inválido')
  const link = (v: string) => {
    const url = /^https?:\/\//i.test(v) ? v : `https://${v}`
    return /^https?:\/\/[^\s/]+\.[^\s/]+\S*$/i.test(url) ? url : null
  }
  const websites = strings(r, body, 'websites', 5, 300, link, 'Enlace inválido')
  const sourceLinks = strings(r, body, 'sourceLinks', 8, 500, link, 'Enlace inválido')
  const fields: Fields = r.fields
  return Object.keys(fields).length > 0 ? { ok: false, fields } : { ok: true, value: { business, owner, phones, emails, websites, sourceLinks, source } }
}

function toProspect(row: Row): Prospect {
  const d = JSON.parse(row.data) as Partial<ProspectInput>
  return {
    id: row.id, business: row.business, status: row.status, owner: d.owner ?? '', phones: d.phones ?? [], emails: d.emails ?? [],
    websites: d.websites ?? [], sourceLinks: d.sourceLinks ?? [], source: d.source ?? '', lastContactAt: row.last_contact, createdAt: row.created_at,
    updatedAt: row.updated_at, noteCount: row.note_count ?? 0,
  }
}

const dataOf = (i: ProspectInput) => JSON.stringify({ owner: i.owner, phones: i.phones, emails: i.emails, websites: i.websites, sourceLinks: i.sourceLinks, source: i.source })
const SELECT = 'SELECT p.*, (SELECT COUNT(*) FROM prospect_notes n WHERE n.prospect_id = p.id) AS note_count FROM prospects p'

export function listProspects(db: DatabaseSync, status: string, q: string): Prospect[] {
  const rows = (status === 'all'
    ? db.prepare(`${SELECT} ORDER BY updated_at DESC, id DESC`).all()
    : db.prepare(`${SELECT} WHERE status = ? ORDER BY updated_at DESC, id DESC`).all(status)) as Row[]
  const needle = q.trim().toLowerCase()
  return rows
    .map(toProspect)
    .filter((p) => !needle || [p.business, p.owner, p.source, ...p.phones, ...p.emails, ...p.websites].some((v) => v.toLowerCase().includes(needle)))
}

export function getProspect(db: DatabaseSync, id: number): Prospect | null {
  const row = db.prepare(`${SELECT} WHERE p.id = ?`).get(id) as Row | undefined
  return row ? toProspect(row) : null
}

export function listNotes(db: DatabaseSync, id: number): ProspectNote[] {
  return db.prepare('SELECT id, text, ts FROM prospect_notes WHERE prospect_id = ? ORDER BY ts DESC, id DESC').all(id) as ProspectNote[]
}

export function createProspect(db: DatabaseSync, input: ProspectInput, now = Date.now()): Prospect {
  const row = db
    .prepare('INSERT INTO prospects (business, status, created_at, updated_at, data) VALUES (?, ?, ?, ?, ?) RETURNING id')
    .get(input.business, 'new', now, now, dataOf(input)) as { id: number }
  return getProspect(db, row.id) as Prospect
}

export function updateProspect(db: DatabaseSync, id: number, input: ProspectInput, now = Date.now()): Prospect | null {
  db.prepare('UPDATE prospects SET business = ?, data = ?, updated_at = ? WHERE id = ?').run(input.business, dataOf(input), now, id)
  return getProspect(db, id)
}

export function setProspectStatus(db: DatabaseSync, id: number, status: ProspectStatus, now = Date.now()): Prospect | null {
  db.prepare("UPDATE prospects SET status = ?1, updated_at = ?2, last_contact = CASE WHEN ?1 = 'contacted' THEN ?2 ELSE last_contact END WHERE id = ?3")
    .run(status, now, id)
  return getProspect(db, id)
}

export function addNote(db: DatabaseSync, id: number, text: string, now = Date.now()): ProspectNote | null {
  if (!getProspect(db, id)) return null
  const note = db.prepare('INSERT INTO prospect_notes (prospect_id, text, ts) VALUES (?, ?, ?) RETURNING id, text, ts').get(id, text, now) as ProspectNote
  db.prepare('UPDATE prospects SET updated_at = ? WHERE id = ?').run(now, id)
  return note
}

export function removeNote(db: DatabaseSync, id: number, noteId: number): boolean {
  return db.prepare('DELETE FROM prospect_notes WHERE id = ? AND prospect_id = ?').run(noteId, id).changes > 0
}

export function removeProspect(db: DatabaseSync, id: number): boolean {
  db.prepare('DELETE FROM prospect_notes WHERE prospect_id = ?').run(id)
  return db.prepare('DELETE FROM prospects WHERE id = ?').run(id).changes > 0
}

export function createProspectRoutes(db: DatabaseSync, audit: Audit) {
  const invalid = (res: ServerResponse, fields: Fields) => send(res, 400, { error: 'invalid', fields })
  const notFound = (res: ServerResponse) => send(res, 404, { error: 'not_found' })

  async function parsed<T>(req: IncomingMessage, res: ServerResponse, validate: (b: Record<string, unknown>) => Result<T>): Promise<T | undefined> {
    const b = await readJson(req, MAX_BODY)
    if (b.tooBig) return send(res, 413, { error: 'payload_too_large' }), undefined
    if (!b.json) return invalid(res, { _: 'JSON inválido' }), undefined
    const r = validate(b.json)
    return r.ok ? r.value : (invalid(res, r.fields), undefined)
  }

  const validateStatus = (b: Record<string, unknown>): Result<ProspectStatus> => {
    const r = reader(b, ['status'])
    const value = r.oneOf('status', PROSPECT_STATUSES)
    return Object.keys(r.fields).length > 0 ? { ok: false, fields: r.fields } : { ok: true, value }
  }
  const validateNote = (b: Record<string, unknown>): Result<string> => {
    const r = reader(b, ['text'])
    const value = r.text('text', 2000)
    return Object.keys(r.fields).length > 0 ? { ok: false, fields: r.fields } : { ok: true, value }
  }

  return async function handle(req: IncomingMessage, res: ServerResponse, email: string, ip: string, url: URL): Promise<void> {
    if (req.method !== 'GET' && !isSameOrigin(req)) {
      req.resume()
      return send(res, 403, { error: 'forbidden' })
    }
    const [idRaw, sub, subId] = url.pathname.replace(/^\/api\/admin\/prospects\/?/, '').split('/').filter(Boolean)
    const m = req.method
    if (!idRaw) {
      if (m === 'GET') {
        const status = url.searchParams.get('status') ?? 'all'
        if (status !== 'all' && !(PROSPECT_STATUSES as readonly string[]).includes(status)) return send(res, 400, { error: 'invalid_request' })
        return send(res, 200, { items: listProspects(db, status, (url.searchParams.get('q') ?? '').slice(0, 100)) })
      }
      if (m === 'POST') {
        const input = await parsed(req, res, validateProspect)
        if (!input) return
        const item = createProspect(db, input)
        audit(email, ip, 'create', 'prospects', item.id, `Creó el prospecto «${short(item.business)}»`)
        return send(res, 201, { item })
      }
      return notFound(res)
    }
    if (!ID.test(idRaw)) return notFound(res)
    const id = Number(idRaw)
    const current = getProspect(db, id)
    if (!current) return notFound(res)

    if (!sub) {
      if (m === 'GET') return send(res, 200, { item: current, notes: listNotes(db, id) })
      if (m === 'PUT') {
        const input = await parsed(req, res, validateProspect)
        if (!input) return
        audit(email, ip, 'update', 'prospects', id, `Editó el prospecto «${short(input.business)}»`)
        return send(res, 200, { item: updateProspect(db, id, input) })
      }
      if (m === 'DELETE') {
        removeProspect(db, id)
        audit(email, ip, 'delete', 'prospects', id, `Eliminó el prospecto «${short(current.business)}»`)
        return send(res, 204)
      }
      return notFound(res)
    }
    if (sub === 'status' && m === 'POST') {
      const status = await parsed(req, res, validateStatus)
      if (!status) return
      audit(email, ip, 'status', 'prospects', id, `Movió el prospecto «${short(current.business)}» a ${status}`)
      return send(res, 200, { item: setProspectStatus(db, id, status) })
    }
    if (sub === 'notes' && m === 'POST' && !subId) {
      const text = await parsed(req, res, validateNote)
      if (!text) return
      audit(email, ip, 'create', 'prospects', id, `Anotó en el prospecto «${short(current.business)}»`)
      return send(res, 201, { note: addNote(db, id, text) })
    }
    if (sub === 'notes' && m === 'DELETE' && subId && ID.test(subId)) {
      if (!removeNote(db, id, Number(subId))) return notFound(res)
      audit(email, ip, 'delete', 'prospects', id, `Borró una anotación de «${short(current.business)}»`)
      return send(res, 204)
    }
    return notFound(res)
  }
}
