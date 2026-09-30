import assert from 'node:assert/strict'
import { test } from 'node:test'
import { clientIp } from './ip.ts'

const req = (remote: string, real?: string) => ({
  headers: real ? { 'x-real-ip': real } : {},
  socket: { remoteAddress: remote },
})

test('sin proxy de confianza ignora X-Real-IP', () => {
  assert.equal(clientIp(req('203.0.113.9', '1.2.3.4'), false), '203.0.113.9')
  assert.equal(clientIp(req('127.0.0.1', '1.2.3.4'), false), '127.0.0.1')
})

test('con proxy de confianza usa X-Real-IP solo desde loopback', () => {
  assert.equal(clientIp(req('127.0.0.1', '1.2.3.4'), true), '1.2.3.4')
  assert.equal(clientIp(req('::ffff:127.0.0.1', '1.2.3.4'), true), '1.2.3.4')
  assert.equal(clientIp(req('::1', '2001:db8::1'), true), '2001:db8::1')
  assert.equal(clientIp(req('203.0.113.9', '1.2.3.4'), true), '203.0.113.9')
})

test('X-Real-IP inválido cae a la IP del socket', () => {
  assert.equal(clientIp(req('127.0.0.1', 'no-es-ip'), true), '127.0.0.1')
  assert.equal(clientIp(req('::ffff:198.51.100.7'), false), '198.51.100.7')
})
