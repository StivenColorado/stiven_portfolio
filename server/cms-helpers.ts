import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { createApp } from './app.ts'
import { hashPassword } from './auth.ts'
import { loadConfig } from './config.ts'
import { openDb } from './db.ts'
import { resetBuckets } from './ratelimit.ts'

export const EMAIL = 'admin@test.com'
export const PASSWORD = 'secreta-larga-1'
export const SAME = { 'Sec-Fetch-Site': 'same-origin', 'Content-Type': 'application/json' }

export async function startApp(extraEnv: Record<string, string> = {}) {
  const mediaDir = mkdtempSync(join(tmpdir(), 'cms-media-'))
  const db = openDb(':memory:')
  const config = loadConfig({
    ADMIN_EMAIL: EMAIL, ADMIN_PASSWORD_HASH: hashPassword(PASSWORD), COOKIE_SECURE: '0', MEDIA_DIR: mediaDir, ...extraEnv,
  })
  const server: Server = createApp(config, db)
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r))
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
  const res = await fetch(`${base}/api/admin/login`, {
    method: 'POST', headers: SAME, body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  })
  const cookie = (res.headers.get('set-cookie') ?? '').split(';')[0] as string

  const api = { cookie }
  const call = (method: string, path: string, body?: unknown, headers: Record<string, string> = { ...SAME, Cookie: api.cookie }) =>
    fetch(base + path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const json = async <T = Record<string, any>>(res: Response) => (await res.json()) as T

  return {
    db, base, mediaDir,
    get cookie() { return api.cookie },
    set cookie(v: string) { api.cookie = v }, call, json, resetBuckets,
    close() {
      server.close()
      db.close()
      rmSync(mediaDir, { recursive: true, force: true })
    },
  }
}
