import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createSession, hashPassword, isValidSession, readSid, sessionCookie, verify } from './auth.ts'
import { openDb } from './db.ts'

test('verify acepta la password correcta y rechaza el resto', () => {
  const stored = hashPassword('correcta')
  assert.match(stored, /^scrypt\$[0-9a-f]{32}\$[0-9a-f]{128}$/)
  assert.equal(verify('correcta', stored), true)
  assert.equal(verify('otra', stored), false)
  assert.equal(verify('', stored), false)
})

test('verify rechaza hashes malformados', () => {
  assert.equal(verify('x', ''), false)
  assert.equal(verify('x', 'scrypt$zz$zz'), false)
  assert.equal(verify('x', 'md5$aa$bb'), false)
})

test('sesiones: válida, expirada y cookie', () => {
  const db = openDb(':memory:')
  const token = createSession(db, 'a@b.c', 1)
  assert.equal(isValidSession(db, token), true)
  assert.equal(isValidSession(db, 'inventado'), false)
  assert.equal(isValidSession(db, null), false)
  db.prepare('UPDATE sessions SET expires = ?').run(Date.now() - 1)
  assert.equal(isValidSession(db, token), false)

  const cookie = sessionCookie(token, 12, true)
  assert.match(cookie, /HttpOnly/)
  assert.match(cookie, /SameSite=Strict/)
  assert.match(cookie, /Secure/)
  assert.doesNotMatch(sessionCookie(token, 12, false), /Secure/)
  assert.equal(readSid(`a=1; sid=${token}; b=2`), token)
  assert.equal(readSid(undefined), null)
})
