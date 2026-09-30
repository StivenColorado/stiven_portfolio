import { readFileSync } from 'node:fs'
import type { Config } from './config.ts'

const TIMEOUT_MS = 10_000

function parseFrom(from: string): { name?: string; email: string } {
  const m = /^(.*)<(.+)>$/.exec(from.trim())
  return m ? { name: m[1]!.trim().replace(/^"|"$/g, ''), email: m[2]!.trim() } : { email: from.trim() }
}

const readTemplate = (name: string) => readFileSync(new URL(`./mail-templates/${name}`, import.meta.url), 'utf8')
const HTML_TEMPLATE = readTemplate('reset-password.html')
const TEXT_TEMPLATE = readTemplate('reset-password.txt')
const fill = (tpl: string, url: string, minutes: string) =>
  tpl.replaceAll('{{url}}', () => url).replaceAll('{{minutes}}', () => minutes)

const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`)

/** Sin BREVO_API_KEY el enlace solo se imprime fuera de producción; en producción nunca se loguea el token. */
export async function sendResetMail(config: Config, to: string, link: string, minutes = 30): Promise<void> {
  if (!config.brevoApiKey) {
    if (config.isProd) console.warn('[mail] BREVO_API_KEY vacío: correo de restablecimiento omitido')
    else console.log(`[mail] enlace de restablecimiento para ${to}: ${link}`)
    return
  }
  const mins = String(Math.trunc(minutes))
  const body = {
    sender: parseFrom(config.mailFrom),
    ...(config.mailReplyTo ? { replyTo: { email: config.mailReplyTo } } : {}),
    to: [{ email: to }],
    subject: 'Restablece tu contraseña',
    htmlContent: fill(HTML_TEMPLATE, escapeHtml(link), escapeHtml(mins)),
    textContent: fill(TEXT_TEMPLATE, link, mins),
  }
  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'api-key': config.brevoApiKey, 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  })
  if (!res.ok) throw new Error(`Brevo respondió ${res.status}`)
}
