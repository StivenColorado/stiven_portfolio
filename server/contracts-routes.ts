import type { IncomingMessage, ServerResponse } from 'node:http'
import type { DatabaseSync } from 'node:sqlite'
import type { Config } from './config.ts'
import type { Strokes } from './contracts-validate.ts'
import {
  cancelDoc, clientSign, createClient, createDoc, createTemplate, dataOf, docDetail, docPdf, findByToken, fmtDateTime, getClient,
  getDocRow, getTemplate, listClients, listDocs, listTemplates, ownerProfile, ownerSign, ownerSignature, removeClient, removeDoc,
  removeTemplate, renderDoc, resendDoc, restoreTemplate, revokeDoc, sendDoc, setClientStatus, setOwnerProfile, setOwnerSignature,
  signView, updateClient, updateDoc, updateTemplate,
} from './contracts.ts'
import type { Meta } from './contracts.ts'
import {
  validateClient, validateClientSign, validateClientStatus, validateDoc, validateNewDoc, validateNote, validateOwnerProfile,
  validateOwnerSign, validateResend, validateSend, validateSignatureSetting, validateTemplate,
} from './contracts-validate.ts'
import { MINUTE, header, isSameOrigin, readJson, send } from './http.ts'
import { sendContractSignMail, sendContractSignedMail } from './mail.ts'
import { hit } from './ratelimit.ts'
import type { Result } from './validate.ts'

type Audit = (email: string | null, ip: string, action: string, entity: string | null, entityId: number | null, summary: string) => void

const MAX_BIG = 256 * 1024
const MAX_SIGN = 128 * 1024
const TOKEN = /^[A-Za-z0-9_-]{40,50}$/
const ID = /^\d{1,10}$/
const short = (s: string, n = 80) => (s.length > n ? `${s.slice(0, n - 1)}…` : s)
const slug = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase().slice(0, 60) || 'documento'

function sendPdf(res: ServerResponse, pdf: Buffer, name: string): void {
  res.writeHead(200, {
    'Content-Type': 'application/pdf',
    'Content-Disposition': `attachment; filename="${name}.pdf"`,
    'Content-Length': String(pdf.length),
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer',
  })
  res.end(pdf)
}

export function createContractRoutes(db: DatabaseSync, config: Config, audit: Audit) {
  const invalid = (res: ServerResponse, fields: Record<string, string>) => send(res, 400, { error: 'invalid', fields })
  const notFound = (res: ServerResponse) => send(res, 404, { error: 'not_found' })
  const ownerCopy = () => config.mailReplyTo || config.adminEmail

  async function body(req: IncomingMessage, res: ServerResponse, max: number, optional = false): Promise<Record<string, unknown> | null> {
    const b = await readJson(req, max)
    if (b.tooBig) return send(res, 413, { error: 'payload_too_large' }), null
    if (b.json) return b.json
    if (optional) return {}
    return invalid(res, { _: 'JSON inválido' }), null
  }

  async function parsed<T>(req: IncomingMessage, res: ServerResponse, validate: (b: Record<string, unknown>) => Result<T>, max = MAX_SIGN, optional = false): Promise<T | undefined> {
    const raw = await body(req, res, max, optional)
    if (!raw) return undefined
    const r = validate(raw)
    if (!r.ok) return invalid(res, r.fields), undefined
    return r.value
  }

  const meta = (req: IncomingMessage, ip: string): Meta => ({ ip, ua: header(req, 'user-agent').slice(0, 300) })

  function resolveOwnerSignature(signature: Strokes | null, useSaved: boolean): Strokes | null | 'no_saved_signature' | 'no_profile' {
    const strokes = signature ?? (useSaved ? ownerSignature(db) : null)
    if (useSaved && !signature && !strokes) return 'no_saved_signature'
    if (strokes && ownerProfile(db).name === '') return 'no_profile'
    return strokes
  }

  async function mailSigned(docId: number): Promise<void> {
    const r = getDocRow(db, docId)
    const pdf = docPdf(db, docId)
    if (!r || !pdf) return
    const recipients = [r.sent_to, ownerCopy()].filter((to): to is string => Boolean(to))
    const hash = r.content_hash ?? ''
    for (const to of new Set(recipients)) {
      await sendContractSignedMail(config, {
        to: [to], lang: r.lang, docTitle: r.title, hash, signedAt: fmtDateTime(r.completed_at ?? Date.now(), r.lang), pdf, fileName: `${slug(r.title)}-firmado.pdf`,
      }).catch((err: unknown) => console.error('[mail]', (err as Error).message))
    }
  }

  async function mailSign(r: NonNullable<ReturnType<typeof getDocRow>>, token: string, to: string): Promise<boolean> {
    const client = getClient(db, r.client_id)
    const days = Math.max(1, Math.ceil(((r.token_expires as number) - Date.now()) / 86_400_000))
    try {
      await sendContractSignMail(config, {
        to, lang: r.lang, link: `${config.publicUrl}/firmar/${token}`, days, docTitle: r.title,
        ownerName: ownerProfile(db).name || 'Stiven Colorado', clientName: client?.contactName || client?.name || '', message: dataOf(r).message ?? null,
      })
      return true
    } catch (err) {
      console.error('[mail]', (err as Error).message)
      return false
    }
  }

  async function adminClients(req: IncomingMessage, res: ServerResponse, email: string, ip: string, seg: string[], url: URL): Promise<void> {
    const [, idRaw, sub] = seg
    const m = req.method
    const id = idRaw && ID.test(idRaw) ? Number(idRaw) : null
    if (!idRaw) {
      if (m === 'GET') {
        const status = url.searchParams.get('status') ?? 'all'
        if (status !== 'all' && status !== 'active' && status !== 'archived') return send(res, 400, { error: 'invalid_request' })
        return send(res, 200, { items: listClients(db, status, (url.searchParams.get('q') ?? '').slice(0, 100)) })
      }
      if (m === 'POST') {
        const input = await parsed(req, res, validateClient, MAX_BIG)
        if (!input) return
        const item = createClient(db, input)
        audit(email, ip, 'create', 'clients', item.id, `Creó el expediente «${short(item.name)}»`)
        return send(res, 201, { item })
      }
      return notFound(res)
    }
    if (id === null) return notFound(res)
    if (!sub) {
      if (m === 'GET') {
        const item = getClient(db, id)
        return item ? send(res, 200, { item }) : notFound(res)
      }
      if (m === 'PUT') {
        const input = await parsed(req, res, validateClient, MAX_BIG)
        if (!input) return
        const item = updateClient(db, id, input)
        if (!item) return notFound(res)
        audit(email, ip, 'update', 'clients', id, `Editó el expediente «${short(item.name)}»`)
        return send(res, 200, { item })
      }
      if (m === 'DELETE') {
        const name = getClient(db, id)?.name ?? ''
        const outcome = removeClient(db, id)
        if (outcome === 'not_found') return notFound(res)
        if (outcome !== 'ok') return send(res, 409, { error: outcome })
        audit(email, ip, 'delete', 'clients', id, `Eliminó el expediente «${short(name)}»`)
        return send(res, 204)
      }
      return notFound(res)
    }
    if (sub === 'status' && m === 'POST') {
      const status = await parsed(req, res, validateClientStatus)
      if (!status) return
      const item = setClientStatus(db, id, status)
      if (!item) return notFound(res)
      audit(email, ip, 'status', 'clients', id, `${status === 'archived' ? 'Archivó' : 'Restauró'} el expediente «${short(item.name)}»`)
      return send(res, 200, { item })
    }
    if (sub === 'docs' && m === 'GET') return getClient(db, id) ? send(res, 200, { items: listDocs(db, id) }) : notFound(res)
    if (sub === 'docs' && m === 'POST') {
      const input = await parsed(req, res, validateNewDoc)
      if (!input) return
      const row = createDoc(db, id, input)
      if (row === 'client_not_found') return notFound(res)
      if (row === 'template_not_found') return invalid(res, { templateId: 'La plantilla no existe' })
      if (row === 'parent_invalid') return invalid(res, { parentId: 'El contrato padre no existe o es de otro expediente' })
      audit(email, ip, 'create', 'contracts', row.id, `Creó el documento «${short(row.title)}» para «${short(getClient(db, id)?.name ?? '')}»`)
      return send(res, 201, { item: docDetail(db, row) })
    }
    return notFound(res)
  }

  async function adminTemplates(req: IncomingMessage, res: ServerResponse, email: string, ip: string, seg: string[], url: URL): Promise<void> {
    const [, idRaw, sub] = seg
    const m = req.method
    const id = idRaw && ID.test(idRaw) ? Number(idRaw) : null
    if (!idRaw) {
      if (m === 'GET') {
        const lang = url.searchParams.get('lang')
        return send(res, 200, { items: listTemplates(db, lang === 'es' || lang === 'en' ? lang : null) })
      }
      if (m === 'POST') {
        const input = await parsed(req, res, validateTemplate, MAX_BIG)
        if (!input) return
        const item = createTemplate(db, input)
        audit(email, ip, 'create', 'contract_templates', item.id, `Creó la plantilla «${short(item.name)}»`)
        return send(res, 201, { item })
      }
      return notFound(res)
    }
    if (id === null) return notFound(res)
    if (!sub) {
      if (m === 'GET') {
        const item = getTemplate(db, id)
        return item ? send(res, 200, { item }) : notFound(res)
      }
      if (m === 'PUT') {
        const input = await parsed(req, res, validateTemplate, MAX_BIG)
        if (!input) return
        const item = updateTemplate(db, id, input)
        if (!item) return notFound(res)
        audit(email, ip, 'update', 'contract_templates', id, `Editó la plantilla «${short(item.name)}»`)
        return send(res, 200, { item })
      }
      if (m === 'DELETE') {
        const name = getTemplate(db, id)?.name ?? ''
        if (!removeTemplate(db, id)) return notFound(res)
        audit(email, ip, 'delete', 'contract_templates', id, `Eliminó la plantilla «${short(name)}»`)
        return send(res, 204)
      }
      return notFound(res)
    }
    if (sub === 'restore' && m === 'POST') {
      const out = restoreTemplate(db, id)
      if (out === 'not_found') return notFound(res)
      if (out === 'not_seeded') return send(res, 409, { error: 'not_seeded' })
      audit(email, ip, 'restore', 'contract_templates', id, `Restauró la plantilla «${short(out.name)}» a su versión por defecto`)
      return send(res, 200, { item: out })
    }
    return notFound(res)
  }

  async function adminDocs(req: IncomingMessage, res: ServerResponse, email: string, ip: string, seg: string[]): Promise<void> {
    const [, idRaw, sub] = seg
    const m = req.method
    if (!idRaw || !ID.test(idRaw)) return notFound(res)
    const id = Number(idRaw)
    const row = getDocRow(db, id)
    if (!row) return notFound(res)
    const title = short(row.title)
    const item = () => docDetail(db, getDocRow(db, id) as NonNullable<typeof row>)

    if (!sub) {
      if (m === 'GET') return send(res, 200, { item: docDetail(db, row) })
      if (m === 'PUT') {
        const input = await parsed(req, res, validateDoc, MAX_BIG)
        if (!input) return
        const out = updateDoc(db, id, input)
        if (out === 'not_found') return notFound(res)
        if (out === 'not_draft') return send(res, 409, { error: 'not_draft' })
        audit(email, ip, 'update', 'contracts', id, `Editó el documento «${short(out.title)}»`)
        return send(res, 200, { item: docDetail(db, out) })
      }
      if (m === 'DELETE') {
        const out = removeDoc(db, id)
        if (out === 'not_deletable') return send(res, 409, { error: 'not_deletable' })
        if (out === 'not_found') return notFound(res)
        audit(email, ip, 'delete', 'contracts', id, `Eliminó el documento «${title}»`)
        return send(res, 204)
      }
      return notFound(res)
    }
    if (sub === 'pdf' && m === 'GET') {
      const pdf = docPdf(db, id)
      return pdf ? sendPdf(res, pdf, slug(row.title)) : notFound(res)
    }
    if (m !== 'POST') return notFound(res)

    if (sub === 'send') {
      const input = await parsed(req, res, validateSend)
      if (!input) return
      if (row.status !== 'draft') return send(res, 409, { error: 'not_draft' })
      const sig = resolveOwnerSignature(input.signature, input.useSaved)
      if (sig === 'no_saved_signature' || sig === 'no_profile') return send(res, 409, { error: sig })
      const out = sendDoc(db, id, { ...input, signature: sig, ownerName: ownerProfile(db).name, ...meta(req, ip) })
      if (out === 'missing_vars') return invalid(res, { variables: `Faltan valores: ${renderMissing(row)}` })
      if (typeof out === 'string') return out === 'not_draft' ? send(res, 409, { error: out }) : notFound(res)
      audit(email, ip, 'send', 'contracts', id, `Envió «${title}» (v${out.doc.version}, ${input.email}, vence en ${input.expiresInDays} días)${sig ? ' con firma del prestador' : ''}`)
      const mailSent = await mailSign(out.doc, out.token, input.email)
      return send(res, 200, { item: item(), link: `${config.publicUrl}/firmar/${out.token}`, mailSent })
    }
    if (sub === 'resend') {
      const input = await parsed(req, res, validateResend)
      if (!input) return
      const out = resendDoc(db, id, input)
      if (out === 'not_sent') return send(res, 409, { error: 'not_sent' })
      if (out === 'not_found') return notFound(res)
      audit(email, ip, 'resend', 'contracts', id, `Reenvió «${title}» a ${out.doc.sent_to} (vence en ${input.expiresInDays} días)`)
      const mailSent = await mailSign(out.doc, out.token, out.doc.sent_to as string)
      return send(res, 200, { item: item(), link: `${config.publicUrl}/firmar/${out.token}`, mailSent })
    }
    if (sub === 'sign') {
      const input = await parsed(req, res, validateOwnerSign)
      if (!input) return
      if (row.status !== 'client_signed') return send(res, 409, { error: 'not_client_signed' })
      const sig = resolveOwnerSignature(input.signature, input.useSaved)
      if (sig === 'no_saved_signature' || sig === 'no_profile') return send(res, 409, { error: sig })
      if (!sig) return invalid(res, { signature: 'Dibuja o usa tu firma guardada' })
      const out = ownerSign(db, id, { strokes: sig, ownerName: ownerProfile(db).name, ...meta(req, ip) })
      if (typeof out === 'string') return out === 'not_found' ? notFound(res) : send(res, 409, { error: out })
      audit(email, ip, 'sign', 'contracts', id, `Firmó «${title}» como prestador (hash ${(out.content_hash ?? '').slice(0, 8)})`)
      await mailSigned(id)
      return send(res, 200, { item: item() })
    }
    if (sub === 'revoke') {
      const note = await parsed(req, res, validateNote('note'), MAX_SIGN, true)
      if (note === undefined) return
      const out = revokeDoc(db, id, note)
      if (typeof out === 'string') return out === 'not_found' ? notFound(res) : send(res, 409, { error: out })
      audit(email, ip, 'revoke', 'contracts', id, `Volvió a borrador «${title}»${note ? `: ${short(note, 120)}` : ''}`)
      return send(res, 200, { item: item() })
    }
    if (sub === 'cancel') {
      const reason = await parsed(req, res, validateNote('reason'), MAX_SIGN, true)
      if (reason === undefined) return
      const out = cancelDoc(db, id, reason)
      if (typeof out === 'string') return out === 'not_found' ? notFound(res) : send(res, 409, { error: out })
      audit(email, ip, 'cancel', 'contracts', id, `Canceló «${title}»${reason ? `: ${short(reason, 120)}` : ''}`)
      return send(res, 200, { item: item() })
    }
    return notFound(res)
  }

  const renderMissing = (row: NonNullable<ReturnType<typeof getDocRow>>) =>
    [...renderDoc(row).matchAll(/\[\[([a-z][a-z0-9_]*)\]\]/g)].map((x) => x[1]).filter((v, i, a) => a.indexOf(v) === i).join(', ')

  async function adminSettings(req: IncomingMessage, res: ServerResponse, email: string, ip: string, seg: string[]): Promise<void> {
    const [, what] = seg
    const m = req.method
    if (what === 'profile') {
      if (m === 'GET') return send(res, 200, { profile: ownerProfile(db) })
      if (m === 'PUT') {
        const input = await parsed(req, res, validateOwnerProfile)
        if (!input) return
        setOwnerProfile(db, input)
        audit(email, ip, 'settings', 'contracts', null, 'Actualizó sus datos de prestador')
        return send(res, 200, { profile: input })
      }
    }
    if (what === 'signature') {
      if (m === 'GET') return send(res, 200, { strokes: ownerSignature(db) })
      if (m === 'PUT') {
        const input = await parsed(req, res, validateSignatureSetting)
        if (!input) return
        setOwnerSignature(db, input)
        audit(email, ip, 'settings', 'contracts', null, 'Actualizó su firma guardada')
        return send(res, 200, { strokes: input })
      }
    }
    return notFound(res)
  }

  async function admin(req: IncomingMessage, res: ServerResponse, email: string, ip: string, url: URL): Promise<void> {
    const seg = url.pathname.replace(/^\/api\/admin\/contracts\/?/, '').split('/').filter(Boolean)
    if (req.method !== 'GET' && !isSameOrigin(req)) {
      req.resume()
      return send(res, 403, { error: 'forbidden' })
    }
    switch (seg[0]) {
      case 'clients': return adminClients(req, res, email, ip, seg, url)
      case 'templates': return adminTemplates(req, res, email, ip, seg, url)
      case 'docs': return adminDocs(req, res, email, ip, seg)
      case 'settings': return adminSettings(req, res, email, ip, seg)
      default: return notFound(res)
    }
  }

  async function publicRoutes(req: IncomingMessage, res: ServerResponse, ip: string, url: URL): Promise<void> {
    const [, , , token, sub] = url.pathname.split('/')
    if (!token || !TOKEN.test(token) || (sub !== undefined && sub !== 'pdf')) return notFound(res)
    const m = req.method

    if (m === 'POST' && sub === undefined) {
      if (!hit(`sign:post:${ip}`, 10, 15 * MINUTE)) {
        req.resume()
        return send(res, 429, { error: 'too_many_requests' })
      }
      if (!isSameOrigin(req)) {
        req.resume()
        return send(res, 403, { error: 'forbidden' })
      }
      const input = await parsed(req, res, validateClientSign, MAX_SIGN)
      if (!input) return
      const out = clientSign(db, token, { name: input.name, strokes: input.strokes, ...meta(req, ip) })
      if (out === 'not_found') return notFound(res)
      if (out === 'expired') return send(res, 410, { error: 'expired' })
      if (out === 'already_signed' || out === 'cancelled') return send(res, 409, { error: out })
      const signedAt = dataOf(out).signatures.client?.ts ?? Date.now()
      const hash = out.content_hash ?? ''
      audit(null, ip, 'sign', 'contracts', out.id, `El cliente «${short(input.name)}» firmó «${short(out.title)}» (hash ${hash.slice(0, 8)})`)
      if (out.status === 'active') await mailSigned(out.id)
      return send(res, 200, { ok: true, signedAt, hash })
    }

    if (m !== 'GET') return notFound(res)
    if (!hit(`sign:${sub ?? 'get'}:${ip}`, sub === 'pdf' ? 30 : 60, MINUTE)) return send(res, 429, { error: 'too_many_requests' })
    const row = findByToken(db, token)
    if (!row) return notFound(res)
    if (row.status === 'cancelled') return send(res, 409, { error: 'cancelled' })
    if (row.status === 'expired' || (row.token_expires ?? 0) <= Date.now()) return send(res, 410, { error: 'expired' })
    if (sub === 'pdf') {
      if (row.status !== 'active') return send(res, 409, { error: 'not_ready' })
      const pdf = docPdf(db, row.id)
      return pdf ? sendPdf(res, pdf, slug(row.title)) : send(res, 409, { error: 'not_ready' })
    }
    return send(res, 200, signView(db, row))
  }

  return { admin, public: publicRoutes }
}
