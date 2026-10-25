import { mkdirSync, writeFileSync } from 'node:fs'
import { render } from '@react-email/components'
import ContractSign from '../emails/ContractSign.tsx'
import ContractSigned from '../emails/ContractSigned.tsx'
import ResetPassword from '../emails/ResetPassword.tsx'

const out = new URL('../server/mail-templates/', import.meta.url)
mkdirSync(out, { recursive: true })

const templates = {
  'reset-password': <ResetPassword />,
  'contract-sign-es': <ContractSign lang="es" />,
  'contract-sign-en': <ContractSign lang="en" />,
  'contract-signed-es': <ContractSigned lang="es" />,
  'contract-signed-en': <ContractSigned lang="en" />,
}

for (const [name, element] of Object.entries(templates)) {
  writeFileSync(new URL(`${name}.html`, out), await render(element))
  writeFileSync(new URL(`${name}.txt`, out), await render(element, { plainText: true }))
  console.log(`[email:build] ${name}.html y ${name}.txt`)
}
