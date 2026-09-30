import { mkdirSync, writeFileSync } from 'node:fs'
import { render } from '@react-email/components'
import ResetPassword from '../emails/ResetPassword.tsx'

const out = new URL('../server/mail-templates/', import.meta.url)
mkdirSync(out, { recursive: true })

const templates = { 'reset-password': <ResetPassword /> }

for (const [name, element] of Object.entries(templates)) {
  writeFileSync(new URL(`${name}.html`, out), await render(element))
  writeFileSync(new URL(`${name}.txt`, out), await render(element, { plainText: true }))
  console.log(`[email:build] ${name}.html y ${name}.txt`)
}
