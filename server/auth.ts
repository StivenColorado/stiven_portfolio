import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'
import type { DatabaseSync } from 'node:sqlite'

const KEY_LEN = 64

export function hashPassword(password: string): string {
  const salt = randomBytes(16)
  const hash = scryptSync(password, salt, KEY_LEN)
  return `scrypt$${salt.toString('hex')}$${hash.toString('hex')}`
}

export function verify(password: string, stored: string): boolean {
  const [scheme, saltHex, hashHex] = stored.split('$')
  if (scheme !== 'scrypt' || !saltHex || !hashHex) return false
  const expected = Buffer.from(hashHex, 'hex')
  if (expected.length !== KEY_LEN) return false
  const actual = scryptSync(password, Buffer.from(saltHex, 'hex'), KEY_LEN)
  return timingSafeEqual(actual, expected)
}

export const DUMMY_HASH = hashPassword('dummy-para-igualar-tiempos')

export const sha256 = (value: string): string => createHash('sha256').update(value).digest('hex')

export function createSession(db: DatabaseSync, email: string, hours: number): string {
  const token = randomBytes(32).toString('base64url')
  db.prepare('INSERT INTO sessions (token, email, expires) VALUES (?, ?, ?)').run(
    token,
    email,
    Date.now() + hours * 3_600_000,
  )
  return token
}

export function isValidSession(db: DatabaseSync, token: string | null): boolean {
  if (!token) return false
  const row = db.prepare('SELECT 1 AS ok FROM sessions WHERE token = ? AND expires > ?').get(token, Date.now())
  return row !== undefined
}

export function sessionEmail(db: DatabaseSync, token: string | null): string | null {
  if (!token) return null
  const row = db.prepare('SELECT email FROM sessions WHERE token = ? AND expires > ?').get(token, Date.now()) as
    | { email: string }
    | undefined
  return row?.email ?? null
}

export function destroyOtherSessions(db: DatabaseSync, email: string, keepToken: string | null): void {
  db.prepare('DELETE FROM sessions WHERE email = ? AND token IS NOT ?').run(email, keepToken)
}

export function destroySession(db: DatabaseSync, token: string): void {
  db.prepare('DELETE FROM sessions WHERE token = ?').run(token)
}

export function sessionCookie(token: string, hours: number, secure: boolean): string {
  const maxAge = Math.round(hours * 3600)
  return `sid=${token}; HttpOnly;${secure ? ' Secure;' : ''} SameSite=Strict; Path=/api/admin; Max-Age=${maxAge}`
}

export function clearCookie(secure: boolean): string {
  return sessionCookie('', 0, secure)
}

export function readSid(cookieHeader: string | undefined): string | null {
  if (!cookieHeader) return null
  for (const part of cookieHeader.split(';')) {
    const i = part.indexOf('=')
    if (i > 0 && part.slice(0, i).trim() === 'sid') return part.slice(i + 1).trim() || null
  }
  return null
}
