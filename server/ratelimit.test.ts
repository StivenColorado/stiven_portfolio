import assert from 'node:assert/strict'
import { test } from 'node:test'
import { hit, resetBuckets } from './ratelimit.ts'

test('permite hasta el límite y rechaza el siguiente', () => {
  resetBuckets()
  for (let i = 0; i < 5; i++) assert.equal(hit('a', 5, 60_000), true)
  assert.equal(hit('a', 5, 60_000), false)
  assert.equal(hit('b', 5, 60_000), true)
})

test('la ventana expira', async () => {
  resetBuckets()
  assert.equal(hit('c', 1, 20), true)
  assert.equal(hit('c', 1, 20), false)
  await new Promise((r) => setTimeout(r, 30))
  assert.equal(hit('c', 1, 20), true)
})
