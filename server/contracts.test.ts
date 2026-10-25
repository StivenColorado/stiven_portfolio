/* eslint-disable @typescript-eslint/no-explicit-any */
import assert from 'node:assert/strict'
import { after, before, beforeEach, test } from 'node:test'
import { SAME, startApp } from './cms-helpers.ts'
import { loadConfig } from './config.ts'
import { tick } from './contracts.ts'
import { CONTRACT_SEEDS } from './seed/contracts/index.ts'

type Brevo = { to: { email: string }[]; subject: string; textContent: string; attachment?: { name: string; content: string }[] }
const realFetch = globalThis.fetch
let brevo: Brevo[] = []
let app: Awaited<ReturnType<typeof startApp>>

const sig = { w: 300, h: 180, strokes: [[10, 150, 60, 20, 120, 130, 200, 40, 280, 120]] }
const tokenOf = (link: string) => link.split('/firmar/')[1] as string
const pub = (method: string, token: string, body?: unknown, sub = '') =>
  fetch(`${app.base}/api/sign/${token}${sub}`, { method, headers: SAME, body: body === undefined ? undefined : JSON.stringify(body) })
const docRow = (id: number) => app.db.prepare('SELECT * FROM contracts WHERE id = ?').get(id) as Record<string, unknown>
const actions = () => (app.db.prepare('SELECT action, entity, email, ip FROM audit_log').all() as { action: string; entity: string; email: string | null; ip: string }[])

before(async () => {
  globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
    if (String(input).startsWith('https://api.brevo.com/')) {
      brevo.push(JSON.parse(String(init!.body)) as Brevo)
      return new Response('{}', { status: 201 })
    }
    return realFetch(input, init)
  }) as typeof fetch
  app = await startApp({ BREVO_API_KEY: 'k', PUBLIC_URL: 'http://web.test', MAIL_REPLY_TO: 'owner@test.com' })
})
after(() => {
  globalThis.fetch = realFetch
  app.close()
})
beforeEach(() => {
  app.resetBuckets()
  brevo = []
})

async function newClient(extra: Record<string, unknown> = {}) {
  const res = await app.call('POST', '/api/admin/contracts/clients', {
    name: 'Acme', phone: '+57 300 123 4567', legalName: 'Acme S.A.S.', docType: 'NIT', docNumber: '900.123.456', contactName: 'Ana Gómez', email: 'ana@acme.co',
    city: 'Bogotá', defaults: { monto: '5000000', fecha_inicio: '2026-03-02', objeto: 'Sitio web', alcance: '- Cinco páginas' }, ...extra,
  })
  assert.equal(res.status, 201)
  return (await app.json<{ item: { id: number } }>(res)).item.id
}

async function newDoc(clientId: number, kind = 'services') {
  const tpls = (await app.json<{ items: { id: number; kind: string }[] }>(await app.call('GET', '/api/admin/contracts/templates?lang=es'))).items
  const res = await app.call('POST', `/api/admin/contracts/clients/${clientId}/docs`, { templateId: tpls.find((t) => t.kind === kind)!.id })
  assert.equal(res.status, 201)
  return (await app.json<{ item: Record<string, any> }>(res)).item
}

test('autenticación y same-origin', async () => {
  const anon = await fetch(`${app.base}/api/admin/contracts/clients`)
  assert.equal(anon.status, 401)
  const noOrigin = await app.call('POST', '/api/admin/contracts/clients', { name: 'x' }, { 'Content-Type': 'application/json', Cookie: app.cookie })
  assert.equal(noOrigin.status, 403)
})

test('las 8 plantillas se siembran una sola vez y todas validan', async () => {
  const items = (await app.json<{ items: { kind: string; seedKey: string }[] }>(await app.call('GET', '/api/admin/contracts/templates'))).items
  assert.equal(items.length, CONTRACT_SEEDS.length)
  assert.equal(new Set(items.map((i) => i.kind)).size, 8)
  const { seedTemplates } = await import('./contracts.ts')
  seedTemplates(app.db)
  assert.equal((app.db.prepare('SELECT COUNT(*) AS n FROM contract_templates').get() as { n: number }).n, 8)
})

test('plantilla: restaurar por defecto y 409 not_seeded', async () => {
  const [first] = (await app.json<{ items: { id: number }[] }>(await app.call('GET', '/api/admin/contracts/templates'))).items
  const full = (await app.json<{ item: Record<string, unknown> }>(await app.call('GET', `/api/admin/contracts/templates/${first!.id}`))).item
  const original = full.body
  const edited = await app.call('PUT', `/api/admin/contracts/templates/${first!.id}`, { kind: full.kind, lang: full.lang, name: full.name, variables: full.variables, body: 'otro texto' })
  assert.equal(edited.status, 200)
  const restored = await app.call('POST', `/api/admin/contracts/templates/${first!.id}/restore`)
  assert.equal((await app.json<{ item: { body: string } }>(restored)).item.body, original)
  const custom = await app.json<{ item: { id: number } }>(await app.call('POST', '/api/admin/contracts/templates', { kind: 'nda', lang: 'es', name: 'Mía', body: '# Hola {{x}}' }))
  assert.equal((await app.call('POST', `/api/admin/contracts/templates/${custom.item.id}/restore`)).status, 409)
  assert.equal((await app.call('DELETE', `/api/admin/contracts/templates/${custom.item.id}`)).status, 204)
})

test('flujo completo: documento, envío con firma guardada, firma del cliente, PDF y correos', async () => {
  assert.equal((await app.call('PUT', '/api/admin/contracts/settings/profile', { name: 'Stiven Colorado', docType: 'CC', docNumber: '1.000.000', email: 'stiven@x.co', phone: '300', city: 'Medellín' })).status, 200)
  assert.equal((await app.json<{ strokes: unknown }>(await app.call('GET', '/api/admin/contracts/settings/signature'))).strokes, null)
  const clientId = await newClient({ defaults: { monto: '5000000', fecha_inicio: '2026-03-02', alcance: '- Cinco páginas' } })
  const doc = await newDoc(clientId)
  assert.equal(doc.status, 'draft')
  assert.equal(doc.variables.cliente, 'Acme S.A.S.')
  assert.equal(doc.variables.prestador, 'Stiven Colorado')
  assert.equal(doc.variables.monto, '5000000')
  assert.deepEqual(doc.missing, ['objeto'])
  assert.ok(doc.varDefs.some((v: { key: string }) => v.key === 'monto'))
  assert.equal(doc.cover.clientName, 'Acme S.A.S.')
  assert.equal(doc.blocks.find((b: { type: string }) => b.type === 'h2').num, '1')

  const badSend = await app.call('POST', `/api/admin/contracts/docs/${doc.id}/send`, { email: 'ana@acme.co', useSaved: true })
  assert.equal(badSend.status, 409)
  assert.equal((await app.json<{ error: string }>(badSend)).error, 'no_saved_signature')
  assert.equal((await app.call('PUT', '/api/admin/contracts/settings/signature', { strokes: { ...sig, strokes: [[1, 1, 2, 2]] } })).status, 400)
  assert.equal((await app.call('PUT', '/api/admin/contracts/settings/signature', { strokes: sig })).status, 200)

  const missing = await app.call('POST', `/api/admin/contracts/docs/${doc.id}/send`, { email: 'ana@acme.co', useSaved: true })
  assert.equal(missing.status, 400)
  assert.ok((await app.json<{ fields: Record<string, string> }>(missing)).fields.variables)

  const vars = { ...doc.variables, ...Object.fromEntries(doc.missing.map((k: string) => [k, 'valor'])) }
  const put = await app.call('PUT', `/api/admin/contracts/docs/${doc.id}`, { title: 'Contrato Acme', body: doc.body, variables: vars, remindDays: 0, expiresAt: null })
  assert.equal(put.status, 200)
  assert.equal((await app.call('PUT', `/api/admin/contracts/docs/${doc.id}`, { title: 'x', body: 'x', variables: {}, bogus: 1 })).status, 400)

  const sent = await app.json<{ item: Record<string, any>; link: string; mailSent: boolean }>(
    await app.call('POST', `/api/admin/contracts/docs/${doc.id}/send`, { email: 'ana@acme.co', expiresInDays: 30, useSaved: true, message: 'Hola Ana' }),
  )
  assert.equal(sent.item.status, 'sent')
  assert.equal(sent.item.version, 1)
  assert.equal(sent.mailSent, true)
  assert.match(sent.link, /^http:\/\/web\.test\/firmar\/[A-Za-z0-9_-]{43}$/)
  assert.equal(brevo.length, 1)
  assert.ok(brevo[0]!.textContent.includes(sent.link))
  const token = tokenOf(sent.link)
  const detail = await (await app.call('GET', `/api/admin/contracts/docs/${doc.id}`)).text()
  assert.ok(!detail.includes(token))
  assert.match(detail, /"contentHash":"[0-9a-f]{64}"/)

  assert.equal((await app.call('PUT', `/api/admin/contracts/docs/${doc.id}`, { title: 'x', body: 'x', variables: {} })).status, 409)

  const view = await app.json<Record<string, any>>(await pub('GET', token))
  assert.equal(view.status, 'sent')
  assert.equal(view.clientName, 'Acme S.A.S.')
  assert.equal(view.contactName, 'Ana Gómez')
  assert.deepEqual(view.ownerSignature, sig)
  assert.equal(view.clientSigned, null)
  assert.equal((await pub('GET', token, undefined, '/pdf')).status, 409)

  assert.equal((await pub('POST', token, { name: 'Ana', accepted: true, strokes: { ...sig, strokes: [[1, 1, 2, 2]] } })).status, 400)
  assert.equal((await pub('POST', token, { name: 'Ana', accepted: false, strokes: sig })).status, 400)
  assert.equal((await pub('POST', token, { name: 'Ana', accepted: true, strokes: sig, extra: 1 })).status, 400)
  const signed = await pub('POST', token, { name: 'Ana Gómez', accepted: true, strokes: sig })
  assert.equal(signed.status, 200)
  const body = await app.json<{ ok: boolean; hash: string; signedAt: number }>(signed)
  assert.equal(body.hash, sent.item.contentHash)
  assert.equal((await pub('POST', token, { name: 'Ana Gómez', accepted: true, strokes: sig })).status, 409)

  const row = docRow(doc.id)
  assert.equal(row.status, 'active')
  assert.ok((row.pdf as Uint8Array).length > 1000)
  assert.equal(Buffer.from(row.pdf as Uint8Array).subarray(0, 5).toString(), '%PDF-')
  assert.equal(brevo.length, 3)
  const signedMails = brevo.slice(1)
  assert.deepEqual(signedMails.map((m) => m.to[0]!.email).sort(), ['ana@acme.co', 'owner@test.com'])
  assert.ok(signedMails.every((m) => m.attachment?.[0]?.name.endsWith('.pdf') && Buffer.from(m.attachment[0].content, 'base64').subarray(0, 5).toString() === '%PDF-'))

  const pdf = await pub('GET', token, undefined, '/pdf')
  assert.equal(pdf.status, 200)
  assert.equal(pdf.headers.get('content-type'), 'application/pdf')
  assert.equal(Buffer.from(await pdf.arrayBuffer()).subarray(0, 5).toString(), '%PDF-')
  const adminPdf = await app.call('GET', `/api/admin/contracts/docs/${doc.id}/pdf`)
  assert.equal(adminPdf.status, 200)
  assert.match(adminPdf.headers.get('content-disposition')!, /^attachment;/)

  const after = (await app.json<{ item: Record<string, any> }>(await app.call('GET', `/api/admin/contracts/docs/${doc.id}`))).item
  assert.equal(after.status, 'active')
  assert.equal(after.signatures.client.name, 'Ana Gómez')
  assert.equal(after.signatures.client.hash, after.contentHash)
  assert.equal(after.versions.length, 1)

  const list = (await app.json<{ items: { id: number; children: unknown[] }[] }>(await app.call('GET', `/api/admin/contracts/clients/${clientId}/docs`))).items
  assert.equal(list.length, 1)
  assert.equal('body' in list[0]!, false)
  const clients = (await app.json<{ items: { id: number; docCounts: Record<string, number> }[] }>(await app.call('GET', '/api/admin/contracts/clients?q=acme'))).items
  assert.equal(clients[0]!.docCounts.active, 1)

  assert.equal((await app.call('DELETE', `/api/admin/contracts/clients/${clientId}`)).status, 409)
  assert.equal((await app.json<{ error: string }>(await app.call('DELETE', `/api/admin/contracts/clients/${clientId}`))).error, 'not_archived')
  await app.call('POST', `/api/admin/contracts/clients/${clientId}/status`, { status: 'archived' })
  assert.equal((await app.json<{ error: string }>(await app.call('DELETE', `/api/admin/contracts/clients/${clientId}`))).error, 'has_signed_docs')
  assert.equal((await app.call('DELETE', `/api/admin/contracts/docs/${doc.id}`)).status, 409)

  const log = actions()
  for (const a of ['settings', 'create', 'send', 'sign', 'status']) assert.ok(log.some((l) => l.action === a), a)
  const clientSign = log.find((l) => l.action === 'sign' && l.email === null)!
  assert.equal(clientSign.entity, 'contracts')
})

test('firmar después: cliente firma primero, el prestador completa; revocar invalida el enlace', async () => {
  const clientId = await newClient({ name: 'Beta' })
  const doc = await newDoc(clientId, 'sla')
  const vars = { ...doc.variables, ...Object.fromEntries(doc.missing.map((k: string) => [k, 'valor'])) }
  await app.call('PUT', `/api/admin/contracts/docs/${doc.id}`, { title: doc.title, body: doc.body, variables: vars, remindDays: 0, expiresAt: null })
  const send = () => app.call('POST', `/api/admin/contracts/docs/${doc.id}/send`, { email: 'beta@x.co', expiresInDays: 5, signature: null, useSaved: false })
  const first = await app.json<{ link: string }>(await send())
  const t1 = tokenOf(first.link)
  const revoked = await app.json<{ item: { status: string; versions: unknown[] } }>(await app.call('POST', `/api/admin/contracts/docs/${doc.id}/revoke`, { note: 'Corregir monto' }))
  assert.equal(revoked.item.status, 'draft')
  assert.equal(revoked.item.versions.length, 2)
  assert.equal((await pub('GET', t1)).status, 410)
  assert.equal((await pub('POST', t1, { name: 'B', accepted: true, strokes: sig })).status, 410)

  const second = await app.json<{ link: string; item: { version: number } }>(await send())
  assert.equal(second.item.version, 2)
  const t2 = tokenOf(second.link)
  assert.equal((await pub('POST', t2, { name: 'Beta', accepted: true, strokes: sig })).status, 200)
  assert.equal(docRow(doc.id).status, 'client_signed')
  assert.equal(brevo.filter((m) => m.attachment).length, 0)
  assert.equal((await app.call('POST', `/api/admin/contracts/docs/${doc.id}/resend`, { expiresInDays: 5 })).status, 409)

  const sign = await app.call('POST', `/api/admin/contracts/docs/${doc.id}/sign`, { useSaved: true })
  assert.equal(sign.status, 200)
  assert.equal((await app.json<{ item: { status: string } }>(sign)).item.status, 'active')
  assert.equal(brevo.filter((m) => m.attachment).length, 2)

  const cancel = await app.call('POST', `/api/admin/contracts/docs/${doc.id}/cancel`, { reason: 'Cliente desistió' })
  assert.equal((await app.json<{ item: { status: string } }>(cancel)).item.status, 'cancelled')
  assert.equal((await pub('GET', t2)).status, 409)
  assert.equal((await app.call('POST', `/api/admin/contracts/docs/${doc.id}/cancel`, {})).status, 409)
  assert.equal((await app.call('DELETE', `/api/admin/contracts/docs/${doc.id}`)).status, 204)
})

test('anexos: el acta necesita padre del mismo expediente y rellena contrato_ref', async () => {
  const clientId = await newClient({ name: 'Gamma' })
  const parent = await newDoc(clientId)
  const tpls = (await app.json<{ items: { id: number; kind: string }[] }>(await app.call('GET', '/api/admin/contracts/templates'))).items
  const acta = tpls.find((t) => t.kind === 'acceptance')!.id
  const other = await newClient({ name: 'Delta' })
  assert.equal((await app.call('POST', `/api/admin/contracts/clients/${other}/docs`, { templateId: acta, parentId: parent.id })).status, 400)
  assert.equal((await app.call('POST', `/api/admin/contracts/clients/${clientId}/docs`, { templateId: 99999 })).status, 400)
  const child = await app.json<{ item: { variables: Record<string, string>; parentId: number } }>(await app.call('POST', `/api/admin/contracts/clients/${clientId}/docs`, { templateId: acta, parentId: parent.id }))
  assert.equal(child.item.parentId, parent.id)
  assert.ok(child.item.variables.contrato_ref.includes(parent.title))
  const list = (await app.json<{ items: { id: number; children: { id: number }[] }[] }>(await app.call('GET', `/api/admin/contracts/clients/${clientId}/docs`))).items
  assert.equal(list.find((d) => d.id === parent.id)!.children.length, 1)
})

test('enlace vencido da 410; tick vence contratos activos y reenvía recordatorios', async () => {
  const clientId = await newClient({ name: 'Épsilon' })
  const doc = await newDoc(clientId, 'nda')
  const vars = { ...doc.variables, ...Object.fromEntries(doc.missing.map((k: string) => [k, 'valor'])) }
  await app.call('PUT', `/api/admin/contracts/docs/${doc.id}`, { title: doc.title, body: doc.body, variables: vars, remindDays: 2, expiresAt: '2026-06-30' })
  const sent = await app.json<{ link: string }>(await app.call('POST', `/api/admin/contracts/docs/${doc.id}/send`, { email: 'e@x.co', expiresInDays: 10, signature: null, remindDays: 2 }))
  const token = tokenOf(sent.link)
  assert.equal((await pub('GET', token)).status, 200)

  const config = loadConfig({ BREVO_API_KEY: 'k', PUBLIC_URL: 'http://web.test' })
  brevo = []
  await tick(app.db, config, Date.now() + 86_400_000)
  assert.equal(brevo.length, 0)
  const later = Date.now() + 3 * 86_400_000
  await tick(app.db, config, later)
  assert.equal(brevo.length, 1)
  assert.match(brevo[0]!.subject, /^Recordatorio/)
  const fresh = tokenOf(/http:\/\/web\.test\/firmar\/[A-Za-z0-9_-]+/.exec(brevo[0]!.textContent)![0])
  assert.equal((await pub('GET', fresh)).status, 200)
  assert.equal((docRow(doc.id).reminders_sent as number), 1)
  await tick(app.db, config, later + 1000)
  assert.equal(brevo.length, 1)
  assert.ok(actions().some((a) => a.action === 'remind' && a.ip === 'system' && a.email === null))

  assert.equal((await pub('POST', fresh, { name: 'E', accepted: true, strokes: sig })).status, 200)
  app.db.prepare("UPDATE contracts SET status = 'active', expires_at = ? WHERE id = ?").run(Date.now() - 1000, doc.id)
  await tick(app.db, config)
  assert.equal(docRow(doc.id).status, 'expired')
  assert.ok(actions().some((a) => a.action === 'expire'))

  app.db.prepare('UPDATE contracts SET token_expires = ? WHERE id = ?').run(Date.now() - 1, doc.id)
  assert.equal((await pub('GET', fresh)).status, 410)
})

test('límites: 413 en cuerpos grandes, 404 en token inválido y 429 en el 11.º POST público', async () => {
  const clientId = await newClient({ name: 'Zeta' })
  const doc = await newDoc(clientId)
  const huge = await app.call('PUT', `/api/admin/contracts/docs/${doc.id}`, { title: 'x', body: 'a'.repeat(300_000), variables: {} })
  assert.equal(huge.status, 413)
  assert.equal((await pub('GET', 'corto')).status, 404)
  const ghost = 'A'.repeat(43)
  assert.equal((await pub('GET', ghost)).status, 404)
  const bigSign = await pub('POST', ghost, { name: 'x'.repeat(200_000), accepted: true, strokes: sig })
  assert.equal(bigSign.status, 413)
  app.resetBuckets()
  const codes: number[] = []
  for (let i = 0; i < 11; i++) codes.push((await pub('POST', ghost, { name: 'Ana', accepted: true, strokes: sig })).status)
  assert.deepEqual(codes, [...Array(10).fill(404), 429])
})

test('PDF embebible: ?inline=1 y vista previa sin X-Frame-Options ni CSP, y la vista previa no guarda nada', async () => {
  const doc = await newDoc(await newClient())
  const inline = await app.call('GET', `/api/admin/contracts/docs/${doc.id}/pdf?inline=1`)
  assert.equal(inline.status, 200)
  assert.match(inline.headers.get('content-disposition')!, /^inline; filename=/)
  const preview = await app.call('POST', '/api/admin/contracts/preview-pdf', { docId: doc.id, title: 'Otro título', body: '## Hola\nTexto {{faltante}}' })
  assert.equal(preview.status, 200)
  assert.equal(preview.headers.get('content-type'), 'application/pdf')
  assert.match(preview.headers.get('content-disposition')!, /^inline;/)
  assert.equal(preview.headers.get('cache-control'), 'no-store')
  for (const res of [inline, preview]) {
    assert.equal(res.headers.get('x-frame-options'), null)
    assert.equal(res.headers.get('content-security-policy'), null)
    assert.equal(res.headers.get('x-content-type-options'), 'nosniff')
  }
  assert.equal(Buffer.from(await preview.arrayBuffer()).subarray(0, 5).toString(), '%PDF-')
  assert.equal(docRow(doc.id).title, doc.title)
  const sample = await app.call('POST', '/api/admin/contracts/preview-pdf', { body: '## Cláusula\nHola {{x}}', variables: { x: '1' }, lang: 'en' })
  assert.equal(sample.status, 200)
  assert.equal((await app.call('POST', '/api/admin/contracts/preview-pdf', { docId: 999999 })).status, 404)
  assert.equal((await app.call('POST', '/api/admin/contracts/preview-pdf', { extra: 1 })).status, 400)
  assert.equal((await app.call('POST', '/api/admin/contracts/preview-pdf', { body: 'x' }, { 'Content-Type': 'application/json', Cookie: app.cookie })).status, 403)
})

test('cliente con solo nombre y celular: se envía sin sus datos y los aporta al firmar', async () => {
  const noPhone = await app.call('POST', '/api/admin/contracts/clients', { name: 'Sin celular' })
  assert.equal(noPhone.status, 400)
  assert.ok((await app.json<{ fields: Record<string, string> }>(noPhone)).fields.phone)
  const res = await app.call('POST', '/api/admin/contracts/clients', { name: 'Solo Nombre', phone: '+57 311 222 3344' })
  assert.equal(res.status, 201)
  const clientId = (await app.json<{ item: { id: number } }>(res)).item.id

  const doc = await newDoc(clientId)
  assert.ok(doc.pendingClient.includes('cliente_documento'))
  assert.ok(doc.missing.every((k: string) => !k.startsWith('cliente')), 'los datos del cliente no cuentan como faltantes')
  const vars = { ...doc.variables, ...Object.fromEntries(doc.missing.map((k: string) => [k, 'valor'])) }
  await app.call('PUT', `/api/admin/contracts/docs/${doc.id}`, { title: doc.title, body: doc.body, variables: vars, remindDays: 0, expiresAt: null })
  const sent = await app.json<{ link: string; item: Record<string, any> }>(
    await app.call('POST', `/api/admin/contracts/docs/${doc.id}/send`, { email: 'solo@x.co', expiresInDays: 10, signature: null, useSaved: false }),
  )
  const token = tokenOf(sent.link)
  const sentHash = sent.item.contentHash as string

  const view = await app.json<Record<string, any>>(await pub('GET', token))
  assert.ok(view.clientForm.fields.includes('docNumber') && view.clientForm.fields.includes('legalName'))
  assert.equal(view.clientForm.prefill.legalName, 'Solo Nombre')
  assert.ok(JSON.stringify(view.blocks).includes('[[cliente_documento]]'))

  const base = { name: 'Solo Nombre Pérez', accepted: true, strokes: sig }
  assert.equal((await pub('POST', token, base)).status, 400)
  const bad = async (clientData: unknown) => (await pub('POST', token, { ...base, clientData })).status
  assert.equal(await bad({ legalName: 'Solo S.A.S.', docType: 'NIT', docNumber: '12' }), 400)
  assert.equal(await bad({ legalName: 'Solo S.A.S.', docType: 'NIT', docNumber: '900 123 456' }), 400)
  assert.equal(await bad({ legalName: '[[cliente]]', docType: 'NIT', docNumber: '900123456-7' }), 400)
  assert.equal(await bad({ legalName: '# Título', docType: 'NIT', docNumber: '900123456-7' }), 400)
  assert.equal(await bad({ legalName: 'Solo S.A.S.', docType: 'XX', docNumber: '900123456-7' }), 400)
  assert.equal(await bad({ legalName: 'Solo S.A.S.', docType: 'NIT', docNumber: '900123456-7', otro: 'x' }), 400)
  assert.equal(await bad({ legalName: 'Solo S.A.S.', docType: 'NIT' }), 400)
  assert.equal(docRow(doc.id).status, 'sent')

  const ok = await pub('POST', token, { ...base, clientData: { legalName: 'Solo S.A.S.', docType: 'NIT', docNumber: '900123456-7', city: 'Cali', address: 'Calle 10 # 5-20', contactName: 'Luis Solo' } })
  assert.equal(ok.status, 200, await ok.clone().text())
  const { hash } = await app.json<{ hash: string }>(ok)
  assert.notEqual(hash, sentHash)

  const after = (await app.json<{ item: Record<string, any> }>(await app.call('GET', `/api/admin/contracts/docs/${doc.id}`))).item
  assert.equal(after.version, 2)
  assert.equal(after.contentHash, hash)
  assert.equal(after.sentHash, sentHash)
  assert.equal(after.signatures.client.hash, hash)
  assert.equal(after.versions.length, 2)
  assert.ok(after.rendered.includes('900123456-7') && !after.rendered.includes('[[cliente'))
  assert.deepEqual(after.clientData.fields, view.clientForm.fields)
  assert.ok(after.clientData.ip)
  assert.equal(after.variables.cliente_documento, '900123456-7')
  const { createHash } = await import('node:crypto')
  const expected = createHash('sha256')
    .update(JSON.stringify({ id: doc.id, version: 2, kind: after.kind, lang: after.lang, title: after.title, rendered: after.rendered, prev: sentHash }))
    .digest('hex')
  assert.equal(hash, expected)

  const client = (await app.json<{ item: Record<string, any> }>(await app.call('GET', `/api/admin/contracts/clients/${clientId}`))).item
  assert.equal(client.docNumber, '900123456-7')
  assert.equal(client.legalName, 'Solo S.A.S.')
  assert.ok(view.clientForm.fields.every((f: string) => client[f] !== ''))
  assert.equal(client.provided.docId, doc.id)
  assert.ok(actions().some((a) => a.action === 'client_data' && a.email === null && a.entity === 'contracts'))

  const editable = Object.fromEntries(['name', 'legalName', 'docType', 'docNumber', 'contactName', 'email', 'phone', 'address', 'city', 'country', 'lang', 'notes', 'defaults'].map((k) => [k, client[k]]))
  assert.equal((await app.call('PUT', `/api/admin/contracts/clients/${clientId}`, { ...editable, docNumber: '999999999', legalName: 'Otra razón' })).status, 200)
  const frozen = (await app.json<{ item: Record<string, any> }>(await app.call('GET', `/api/admin/contracts/docs/${doc.id}`))).item
  assert.equal(frozen.rendered, after.rendered)
  assert.equal(frozen.cover.clientName, 'Solo S.A.S.')
  const kept = (await app.json<{ item: Record<string, any> }>(await app.call('GET', `/api/admin/contracts/clients/${clientId}`))).item
  assert.equal(kept.provided.docId, doc.id)

  const next = await newDoc(clientId, 'nda')
  assert.equal(next.variables.cliente_documento, '999999999')
})
