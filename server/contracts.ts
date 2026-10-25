import { createHash, randomBytes } from 'node:crypto'
import type { DatabaseSync } from 'node:sqlite'
import { sha256 } from './auth.ts'
import { recordAudit } from './audit.ts'
import type { Config } from './config.ts'
import { documentBlocks, extractVars, fill, formatValue, missingVars } from './contract-text.ts'
import type { ContractLang } from './contract-text.ts'
import { validateTemplate } from './contracts-validate.ts'
import type {
  ClientInput, DocInput, DocKind, OwnerProfile, Strokes, TemplateInput, TemplateVar,
} from './contracts-validate.ts'
import { sendContractSignMail } from './mail.ts'
import { buildPdf } from './pdf.ts'
import { CONTRACT_SEEDS } from './seed/contracts/index.ts'

export type DocStatus = 'draft' | 'sent' | 'client_signed' | 'active' | 'expired' | 'cancelled'
export type Sig = { name: string; strokes: Strokes; ts: number; ip: string; ua: string; hash: string }
type DocData = { signatures: { owner?: Sig; client?: Sig }; message?: string; cancelReason?: string; varDefs: TemplateVar[] }
export type VarDef = TemplateVar & { auto?: true }

const DAY = 86_400_000
const BOGOTA_OFFSET = 5 * 3_600_000
const MAX_REMINDERS = 3
const SEED_FLAG = 'seeded:contract_templates'
const AUTO_LABELS: Record<string, string> = {
  cliente: 'Cliente', cliente_tipo_doc: 'Tipo de documento del cliente', cliente_documento: 'Documento del cliente',
  cliente_representante: 'Representante del cliente', cliente_email: 'Correo del cliente', cliente_telefono: 'Teléfono del cliente',
  cliente_direccion: 'Dirección del cliente', cliente_ciudad: 'Ciudad del cliente', prestador: 'Prestador',
  prestador_tipo_doc: 'Tipo de documento del prestador', prestador_documento: 'Documento del prestador',
  prestador_email: 'Correo del prestador', prestador_telefono: 'Teléfono del prestador', prestador_ciudad: 'Ciudad del prestador',
  fecha: 'Fecha', ciudad_firma: 'Ciudad de la firma', contrato_ref: 'Contrato de referencia',
}

const now0 = () => Date.now()
const parse = <T>(s: string): T => JSON.parse(s) as T
const bogotaDate = (ts: number) => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota' }).format(ts)
export const fmtDateTime = (ts: number, lang: ContractLang) =>
  new Intl.DateTimeFormat(lang === 'en' ? 'en-US' : 'es-CO', { dateStyle: 'long', timeStyle: 'medium', timeZone: 'America/Bogota' }).format(ts)

function transaction<T>(db: DatabaseSync, fn: () => T): T {
  db.exec('BEGIN IMMEDIATE')
  try {
    const out = fn()
    db.exec('COMMIT')
    return out
  } catch (err) {
    db.exec('ROLLBACK')
    throw err
  }
}

/* ---------------------------------- meta --------------------------------- */

function metaGet<T>(db: DatabaseSync, key: string): T | null {
  const row = db.prepare('SELECT value FROM meta WHERE key = ?').get(key) as { value: string } | undefined
  return row ? parse<T>(row.value) : null
}
const metaSet = (db: DatabaseSync, key: string, value: unknown) =>
  void db.prepare('INSERT INTO meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value').run(key, JSON.stringify(value))

const EMPTY_PROFILE: OwnerProfile = { name: '', docType: 'CC', docNumber: '', email: '', phone: '', address: '', city: '' }
export const ownerProfile = (db: DatabaseSync): OwnerProfile => ({ ...EMPTY_PROFILE, ...metaGet<Partial<OwnerProfile>>(db, 'contracts:owner') })
export const setOwnerProfile = (db: DatabaseSync, p: OwnerProfile) => metaSet(db, 'contracts:owner', p)
export const ownerSignature = (db: DatabaseSync): Strokes | null => metaGet<Strokes>(db, 'contracts:signature')
export const setOwnerSignature = (db: DatabaseSync, s: Strokes) => metaSet(db, 'contracts:signature', s)

/* --------------------------------- clients -------------------------------- */

type ClientRow = { id: number; name: string; status: 'active' | 'archived'; created_at: number; updated_at: number; data: string }
export type AdminClient = ClientInput & { id: number; status: 'active' | 'archived'; createdAt: number; updatedAt: number; docCounts: Record<string, number> }

const CLIENT_DEFAULTS: Omit<ClientInput, 'name'> = {
  legalName: '', docType: 'CC', docNumber: '', contactName: '', email: '', phone: '', address: '', city: '', country: 'Colombia',
  lang: 'es', notes: '', defaults: {},
}

function docCounts(db: DatabaseSync, clientId?: number): Map<number, Record<string, number>> {
  const rows = db
    .prepare(`SELECT client_id AS c, status AS s, COUNT(*) AS n FROM contracts ${clientId ? 'WHERE client_id = ?' : ''} GROUP BY client_id, status`)
    .all(...(clientId ? [clientId] : [])) as { c: number; s: string; n: number }[]
  const out = new Map<number, Record<string, number>>()
  for (const r of rows) out.set(r.c, { ...out.get(r.c), [r.s]: r.n })
  return out
}

const toClient = (r: ClientRow, counts: Record<string, number> = {}): AdminClient => ({
  ...CLIENT_DEFAULTS, ...parse<Partial<ClientInput>>(r.data), id: r.id, name: r.name, status: r.status,
  createdAt: r.created_at, updatedAt: r.updated_at, docCounts: counts,
})

export function listClients(db: DatabaseSync, status: 'all' | 'active' | 'archived', q: string): AdminClient[] {
  const rows = (status === 'all'
    ? db.prepare('SELECT * FROM clients ORDER BY name COLLATE NOCASE, id').all()
    : db.prepare('SELECT * FROM clients WHERE status = ? ORDER BY name COLLATE NOCASE, id').all(status)) as ClientRow[]
  const counts = docCounts(db)
  const needle = q.trim().toLowerCase()
  return rows
    .map((r) => toClient(r, counts.get(r.id)))
    .filter((c) => !needle || [c.name, c.legalName, c.docNumber, c.contactName, c.email].some((v) => v.toLowerCase().includes(needle)))
}

export function getClient(db: DatabaseSync, id: number): AdminClient | null {
  const row = db.prepare('SELECT * FROM clients WHERE id = ?').get(id) as ClientRow | undefined
  return row ? toClient(row, docCounts(db, id).get(id)) : null
}

const clientData = (input: ClientInput) => JSON.stringify({ ...input, name: undefined })

export function createClient(db: DatabaseSync, input: ClientInput, now = now0()): AdminClient {
  const row = db
    .prepare('INSERT INTO clients (name, status, created_at, updated_at, data) VALUES (?, ?, ?, ?, ?) RETURNING *')
    .get(input.name, 'active', now, now, clientData(input)) as ClientRow
  return toClient(row)
}

export function updateClient(db: DatabaseSync, id: number, input: ClientInput, now = now0()): AdminClient | null {
  const row = db
    .prepare('UPDATE clients SET name = ?, data = ?, updated_at = ? WHERE id = ? RETURNING *')
    .get(input.name, clientData(input), now, id) as ClientRow | undefined
  return row ? toClient(row, docCounts(db, id).get(id)) : null
}

export function setClientStatus(db: DatabaseSync, id: number, status: 'active' | 'archived', now = now0()): AdminClient | null {
  const row = db.prepare('UPDATE clients SET status = ?, updated_at = ? WHERE id = ? RETURNING *').get(status, now, id) as ClientRow | undefined
  return row ? toClient(row, docCounts(db, id).get(id)) : null
}

export function removeClient(db: DatabaseSync, id: number): 'ok' | 'not_found' | 'not_archived' | 'has_signed_docs' {
  return transaction(db, () => {
    const row = db.prepare('SELECT status FROM clients WHERE id = ?').get(id) as { status: string } | undefined
    if (!row) return 'not_found'
    if (row.status !== 'archived') return 'not_archived'
    const live = db
      .prepare("SELECT 1 AS x FROM contracts WHERE client_id = ? AND status IN ('sent', 'client_signed', 'active') LIMIT 1")
      .get(id)
    if (live) return 'has_signed_docs'
    db.prepare('DELETE FROM contract_versions WHERE contract_id IN (SELECT id FROM contracts WHERE client_id = ?)').run(id)
    db.prepare('DELETE FROM contracts WHERE client_id = ?').run(id)
    db.prepare('DELETE FROM clients WHERE id = ?').run(id)
    return 'ok'
  })
}

/* -------------------------------- templates -------------------------------- */

type TemplateRow = {
  id: number; kind: DocKind; lang: ContractLang; name: string; body: string; variables: string; seed_key: string | null
  created_at: number; updated_at: number
}
export type ContractTemplate = TemplateInput & { id: number; seedKey: string | null; createdAt: number; updatedAt: number }

const toTemplate = (r: TemplateRow): ContractTemplate => ({
  id: r.id, kind: r.kind, lang: r.lang, name: r.name, body: r.body, variables: parse<TemplateVar[]>(r.variables),
  seedKey: r.seed_key, createdAt: r.created_at, updatedAt: r.updated_at,
})

export function listTemplates(db: DatabaseSync, lang: ContractLang | null): ContractTemplate[] {
  const rows = (lang
    ? db.prepare('SELECT * FROM contract_templates WHERE lang = ? ORDER BY kind, name, id').all(lang)
    : db.prepare('SELECT * FROM contract_templates ORDER BY lang, kind, name, id').all()) as TemplateRow[]
  return rows.map(toTemplate)
}

export function getTemplate(db: DatabaseSync, id: number): ContractTemplate | null {
  const row = db.prepare('SELECT * FROM contract_templates WHERE id = ?').get(id) as TemplateRow | undefined
  return row ? toTemplate(row) : null
}

export function createTemplate(db: DatabaseSync, input: TemplateInput, seedKey: string | null = null, now = now0()): ContractTemplate {
  const row = db
    .prepare('INSERT INTO contract_templates (kind, lang, name, body, variables, seed_key, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?) RETURNING *')
    .get(input.kind, input.lang, input.name, input.body, JSON.stringify(input.variables), seedKey, now, now) as TemplateRow
  return toTemplate(row)
}

export function updateTemplate(db: DatabaseSync, id: number, input: TemplateInput, now = now0()): ContractTemplate | null {
  const row = db
    .prepare('UPDATE contract_templates SET kind = ?, lang = ?, name = ?, body = ?, variables = ?, updated_at = ? WHERE id = ? RETURNING *')
    .get(input.kind, input.lang, input.name, input.body, JSON.stringify(input.variables), now, id) as TemplateRow | undefined
  return row ? toTemplate(row) : null
}

export const removeTemplate = (db: DatabaseSync, id: number): boolean =>
  db.prepare('DELETE FROM contract_templates WHERE id = ?').run(id).changes > 0

export function restoreTemplate(db: DatabaseSync, id: number, now = now0()): ContractTemplate | 'not_found' | 'not_seeded' {
  const current = getTemplate(db, id)
  if (!current) return 'not_found'
  const seed = CONTRACT_SEEDS.find((s) => `${s.kind}:${s.lang}` === current.seedKey)
  return seed ? (updateTemplate(db, id, seed, now) as ContractTemplate) : 'not_seeded'
}

export function seedTemplates(db: DatabaseSync, now = now0()): void {
  if (db.prepare('SELECT 1 FROM meta WHERE key = ?').get(SEED_FLAG)) return
  transaction(db, () => {
    for (const seed of CONTRACT_SEEDS) {
      const checked = validateTemplate({ ...seed })
      if (!checked.ok) throw new Error(`Plantilla semilla inválida ${seed.kind}:${seed.lang}: ${JSON.stringify(checked.fields)}`)
      createTemplate(db, checked.value, `${seed.kind}:${seed.lang}`, now)
    }
    db.prepare('INSERT INTO meta (key, value) VALUES (?, ?)').run(SEED_FLAG, String(now))
  })
}

/* ---------------------------------- docs ---------------------------------- */

type DocRow = {
  id: number; client_id: number; parent_id: number | null; template_id: number | null; kind: DocKind; lang: ContractLang
  title: string; status: DocStatus; version: number; body: string; variables: string; content_hash: string | null
  token_hash: string | null; token_expires: number | null; sent_to: string | null; sent_at: number | null
  completed_at: number | null; expires_at: number | null; remind_days: number; last_reminder: number | null
  reminders_sent: number; has_pdf: number; data: string; created_at: number; updated_at: number
}
const COLS =
  'id, client_id, parent_id, template_id, kind, lang, title, status, version, body, variables, content_hash, token_hash, token_expires, sent_to, sent_at, completed_at, expires_at, remind_days, last_reminder, reminders_sent, pdf IS NOT NULL AS has_pdf, data, created_at, updated_at'

export const dataOf = (r: DocRow): DocData => ({ signatures: {}, varDefs: [], ...parse<Partial<DocData>>(r.data) })
const varsOf = (r: DocRow) => parse<Record<string, string>>(r.variables)
const isoOf = (ms: number | null) => (ms === null ? null : new Date(ms - BOGOTA_OFFSET).toISOString().slice(0, 10))
const endOfDay = (iso: string) => Date.parse(`${iso}T23:59:59-05:00`)

export const hashDoc = (d: { id: number; version: number; kind: string; lang: string; title: string; rendered: string }): string =>
  createHash('sha256').update(JSON.stringify({ id: d.id, version: d.version, kind: d.kind, lang: d.lang, title: d.title, rendered: d.rendered })).digest('hex')

export function getDocRow(db: DatabaseSync, id: number): DocRow | null {
  return (db.prepare(`SELECT ${COLS} FROM contracts WHERE id = ?`).get(id) as DocRow | undefined) ?? null
}

function varDefsOf(r: DocRow): VarDef[] {
  const declared = dataOf(r).varDefs
  const byKey = new Map(declared.map((v) => [v.key, v]))
  const keys = extractVars(r.body)
  const defs: VarDef[] = keys.map((key) => {
    const d = byKey.get(key)
    if (d) return d
    if (key in AUTO_LABELS) return { key, label: AUTO_LABELS[key] as string, type: key === 'fecha' ? 'date' : 'text', auto: true }
    return { key, label: key, type: 'text' }
  })
  for (const d of declared) if (!keys.includes(d.key)) defs.push(d)
  return defs
}

const typesOf = (defs: VarDef[]) => Object.fromEntries(defs.map((d) => [d.key, d.type]))

export function renderDoc(r: DocRow): string {
  return fill(r.body, varsOf(r), { types: typesOf(varDefsOf(r)), lang: r.lang })
}

type VersionRow = { version: number; content_hash: string; note: string | null; created_at: number; rendered: string; variables: string }
const versionsOf = (db: DatabaseSync, id: number) =>
  db.prepare('SELECT version, content_hash, note, created_at, rendered, variables FROM contract_versions WHERE contract_id = ? ORDER BY id DESC').all(id) as VersionRow[]

/** Lo firmado es la versión congelada al enviar, no el texto vivo del borrador. */
export function frozenRendered(db: DatabaseSync, r: DocRow): string {
  if (r.status === 'draft') return renderDoc(r)
  const v = db.prepare('SELECT rendered FROM contract_versions WHERE contract_id = ? ORDER BY id DESC LIMIT 1').get(r.id) as { rendered: string } | undefined
  return v?.rendered ?? renderDoc(r)
}

function listShape(r: DocRow, now: number) {
  const link = r.token_hash && r.token_expires !== null && r.status !== 'cancelled' && r.status !== 'draft' ? { expiresAt: r.token_expires, expired: r.token_expires <= now } : null
  const d = dataOf(r)
  return {
    id: r.id, clientId: r.client_id, parentId: r.parent_id, templateId: r.template_id, kind: r.kind, lang: r.lang, title: r.title,
    status: r.status, version: r.version, contentHash: r.content_hash, sentTo: r.sent_to, sentAt: r.sent_at,
    completedAt: r.completed_at, expiresAt: isoOf(r.expires_at), remindDays: r.remind_days, remindersSent: r.reminders_sent,
    hasPdf: r.has_pdf === 1, signed: { owner: Boolean(d.signatures.owner), client: Boolean(d.signatures.client) },
    link, createdAt: r.created_at, updatedAt: r.updated_at,
  }
}

export function listDocs(db: DatabaseSync, clientId: number, now = now0()) {
  const rows = db.prepare(`SELECT ${COLS} FROM contracts WHERE client_id = ? ORDER BY created_at, id`).all(clientId) as DocRow[]
  return rows.map((r) => ({
    ...listShape(r, now),
    children: rows.filter((c) => c.parent_id === r.id).map((c) => ({ id: c.id, kind: c.kind, title: c.title, status: c.status })),
  }))
}

export function docDetail(db: DatabaseSync, r: DocRow, now = now0()) {
  const d = dataOf(r)
  const defs = varDefsOf(r)
  const rendered = frozenRendered(db, r)
  const children = db.prepare('SELECT id, kind, title, status FROM contracts WHERE parent_id = ? ORDER BY id').all(r.id)
  return {
    ...listShape(r, now),
    body: r.body, variables: varsOf(r), varDefs: defs, rendered, blocks: documentBlocks(rendered), cover: coverOf(db, r), missing: missingVars(rendered),
    signatures: d.signatures, message: d.message ?? null, cancelReason: d.cancelReason ?? null,
    versions: versionsOf(db, r.id).map((v) => ({
      version: v.version, contentHash: v.content_hash, note: v.note, createdAt: v.created_at, rendered: v.rendered,
    })),
    children,
  }
}

const autoVars = (client: AdminClient, owner: OwnerProfile, parent: DocRow | null, now: number): Record<string, string> => ({
  cliente: client.legalName || client.name,
  cliente_tipo_doc: client.docType,
  cliente_documento: client.docNumber,
  cliente_representante: client.contactName,
  cliente_email: client.email,
  cliente_telefono: client.phone,
  cliente_direccion: client.address,
  cliente_ciudad: client.city,
  prestador: owner.name,
  prestador_tipo_doc: owner.docType,
  prestador_documento: owner.docNumber,
  prestador_email: owner.email,
  prestador_telefono: owner.phone,
  prestador_ciudad: owner.city,
  fecha: bogotaDate(now),
  ciudad_firma: owner.city || client.city,
  contrato_ref: parent ? `«${parent.title}» (documento n.º ${parent.id})` : '',
})

export function createDoc(
  db: DatabaseSync, clientId: number, input: { templateId: number; parentId: number | null; title: string | null }, now = now0(),
): DocRow | 'client_not_found' | 'template_not_found' | 'parent_invalid' {
  const client = getClient(db, clientId)
  if (!client) return 'client_not_found'
  const tpl = getTemplate(db, input.templateId)
  if (!tpl) return 'template_not_found'
  const parent = input.parentId === null ? null : getDocRow(db, input.parentId)
  if (input.parentId !== null && (!parent || parent.client_id !== clientId)) return 'parent_invalid'
  const fromTemplate = Object.fromEntries(tpl.variables.filter((v) => v.default !== undefined).map((v) => [v.key, v.default as string]))
  const auto = Object.fromEntries(Object.entries(autoVars(client, ownerProfile(db), parent, now)).filter(([, v]) => v !== ''))
  const variables = { ...fromTemplate, ...client.defaults, ...auto }
  const data: DocData = { signatures: {}, varDefs: tpl.variables }
  const row = db
    .prepare(
      `INSERT INTO contracts (client_id, parent_id, template_id, kind, lang, title, body, variables, data, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id`,
    )
    .get(clientId, parent?.id ?? null, tpl.id, tpl.kind, tpl.lang, input.title ?? tpl.name, tpl.body, JSON.stringify(variables), JSON.stringify(data), now, now) as { id: number }
  return getDocRow(db, row.id) as DocRow
}

export function updateDoc(db: DatabaseSync, id: number, input: DocInput, now = now0()): DocRow | 'not_found' | 'not_draft' {
  const current = getDocRow(db, id)
  if (!current) return 'not_found'
  if (current.status !== 'draft') return 'not_draft'
  db.prepare('UPDATE contracts SET title = ?, body = ?, variables = ?, remind_days = ?, expires_at = ?, updated_at = ? WHERE id = ?').run(
    input.title, input.body, JSON.stringify(input.variables), input.remindDays, input.expiresAt ? endOfDay(input.expiresAt) : null, now, id,
  )
  return getDocRow(db, id) as DocRow
}

export function removeDoc(db: DatabaseSync, id: number): 'ok' | 'not_found' | 'not_deletable' {
  return transaction(db, () => {
    const r = getDocRow(db, id)
    if (!r) return 'not_found'
    if (r.status !== 'draft' && r.status !== 'cancelled') return 'not_deletable'
    db.prepare('UPDATE contracts SET parent_id = NULL WHERE parent_id = ?').run(id)
    db.prepare('DELETE FROM contract_versions WHERE contract_id = ?').run(id)
    db.prepare('DELETE FROM contracts WHERE id = ?').run(id)
    return 'ok'
  })
}

const newToken = () => randomBytes(32).toString('base64url')

function writeData(db: DatabaseSync, id: number, data: DocData): void {
  db.prepare('UPDATE contracts SET data = ? WHERE id = ?').run(JSON.stringify(data), id)
}

export type Meta = { ip: string; ua: string }

export function sendDoc(
  db: DatabaseSync, id: number,
  o: { email: string; expiresInDays: number; message: string | null; remindDays: number; signature: Strokes | null; ownerName: string } & Meta,
  now = now0(),
): { token: string; doc: DocRow } | 'not_found' | 'not_draft' | 'missing_vars' {
  return transaction(db, () => {
    const r = getDocRow(db, id)
    if (!r) return 'not_found'
    if (r.status !== 'draft') return 'not_draft'
    const rendered = renderDoc(r)
    if (missingVars(rendered).length > 0) return 'missing_vars'
    const version = r.version + 1
    const hash = hashDoc({ id, version, kind: r.kind, lang: r.lang, title: r.title, rendered })
    const token = newToken()
    const data = dataOf(r)
    data.signatures = o.signature ? { owner: { name: o.ownerName, strokes: o.signature, ts: now, ip: o.ip, ua: o.ua, hash } } : {}
    if (o.message) data.message = o.message
    else delete data.message
    db.prepare('INSERT INTO contract_versions (contract_id, version, rendered, variables, content_hash, note, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)').run(
      id, version, rendered, r.variables, hash, null, now,
    )
    db.prepare(
      `UPDATE contracts SET status = 'sent', version = ?, content_hash = ?, token_hash = ?, token_expires = ?, sent_to = ?, sent_at = ?,
       remind_days = ?, last_reminder = NULL, reminders_sent = 0, data = ?, updated_at = ? WHERE id = ?`,
    ).run(version, hash, sha256(token), now + o.expiresInDays * DAY, o.email, now, o.remindDays, JSON.stringify(data), now, id)
    return { token, doc: getDocRow(db, id) as DocRow }
  })
}

export function resendDoc(
  db: DatabaseSync, id: number, o: { email: string | null; expiresInDays: number }, now = now0(),
): { token: string; doc: DocRow } | 'not_found' | 'not_sent' {
  const r = getDocRow(db, id)
  if (!r) return 'not_found'
  if (r.status !== 'sent') return 'not_sent'
  const token = newToken()
  db.prepare('UPDATE contracts SET token_hash = ?, token_expires = ?, sent_to = ?, last_reminder = NULL, reminders_sent = 0, updated_at = ? WHERE id = ?').run(
    sha256(token), now + o.expiresInDays * DAY, o.email ?? r.sent_to, now, id,
  )
  return { token, doc: getDocRow(db, id) as DocRow }
}

export function revokeDoc(db: DatabaseSync, id: number, note: string | null, now = now0()): DocRow | 'not_found' | 'not_revocable' {
  return transaction(db, () => {
    const r = getDocRow(db, id)
    if (!r) return 'not_found'
    if (r.status !== 'sent' && r.status !== 'client_signed') return 'not_revocable'
    const data = dataOf(r)
    data.signatures = {}
    db.prepare('INSERT INTO contract_versions (contract_id, version, rendered, variables, content_hash, note, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)').run(
      id, r.version, frozenRendered(db, r), r.variables, r.content_hash ?? '', note ?? 'Vuelto a borrador', now,
    )
    db.prepare("UPDATE contracts SET status = 'draft', token_expires = 0, pdf = NULL, completed_at = NULL, data = ?, updated_at = ? WHERE id = ?").run(
      JSON.stringify(data), now, id,
    )
    return getDocRow(db, id) as DocRow
  })
}

export function cancelDoc(db: DatabaseSync, id: number, reason: string | null, now = now0()): DocRow | 'not_found' | 'not_cancellable' {
  return transaction(db, () => {
    const r = getDocRow(db, id)
    if (!r) return 'not_found'
    if (r.status === 'expired' || r.status === 'cancelled') return 'not_cancellable'
    const data = dataOf(r)
    if (reason) data.cancelReason = reason
    db.prepare("UPDATE contracts SET status = 'cancelled', data = ?, updated_at = ? WHERE id = ?").run(JSON.stringify(data), now, id)
    return getDocRow(db, id) as DocRow
  })
}

export function ownerSign(
  db: DatabaseSync, id: number, o: { strokes: Strokes; ownerName: string } & Meta, now = now0(),
): DocRow | 'not_found' | 'not_client_signed' {
  return transaction(db, () => {
    const r = getDocRow(db, id)
    if (!r) return 'not_found'
    if (r.status !== 'client_signed') return 'not_client_signed'
    const data = dataOf(r)
    data.signatures.owner = { name: o.ownerName, strokes: o.strokes, ts: now, ip: o.ip, ua: o.ua, hash: r.content_hash as string }
    writeData(db, id, data)
    return activate(db, id, now)
  })
}

function activate(db: DatabaseSync, id: number, now: number): DocRow {
  db.prepare("UPDATE contracts SET status = 'active', completed_at = ?, updated_at = ? WHERE id = ?").run(now, now, id)
  const pdf = buildDocPdf(db, getDocRow(db, id) as DocRow)
  db.prepare('UPDATE contracts SET pdf = ? WHERE id = ?').run(pdf, id)
  return getDocRow(db, id) as DocRow
}

export function findByToken(db: DatabaseSync, token: string): DocRow | null {
  return (db.prepare(`SELECT ${COLS} FROM contracts WHERE token_hash = ?`).get(sha256(token)) as DocRow | undefined) ?? null
}

export function clientSign(
  db: DatabaseSync, token: string, o: { name: string; strokes: Strokes } & Meta, now = now0(),
): DocRow | 'not_found' | 'expired' | 'already_signed' | 'cancelled' {
  return transaction(db, () => {
    const r = findByToken(db, token)
    if (!r) return 'not_found'
    if (r.status === 'client_signed' || r.status === 'active') return 'already_signed'
    if (r.status === 'cancelled') return 'cancelled'
    if (r.status !== 'sent' || (r.token_expires ?? 0) <= now) return 'expired'
    const data = dataOf(r)
    data.signatures.client = { name: o.name, strokes: o.strokes, ts: now, ip: o.ip, ua: o.ua, hash: r.content_hash as string }
    const row = db
      .prepare("UPDATE contracts SET status = 'client_signed', data = ?, updated_at = ? WHERE token_hash = ? AND status = 'sent' AND token_expires > ? RETURNING id")
      .get(JSON.stringify(data), now, sha256(token), now) as { id: number } | undefined
    if (!row) return 'expired'
    return data.signatures.owner ? activate(db, r.id, now) : (getDocRow(db, r.id) as DocRow)
  })
}

export function docPdf(db: DatabaseSync, id: number): Buffer | null {
  const r = db.prepare('SELECT pdf FROM contracts WHERE id = ?').get(id) as { pdf: Uint8Array | null } | undefined
  if (!r) return null
  if (r.pdf) return Buffer.from(r.pdf)
  const row = getDocRow(db, id)
  return row ? buildDocPdf(db, row) : null
}

const KIND_LABELS: Record<ContractLang, Record<DocKind, string>> = {
  es: {
    services: 'Prestación de servicios', sow: 'Propuesta y alcance', sla: 'Nivel de servicio y soporte', nda: 'Confidencialidad',
    acceptance: 'Entrega y aceptación', change_order: 'Orden de cambio', retainer: 'Mantenimiento mensual', data_processing: 'Tratamiento de datos personales',
  },
  en: {
    services: 'Services agreement', sow: 'Statement of work', sla: 'Service level agreement', nda: 'Confidentiality', acceptance: 'Delivery and acceptance',
    change_order: 'Change order', retainer: 'Monthly retainer', data_processing: 'Personal data processing',
  },
}

export function coverOf(db: DatabaseSync, r: DocRow) {
  const owner = ownerProfile(db)
  const client = getClient(db, r.client_id)
  return {
    ownerName: owner.name, ownerEmail: owner.email, ownerPhone: owner.phone, ownerCity: owner.city,
    clientName: client?.legalName || client?.name || '',
    date: formatValue(bogotaDate(r.sent_at ?? r.created_at), 'date', r.lang),
    ref: `#${r.id} · v${r.version}`,
    subtitle: KIND_LABELS[r.lang][r.kind],
  }
}

export function signView(db: DatabaseSync, r: DocRow) {
  const d = dataOf(r)
  const client = getClient(db, r.client_id)
  return {
    status: r.status, title: r.title, lang: r.lang, kind: r.kind, blocks: documentBlocks(frozenRendered(db, r)), cover: coverOf(db, r),
    clientName: client?.legalName || client?.name || '', contactName: client?.contactName ?? '',
    ownerName: d.signatures.owner?.name || ownerProfile(db).name, ownerSignature: d.signatures.owner?.strokes ?? null,
    clientSigned: d.signatures.client ? { name: d.signatures.client.name, ts: d.signatures.client.ts } : null,
    expiresAt: r.token_expires, hash: r.content_hash,
  }
}

/* ----------------------------------- PDF ----------------------------------- */

const T = {
  es: {
    owner: 'EL PRESTADOR', client: 'EL CLIENTE', signedOn: 'Firmado el', pending: 'Pendiente de firma', heading: 'Registro de firma electrónica',
    doc: 'Documento', hash: 'Huella SHA-256 del contenido', party: 'Firmante', when: 'Fecha y hora (America/Bogota)', ip: 'Dirección IP',
    ua: 'Agente de usuario', consent: 'Consentimiento', page: 'Página {page} de {pages}', version: 'versión',
    consentClient: 'El firmante declaró haber leído el documento y aceptó firmarlo electrónicamente; esta firma tiene los efectos de la Ley 527 de 1999.',
    consentOwner: 'Firma electrónica aplicada por su titular, con los efectos de la Ley 527 de 1999 y el Decreto 2364 de 2012.',
    header: 'Contrato', signatures: 'Firmas de las partes', clientLabel: 'Cliente', ownerLabels: ['Prestador', 'Teléfono', 'Correo', 'Ciudad'],
    tagline: 'Documento sujeto a firma electrónica conforme a la Ley 527 de 1999.', thanks: 'Gracias',
    marks: { draft: 'BORRADOR', pending: 'PENDIENTE DE FIRMA', cancelled: 'CANCELADO' },
  },
  en: {
    owner: 'THE PROVIDER', client: 'THE CLIENT', signedOn: 'Signed on', pending: 'Pending signature', heading: 'Electronic signature record',
    doc: 'Document', hash: 'SHA-256 content fingerprint', party: 'Signer', when: 'Date and time (America/Bogota)', ip: 'IP address',
    ua: 'User agent', consent: 'Consent', page: 'Page {page} of {pages}', version: 'version',
    consentClient: 'The signer stated having read the document and agreed to sign it electronically; this signature has the effects of Colombian Law 527 of 1999.',
    consentOwner: 'Electronic signature applied by its holder, with the effects of Colombian Law 527 of 1999 and Decree 2364 of 2012.',
    header: 'Contract', signatures: 'Signatures of the parties', clientLabel: 'Client', ownerLabels: ['Provider', 'Phone', 'Email', 'City'],
    tagline: 'Document subject to electronic signature under Colombian Law 527 of 1999.', thanks: 'Thank you',
    marks: { draft: 'DRAFT', pending: 'PENDING SIGNATURE', cancelled: 'CANCELLED' },
  },
} as const

export function evidenceRows(r: DocRow, lang: ContractLang): [string, string][] {
  const t = T[lang]
  const d = dataOf(r)
  const rows: [string, string][] = [[t.doc, `#${r.id} · ${t.version} ${r.version}`], [t.hash, r.content_hash ?? '']]
  for (const [who, sig] of [[t.owner, d.signatures.owner], [t.client, d.signatures.client]] as const) {
    if (!sig) continue
    rows.push(
      [`${t.party} · ${who}`, sig.name], [t.when, fmtDateTime(sig.ts, lang)], [t.ip, sig.ip], [t.ua, sig.ua || '—'],
      [t.consent, who === t.owner ? t.consentOwner : t.consentClient],
    )
  }
  return rows
}

function buildDocPdf(db: DatabaseSync, r: DocRow): Buffer {
  const t = T[r.lang]
  const d = dataOf(r)
  const client = getClient(db, r.client_id)
  const owner = ownerProfile(db)
  const cover = coverOf(db, r)
  const rendered = frozenRendered(db, r)
  const hash = r.content_hash ?? hashDoc({ id: r.id, version: r.version, kind: r.kind, lang: r.lang, title: r.title, rendered })
  const mark = r.status === 'draft' ? t.marks.draft : r.status === 'cancelled' ? t.marks.cancelled : r.status === 'sent' || r.status === 'client_signed' ? t.marks.pending : undefined
  const line = (sig: Sig | undefined) => (sig ? fmtDateTime(sig.ts, r.lang) : t.pending)
  const hasSigs = Boolean(d.signatures.owner || d.signatures.client)
  const complete = r.status === 'active' || r.status === 'expired'
  return buildPdf({
    title: r.title,
    headerLabel: t.header,
    cover: {
      date: cover.date, subtitle: cover.subtitle, clientLabel: t.clientLabel, clientName: cover.clientName, tagline: t.tagline,
      owner: { name: owner.name, phone: owner.phone, email: owner.email, city: owner.city }, ownerLabels: [...t.ownerLabels],
    },
    blocks: documentBlocks(rendered),
    ref: cover.ref,
    hash,
    pageLabel: t.page,
    ...(mark ? { watermark: mark } : {}),
    signaturesHeading: t.signatures,
    signatures: [
      { label: t.owner, name: d.signatures.owner?.name ?? owner.name, docLine: `${owner.docType} ${owner.docNumber}`.trim(), dateLine: line(d.signatures.owner), strokes: d.signatures.owner?.strokes ?? null },
      {
        label: t.client, name: d.signatures.client?.name ?? (client?.legalName || client?.name || ''),
        docLine: client ? `${client.docType} ${client.docNumber}`.trim() : '', dateLine: line(d.signatures.client), strokes: d.signatures.client?.strokes ?? null,
      },
    ],
    ...(hasSigs ? { evidence: { heading: t.heading, rows: evidenceRows(r, r.lang) } } : {}),
    ...(complete ? { thanks: { heading: t.thanks, lines: [owner.name, owner.phone, owner.email, owner.city].filter(Boolean) } } : {}),
  })
}

/* ----------------------------------- jobs ----------------------------------- */

/** Vence contratos activos y reenvía recordatorios; cada recordatorio rota el enlace porque solo guardamos el hash del token. */
export async function tick(db: DatabaseSync, config: Config, now = now0()): Promise<void> {
  const expired = db
    .prepare("UPDATE contracts SET status = 'expired', updated_at = ? WHERE status = 'active' AND expires_at IS NOT NULL AND expires_at < ? RETURNING id, title")
    .all(now, now) as { id: number; title: string }[]
  for (const e of expired) recordAudit(db, { email: null, ip: 'system', action: 'expire', entity: 'contracts', entityId: e.id, summary: `Venció «${e.title}»` }, now)

  const due = db
    .prepare(
      `SELECT ${COLS} FROM contracts WHERE status = 'sent' AND remind_days > 0 AND token_expires > ? AND reminders_sent < ?
       AND COALESCE(last_reminder, sent_at) + remind_days * ? <= ?`,
    )
    .all(now, MAX_REMINDERS, DAY, now) as DocRow[]
  for (const r of due) {
    const token = newToken()
    db.prepare('UPDATE contracts SET token_hash = ?, last_reminder = ?, reminders_sent = reminders_sent + 1 WHERE id = ?').run(sha256(token), now, r.id)
    const client = getClient(db, r.client_id)
    recordAudit(db, { email: null, ip: 'system', action: 'remind', entity: 'contracts', entityId: r.id, summary: `Recordatorio ${r.reminders_sent + 1} de «${r.title}» a ${r.sent_to}` }, now)
    await sendContractSignMail(config, {
      to: r.sent_to as string, lang: r.lang, link: `${config.publicUrl}/firmar/${token}`,
      days: Math.max(1, Math.ceil(((r.token_expires as number) - now) / DAY)), docTitle: r.title,
      ownerName: ownerProfile(db).name || 'Stiven Colorado', clientName: client?.contactName || client?.name || '',
      message: dataOf(r).message ?? null, reminder: true,
    }).catch((err: unknown) => console.error('[mail]', (err as Error).message))
  }
}
