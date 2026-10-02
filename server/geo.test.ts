import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { test } from 'node:test'
import { geoReady, initGeo, lookup } from './geo.ts'

const DB = 'server/data/dbip-city-lite.mmdb'

test('sin archivo devuelve nulos y no lanza', () => {
  assert.equal(initGeo('/no/existe.mmdb'), false)
  assert.equal(geoReady(), false)
  assert.deepEqual(lookup('8.8.8.8'), { country: null, city: null, lat: null, lon: null })
})

test('resuelve país y ciudad', { skip: !existsSync(DB) && 'falta la base (scripts/get-geodb.sh)' }, () => {
  assert.equal(initGeo(DB), true)
  const us = lookup('8.8.8.8')
  assert.equal(us.country, 'US')
  assert.ok(us.city)
  const co = lookup('186.29.1.1')
  assert.equal(co.country, 'CO')
  assert.ok(co.city)
  assert.equal(lookup('186.29.1.1'), co)
  assert.ok(typeof us.lat === 'number' && typeof us.lon === 'number')
  assert.deepEqual(lookup('10.0.0.1'), { country: null, city: null, lat: null, lon: null })
})
