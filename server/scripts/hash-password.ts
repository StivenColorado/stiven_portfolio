import { hashPassword } from '../auth.ts'

const chunks: Buffer[] = []
for await (const chunk of process.stdin) chunks.push(chunk as Buffer)
const password = Buffer.concat(chunks).toString('utf8').replace(/\r?\n$/, '')

if (!password) {
  console.error('Uso: echo -n "password" | pnpm server:hash')
  process.exit(1)
}
console.log(hashPassword(password))
