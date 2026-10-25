import type { ClientField, ContractLang, VarType } from './contract-text.ts'
import { reader } from './validate.ts'
import type { Fields, Result } from './validate.ts'

export const DOC_KINDS = ['services', 'sow', 'sla', 'nda', 'acceptance', 'change_order', 'retainer', 'data_processing'] as const
export type DocKind = (typeof DOC_KINDS)[number]
export const LANGS: readonly ContractLang[] = ['es', 'en']
export const DOC_TYPES = ['CC', 'NIT', 'CE', 'PAS'] as const
export type DocType = (typeof DOC_TYPES)[number]
export const VAR_TYPES: readonly VarType[] = ['text', 'textarea', 'number', 'money', 'date']

export type Strokes = { w: number; h: number; strokes: number[][] }
export type TemplateVar = { key: string; label: string; type: VarType; required?: boolean; default?: string }
export type ClientInput = {
  name: string; legalName: string; docType: DocType; docNumber: string; contactName: string; email: string; phone: string
  address: string; city: string; country: string; lang: ContractLang; notes: string; defaults: Record<string, string>
}
export type TemplateInput = { kind: DocKind; lang: ContractLang; name: string; body: string; variables: TemplateVar[] }
export type DocInput = { title: string; body: string; variables: Record<string, string>; remindDays: number; expiresAt: string | null }
export type NewDocInput = { templateId: number; parentId: number | null; title: string | null }
export type SendInput = {
  email: string; expiresInDays: number; message: string | null; remindDays: number; signature: Strokes | null; useSaved: boolean
}
export type ResendInput = { email: string | null; expiresInDays: number }
export type OwnerSignInput = { signature: Strokes | null; useSaved: boolean }
export type ClientData = Partial<Record<Exclude<ClientField, 'docType'>, string>> & { docType?: DocType }
export type ClientSignInput = { name: string; accepted: true; strokes: Strokes; clientData: ClientData }
export type OwnerProfile = {
  name: string; docType: DocType; docNumber: string; email: string; phone: string; address: string; city: string
}

const KEY = /^[a-z][a-z0-9_]*$/
const DOC_NUMBER = /^[0-9A-Za-z.-]+$/
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const DOC_NUMBER_SIGN = /^[0-9A-Za-z][0-9A-Za-z.-]{3,29}$/
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

type R = ReturnType<typeof reader>

function done<T>(fields: Fields, value: T): Result<T> {
  return Object.keys(fields).length > 0 ? { ok: false, fields } : { ok: true, value }
}

function int(r: R, body: Record<string, unknown>, key: string, min: number, max: number, fallback: number | null): number {
  const v = body[key]
  if (v === undefined && fallback !== null) return fallback
  if (typeof v !== 'number' || !Number.isInteger(v) || v < min || v > max) return r.fail(key, `Entero entre ${min} y ${max}`), min
  return v
}

function email(r: R, body: Record<string, unknown>, key: string, required: boolean): string {
  const v = body[key]
  if (v === undefined || v === null || v === '') return required ? (r.fail(key, 'Obligatorio'), '') : ''
  if (typeof v !== 'string' || v.trim().length > 254 || !EMAIL.test(v.trim())) return r.fail(key, 'Correo inválido'), ''
  return v.trim().toLowerCase()
}

/** El celular es el único dato de contacto obligatorio: el resto del cliente lo completa él mismo al firmar. */
function phone(r: R): string {
  const v = r.text('phone', 30)
  if (v !== '' && v.replace(/\D/g, '').length < 7) r.fail('phone', 'Celular inválido')
  return v
}

function docNumber(r: R, body: Record<string, unknown>, required: boolean): string {
  const v = body.docNumber
  if (v === undefined || v === null || v === '') return required ? (r.fail('docNumber', 'Obligatorio'), '') : ''
  if (typeof v !== 'string' || v.trim().length > 30 || !DOC_NUMBER.test(v.trim())) return r.fail('docNumber', 'Solo letras, números, punto y guion (máx. 30)'), ''
  return v.trim()
}

/** Redondea a enteros: los eventos de puntero traen decimales y el PDF no necesita esa precisión. */
export function parseStrokes(v: unknown): Strokes | string {
  if (typeof v !== 'object' || v === null || Array.isArray(v)) return 'Firma inválida'
  const o = v as Record<string, unknown>
  if (Object.keys(o).some((k) => k !== 'w' && k !== 'h' && k !== 'strokes')) return 'Firma inválida'
  const { w, h, strokes } = o
  const dim = (n: unknown): n is number => typeof n === 'number' && Number.isInteger(n) && n >= 50 && n <= 2000
  if (!dim(w) || !dim(h)) return 'Dimensiones de firma inválidas (50 a 2000)'
  if (!Array.isArray(strokes) || strokes.length === 0 || strokes.length > 200) return 'Entre 1 y 200 trazos'
  let points = 0
  let longest = 0
  const out: number[][] = []
  for (const s of strokes) {
    if (!Array.isArray(s) || s.length < 2 || s.length % 2 !== 0) return 'Trazo inválido'
    const flat: number[] = []
    for (let i = 0; i < s.length; i++) {
      const n: unknown = s[i]
      const limit = i % 2 === 0 ? w : h
      if (typeof n !== 'number' || !Number.isFinite(n) || n < 0 || n > limit) return 'Punto fuera del área de firma'
      flat.push(Math.round(n))
    }
    points += flat.length / 2
    if (points > 5000) return 'Demasiados puntos (máx. 5000)'
    let len = 0
    for (let i = 2; i < flat.length; i += 2) len += Math.hypot((flat[i] as number) - (flat[i - 2] as number), (flat[i + 1] as number) - (flat[i - 1] as number))
    longest += len
    out.push(flat)
  }
  if (longest <= 40) return 'La firma es demasiado corta'
  return { w, h, strokes: out }
}

function strokes(r: R, body: Record<string, unknown>, key: string, optional: boolean): Strokes | null {
  const v = body[key]
  if (v === undefined || v === null) return optional ? null : (r.fail(key, 'Obligatorio'), null)
  const parsed = parseStrokes(v)
  return typeof parsed === 'string' ? (r.fail(key, parsed), null) : parsed
}

function varsMap(r: R, body: Record<string, unknown>, key: string, maxKeys: number): Record<string, string> {
  const v = body[key]
  if (v === undefined) return {}
  if (typeof v !== 'object' || v === null || Array.isArray(v)) return r.fail(key, 'Debe ser un objeto'), {}
  const entries = Object.entries(v)
  if (entries.length > maxKeys) return r.fail(key, `Máximo ${maxKeys} claves`), {}
  const out: Record<string, string> = {}
  for (const [k, val] of entries) {
    if (!KEY.test(k) || k.length > 40) r.fail(key, `Clave inválida: ${k.slice(0, 40)}`)
    else if (typeof val !== 'string') r.fail(key, `${k}: debe ser texto`)
    else if (val.length > 5000) r.fail(key, `${k}: máximo 5000 caracteres`)
    else out[k] = val
  }
  return out
}

export function validateClient(body: Record<string, unknown>): Result<ClientInput> {
  const r = reader(body, ['name', 'legalName', 'docType', 'docNumber', 'contactName', 'email', 'phone', 'address', 'city', 'country', 'lang', 'notes', 'defaults'])
  const value: ClientInput = {
    name: r.text('name', 120),
    legalName: r.text('legalName', 160, false),
    docType: body.docType === undefined ? 'CC' : r.oneOf('docType', DOC_TYPES),
    docNumber: docNumber(r, body, false),
    contactName: r.text('contactName', 120, false),
    email: email(r, body, 'email', false),
    phone: phone(r),
    address: r.text('address', 200, false),
    city: r.text('city', 80, false),
    country: body.country === undefined ? 'Colombia' : r.text('country', 60, false),
    lang: body.lang === undefined ? 'es' : r.oneOf('lang', LANGS),
    notes: r.text('notes', 2000, false),
    defaults: varsMap(r, body, 'defaults', 40),
  }
  return done(r.fields, value)
}

export function validateClientStatus(body: Record<string, unknown>): Result<'active' | 'archived'> {
  const r = reader(body, ['status'])
  return done(r.fields, r.oneOf('status', ['active', 'archived'] as const))
}

function templateVars(r: R, body: Record<string, unknown>): TemplateVar[] {
  const v = body.variables
  if (v === undefined) return []
  if (!Array.isArray(v) || v.length > 40) return r.fail('variables', 'Lista de hasta 40 variables'), []
  const seen = new Set<string>()
  const out: TemplateVar[] = []
  v.forEach((item: unknown, i) => {
    const o = typeof item === 'object' && item !== null && !Array.isArray(item) ? (item as Record<string, unknown>) : null
    const err = (m: string) => r.fail('variables', `Variable ${i + 1}: ${m}`)
    if (!o || Object.keys(o).some((k) => !['key', 'label', 'type', 'required', 'default'].includes(k))) return err('formato inválido')
    if (typeof o.key !== 'string' || !KEY.test(o.key) || o.key.length > 40) return err('clave inválida')
    if (seen.has(o.key)) return err('clave repetida')
    if (typeof o.label !== 'string' || o.label.trim() === '' || o.label.length > 80) return err('etiqueta obligatoria (máx. 80)')
    if (typeof o.type !== 'string' || !(VAR_TYPES as readonly string[]).includes(o.type)) return err('tipo inválido')
    if (o.required !== undefined && typeof o.required !== 'boolean') return err('required debe ser booleano')
    if (o.default !== undefined && (typeof o.default !== 'string' || o.default.length > 5000)) return err('valor por defecto inválido')
    seen.add(o.key)
    out.push({
      key: o.key, label: o.label.trim(), type: o.type as VarType,
      ...(o.required === true ? { required: true } : {}), ...(typeof o.default === 'string' && o.default !== '' ? { default: o.default } : {}),
    })
  })
  return out
}

export function validateTemplate(body: Record<string, unknown>): Result<TemplateInput> {
  const r = reader(body, ['kind', 'lang', 'name', 'body', 'variables'])
  const value: TemplateInput = {
    kind: r.oneOf('kind', DOC_KINDS),
    lang: body.lang === undefined ? 'es' : r.oneOf('lang', LANGS),
    name: r.text('name', 120),
    body: r.text('body', 100_000),
    variables: templateVars(r, body),
  }
  return done(r.fields, value)
}

function expiresAt(r: R, body: Record<string, unknown>): string | null {
  const v = body.expiresAt
  if (v === undefined || v === null || v === '') return null
  if (typeof v !== 'string' || !ISO_DATE.test(v) || Number.isNaN(Date.parse(`${v}T00:00:00Z`))) return r.fail('expiresAt', 'Fecha AAAA-MM-DD'), null
  return v
}

export function validateDoc(body: Record<string, unknown>): Result<DocInput> {
  const r = reader(body, ['title', 'body', 'variables', 'remindDays', 'expiresAt'])
  const value: DocInput = {
    title: r.text('title', 160),
    body: r.text('body', 100_000),
    variables: varsMap(r, body, 'variables', 60),
    remindDays: int(r, body, 'remindDays', 0, 30, 0),
    expiresAt: expiresAt(r, body),
  }
  return done(r.fields, value)
}

export type PreviewInput = {
  docId?: number; title?: string; body?: string; variables?: Record<string, string>; kind?: DocKind; lang?: ContractLang; clientId?: number
}

export function validatePreview(body: Record<string, unknown>): Result<PreviewInput> {
  const r = reader(body, ['docId', 'title', 'body', 'variables', 'kind', 'lang', 'clientId'])
  const value: PreviewInput = {}
  if (body.docId !== undefined) value.docId = int(r, body, 'docId', 1, 2_000_000_000, null)
  if (body.clientId !== undefined) value.clientId = int(r, body, 'clientId', 1, 2_000_000_000, null)
  if (body.title !== undefined) value.title = r.text('title', 160, false)
  if (body.body !== undefined) value.body = r.text('body', 100_000, false)
  if (body.variables !== undefined) value.variables = varsMap(r, body, 'variables', 60)
  if (body.kind !== undefined) value.kind = r.oneOf('kind', DOC_KINDS)
  if (body.lang !== undefined) value.lang = r.oneOf('lang', LANGS)
  return done(r.fields, value)
}

export function validateNewDoc(body: Record<string, unknown>): Result<NewDocInput> {
  const r = reader(body, ['templateId', 'parentId', 'title'])
  const value: NewDocInput = {
    templateId: int(r, body, 'templateId', 1, 2_000_000_000, null),
    parentId: body.parentId === undefined || body.parentId === null ? null : int(r, body, 'parentId', 1, 2_000_000_000, null),
    title: r.nullableText('title', 160),
  }
  return done(r.fields, value)
}

export function validateSend(body: Record<string, unknown>): Result<SendInput> {
  const r = reader(body, ['email', 'expiresInDays', 'message', 'remindDays', 'signature', 'useSaved'])
  const value: SendInput = {
    email: email(r, body, 'email', true),
    expiresInDays: int(r, body, 'expiresInDays', 1, 90, 30),
    message: r.nullableText('message', 500),
    remindDays: int(r, body, 'remindDays', 0, 30, 0),
    signature: strokes(r, body, 'signature', true),
    useSaved: r.bool('useSaved'),
  }
  return done(r.fields, value)
}

export function validateResend(body: Record<string, unknown>): Result<ResendInput> {
  const r = reader(body, ['email', 'expiresInDays'])
  const value: ResendInput = { email: email(r, body, 'email', false) || null, expiresInDays: int(r, body, 'expiresInDays', 1, 90, 30) }
  return done(r.fields, value)
}

export function validateOwnerSign(body: Record<string, unknown>): Result<OwnerSignInput> {
  const r = reader(body, ['signature', 'useSaved'])
  return done(r.fields, { signature: strokes(r, body, 'signature', true), useSaved: r.bool('useSaved') })
}

export function validateNote(key: 'note' | 'reason') {
  return (body: Record<string, unknown>): Result<string | null> => {
    const r = reader(body, [key])
    return done(r.fields, r.nullableText(key, 300))
  }
}

/** Texto que se inserta tal cual en el documento: sin marcas del formato ([[ ]], {{ }}, tablas) ni saltos de línea. */
function safeText(r: R, o: Record<string, unknown>, key: string, min: number, max: number): string | undefined {
  const v = o[key]
  if (v === undefined || v === null || v === '') return undefined
  const t = typeof v === 'string' ? v.replace(/\s+/g, ' ').trim() : ''
  if (t === '') return undefined
  if (t.length < min || t.length > max) return r.fail(`clientData.${key}`, `Entre ${min} y ${max} caracteres`), undefined
  if (/[[\]{}|<>\\]/.test(t) || /^(#|- )/.test(t) || /\p{Cc}/u.test(t)) return r.fail(`clientData.${key}`, 'Contiene caracteres no permitidos'), undefined
  return t
}

function clientData(r: R, body: Record<string, unknown>): ClientData {
  const v = body.clientData
  if (v === undefined) return {}
  if (typeof v !== 'object' || v === null || Array.isArray(v)) return r.fail('clientData', 'Debe ser un objeto'), {}
  const o = v as Record<string, unknown>
  reader(o, ['legalName', 'docType', 'docNumber', 'contactName', 'city', 'address'], 'clientData.', r.fields)
  const out: ClientData = {}
  const set = (k: Exclude<ClientField, 'docType'>, min: number, max: number) => {
    const t = safeText(r, o, k, min, max)
    if (t !== undefined) out[k] = t
  }
  set('legalName', 2, 160)
  set('contactName', 2, 120)
  set('city', 2, 80)
  set('address', 5, 200)
  if (o.docType !== undefined && o.docType !== '') {
    if (typeof o.docType === 'string' && (DOC_TYPES as readonly string[]).includes(o.docType)) out.docType = o.docType as DocType
    else r.fail('clientData.docType', 'Tipo de documento inválido')
  }
  if (o.docNumber !== undefined && o.docNumber !== '') {
    const n = typeof o.docNumber === 'string' ? o.docNumber.trim() : ''
    if (DOC_NUMBER_SIGN.test(n)) out.docNumber = n
    else r.fail('clientData.docNumber', 'Entre 4 y 30 caracteres: letras, números, punto y guion')
  }
  return out
}

export function validateClientSign(body: Record<string, unknown>): Result<ClientSignInput> {
  const r = reader(body, ['name', 'accepted', 'strokes', 'clientData'])
  if (body.accepted !== true) r.fail('accepted', 'Debes aceptar para firmar')
  const value = { name: r.text('name', 120), accepted: true as const, strokes: strokes(r, body, 'strokes', false) as Strokes, clientData: clientData(r, body) }
  return done(r.fields, value)
}

export function validateOwnerProfile(body: Record<string, unknown>): Result<OwnerProfile> {
  const r = reader(body, ['name', 'docType', 'docNumber', 'email', 'phone', 'address', 'city'])
  const value: OwnerProfile = {
    name: r.text('name', 120, false),
    docType: body.docType === undefined ? 'CC' : r.oneOf('docType', DOC_TYPES),
    docNumber: docNumber(r, body, false),
    email: email(r, body, 'email', false),
    phone: r.text('phone', 30, false),
    address: r.text('address', 200, false),
    city: r.text('city', 80, false),
  }
  return done(r.fields, value)
}

export function validateSignatureSetting(body: Record<string, unknown>): Result<Strokes> {
  const r = reader(body, ['strokes'])
  return done(r.fields, strokes(r, body, 'strokes', false) as Strokes)
}
