import type { Config } from './config.ts'

const TIMEOUT_MS = 10_000

function parseFrom(from: string): { name?: string; email: string } {
  const m = /^(.*)<(.+)>$/.exec(from.trim())
  return m ? { name: m[1]!.trim().replace(/^"|"$/g, ''), email: m[2]!.trim() } : { email: from.trim() }
}

const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`)

/** Sin BREVO_API_KEY el enlace solo se imprime fuera de producción; en producción nunca se loguea el token. */
export async function sendResetMail(config: Config, to: string, link: string): Promise<void> {
  if (!config.brevoApiKey) {
    if (config.isProd) console.warn('[mail] BREVO_API_KEY vacío: correo de restablecimiento omitido')
    else console.log(`[mail] enlace de restablecimiento para ${to}: ${link}`)
    return
  }
  const safe = escapeHtml(link)
  const body = {
    sender: parseFrom(config.mailFrom),
    ...(config.mailReplyTo ? { replyTo: { email: config.mailReplyTo } } : {}),
    to: [{ email: to }],
    subject: 'Restablece tu contraseña',
    htmlContent:
      `<p>Recibimos una solicitud para restablecer la contraseña del panel.</p>` +
      `<p><a href="${safe}">Restablecer contraseña</a></p>` +
      `<p>El enlace vence en 30 minutos y solo se puede usar una vez. Si no lo pediste, ignora este correo.</p>`,
    textContent:
      `Recibimos una solicitud para restablecer la contraseña del panel.\n\n${link}\n\n` +
      `El enlace vence en 30 minutos y solo se puede usar una vez. Si no lo pediste, ignora este correo.`,
  }
  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'api-key': config.brevoApiKey, 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  })
  if (!res.ok) throw new Error(`Brevo respondió ${res.status}`)
}
