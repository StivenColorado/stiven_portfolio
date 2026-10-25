import { readFileSync } from 'node:fs'
import type { Config } from './config.ts'

const TIMEOUT_MS = 10_000

function parseFrom(from: string): { name?: string; email: string } {
  const m = /^(.*)<(.+)>$/.exec(from.trim())
  return m ? { name: m[1]!.trim().replace(/^"|"$/g, ''), email: m[2]!.trim() } : { email: from.trim() }
}

const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`)

const cache = new Map<string, string>()
function readTemplate(file: string): string {
  let tpl = cache.get(file)
  if (tpl === undefined) {
    tpl = readFileSync(new URL(`./mail-templates/${file}`, import.meta.url), 'utf8')
    cache.set(file, tpl)
  }
  return tpl
}

/** El texto plano pasa los títulos a mayúsculas ({{HEADING}}), por eso la búsqueda ignora mayúsculas. */
export function renderTemplate(name: string, vars: Record<string, string>): { html: string; text: string } {
  const lower = new Map(Object.entries(vars).map(([k, v]) => [k.toLowerCase(), v]))
  const apply = (tpl: string, esc: (s: string) => string) =>
    tpl.replace(/\{\{(\w+)\}\}/g, (all, key: string) => (lower.has(key.toLowerCase()) ? esc(lower.get(key.toLowerCase()) as string) : all))
  return { html: apply(readTemplate(`${name}.html`), escapeHtml), text: apply(readTemplate(`${name}.txt`), (s) => s) }
}

export type MailInput = {
  to: string[]
  subject: string
  html: string
  text: string
  attachments?: { name: string; content: Buffer }[]
  /** Se imprime en desarrollo cuando no hay BREVO_API_KEY; en producción nunca se loguea. */
  devNote?: string
}

export async function sendMail(config: Config, mail: MailInput): Promise<void> {
  if (!config.brevoApiKey) {
    if (config.isProd) console.warn(`[mail] BREVO_API_KEY vacío: correo «${mail.subject}» omitido`)
    else console.log(`[mail] ${mail.devNote ?? mail.subject} (${mail.to.join(', ')})`)
    return
  }
  const body = {
    sender: parseFrom(config.mailFrom),
    ...(config.mailReplyTo ? { replyTo: { email: config.mailReplyTo } } : {}),
    to: mail.to.map((email) => ({ email })),
    subject: mail.subject,
    htmlContent: mail.html,
    textContent: mail.text,
    ...(mail.attachments?.length ? { attachment: mail.attachments.map((a) => ({ name: a.name, content: a.content.toString('base64') })) } : {}),
  }
  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'api-key': config.brevoApiKey, 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  })
  if (!res.ok) throw new Error(`Brevo respondió ${res.status}`)
}

export async function sendResetMail(config: Config, to: string, link: string, minutes = 30): Promise<void> {
  const { html, text } = renderTemplate('reset-password', { url: link, minutes: String(Math.trunc(minutes)) })
  await sendMail(config, { to: [to], subject: 'Restablece tu contraseña', html, text, devNote: `enlace de restablecimiento para ${to}: ${link}` })
}

type Lang = 'es' | 'en'
const SIGN_COPY = {
  es: {
    subject: (t: string) => `Para tu firma: ${t}`,
    reminder: (t: string) => `Recordatorio: ${t}`,
    heading: 'Revisa y firma',
    reminderHeading: 'Tu firma sigue pendiente',
    intro: (owner: string, t: string) => `${owner} te envió «${t}» para que lo revises y lo firmes en línea.`,
    reminderIntro: (owner: string, t: string) => `Te recordamos que «${t}», enviado por ${owner}, sigue pendiente de tu firma.`,
    fallbackMessage: 'Quedo atento a tus comentarios.',
  },
  en: {
    subject: (t: string) => `For your signature: ${t}`,
    reminder: (t: string) => `Reminder: ${t}`,
    heading: 'Review and sign',
    reminderHeading: 'Your signature is still pending',
    intro: (owner: string, t: string) => `${owner} sent you “${t}” to review and sign online.`,
    reminderIntro: (owner: string, t: string) => `A reminder that “${t}”, sent by ${owner}, is still waiting for your signature.`,
    fallbackMessage: 'I look forward to your comments.',
  },
} as const

export type ContractSignMail = {
  to: string; lang: Lang; link: string; days: number; docTitle: string; ownerName: string; clientName: string
  message: string | null; reminder?: boolean
}

export async function sendContractSignMail(config: Config, m: ContractSignMail): Promise<void> {
  const c = SIGN_COPY[m.lang]
  const { html, text } = renderTemplate(`contract-sign-${m.lang}`, {
    heading: m.reminder ? c.reminderHeading : c.heading,
    intro: (m.reminder ? c.reminderIntro : c.intro)(m.ownerName, m.docTitle),
    clientName: m.clientName || (m.lang === 'en' ? 'there' : 'hola'),
    ownerName: m.ownerName, docTitle: m.docTitle, url: m.link, days: String(m.days), message: m.message || c.fallbackMessage,
  })
  await sendMail(config, {
    to: [m.to], subject: (m.reminder ? c.reminder : c.subject)(m.docTitle), html, text, devNote: `enlace de firma para ${m.to}: ${m.link}`,
  })
}

const SIGNED_COPY = {
  es: {
    subject: (t: string) => `Documento firmado: ${t}`, heading: 'Documento firmado',
    intro: (t: string) => `«${t}» quedó firmado por ambas partes. El PDF con el registro de firma va adjunto.`,
  },
  en: {
    subject: (t: string) => `Signed document: ${t}`, heading: 'Document signed',
    intro: (t: string) => `“${t}” has been signed by both parties. The PDF with the signature record is attached.`,
  },
} as const

export type ContractSignedMail = { to: string[]; lang: Lang; docTitle: string; hash: string; signedAt: string; pdf: Buffer; fileName: string }

export async function sendContractSignedMail(config: Config, m: ContractSignedMail): Promise<void> {
  const c = SIGNED_COPY[m.lang]
  const { html, text } = renderTemplate(`contract-signed-${m.lang}`, {
    heading: c.heading, intro: c.intro(m.docTitle), docTitle: m.docTitle, signedAt: m.signedAt, hash: m.hash,
  })
  await sendMail(config, { to: m.to, subject: c.subject(m.docTitle), html, text, attachments: [{ name: m.fileName, content: m.pdf }] })
}
