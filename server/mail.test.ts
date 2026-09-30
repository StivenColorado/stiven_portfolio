import assert from 'node:assert/strict'
import { afterEach, test } from 'node:test'
import { loadConfig } from './config.ts'
import { sendResetMail } from './mail.ts'

const realFetch = globalThis.fetch
afterEach(() => { globalThis.fetch = realFetch })

const config = loadConfig({ ADMIN_EMAIL: 'a@test.com', ADMIN_PASSWORD_HASH: 'x', BREVO_API_KEY: 'k' })

async function send(link: string, minutes?: number) {
  let sent: { htmlContent: string; textContent: string } | undefined
  globalThis.fetch = (async (_url: unknown, init?: RequestInit) => {
    sent = JSON.parse(String(init!.body))
    return new Response('{}', { status: 201 })
  }) as typeof fetch
  await sendResetMail(config, 'a@test.com', link, minutes)
  return sent!
}

test('el HTML trae botón, enlace escapado y minutos, sin placeholders', async () => {
  const link = 'http://web.test/r?token=abc&x="y"<z>'
  const { htmlContent, textContent } = await send(link, 30)
  assert.match(htmlContent, /Restablecer contraseña/)
  assert.ok(htmlContent.includes('href="http://web.test/r?token=abc&#38;x=&#34;y&#34;&#60;z&#62;"'))
  assert.ok(!htmlContent.includes('<z>'))
  assert.match(htmlContent, /30(<!-- -->)? minutos/)
  assert.ok(!htmlContent.includes('{{') && !textContent.includes('{{'))
  assert.ok(textContent.includes(link))
  assert.match(textContent, /30 minutos/)
})
