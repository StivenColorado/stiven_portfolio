import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import { startApp } from './cms-helpers.ts'

let app: Awaited<ReturnType<typeof startApp>>
before(async () => { app = await startApp() })
after(() => app.close())

test('prospectos: requiere sesión', async () => {
  const res = await app.call('GET', '/api/admin/prospects', undefined, {})
  assert.equal(res.status, 401)
})

test('prospectos: ciclo de vida completo', async () => {
  const bad = await app.call('POST', '/api/admin/prospects', { business: '', emails: ['x'], websites: ['sin espacios así'] })
  assert.equal(bad.status, 400)

  const created = await app.json(await app.call('POST', '/api/admin/prospects', {
    business: 'Panadería Sol', owner: 'Ana', phones: ['+57 300 123 4567'], emails: ['ANA@sol.co'], websites: ['sol.co'], sourceLinks: ['instagram.com/panaderiasol'],
  }))
  assert.equal(created.item.status, 'new')
  assert.deepEqual(created.item.emails, ['ana@sol.co'])
  assert.deepEqual(created.item.websites, ['https://sol.co'])
  assert.deepEqual(created.item.sourceLinks, ['https://instagram.com/panaderiasol'])
  const id = created.item.id

  const moved = await app.json(await app.call('POST', `/api/admin/prospects/${id}/status`, { status: 'contacted' }))
  assert.equal(moved.item.status, 'contacted')
  assert.ok(moved.item.lastContactAt)
  assert.equal((await app.call('POST', `/api/admin/prospects/${id}/status`, { status: 'otro' })).status, 400)

  const note = await app.json(await app.call('POST', `/api/admin/prospects/${id}/notes`, { text: 'Llamé, volver el lunes' }))
  const detail = await app.json(await app.call('GET', `/api/admin/prospects/${id}`))
  assert.equal(detail.notes.length, 1)
  assert.equal(detail.item.noteCount, 1)
  assert.equal((await app.call('DELETE', `/api/admin/prospects/${id}/notes/${note.note.id}`)).status, 204)

  const list = await app.json(await app.call('GET', '/api/admin/prospects?status=contacted&q=sol'))
  assert.equal(list.items.length, 1)

  assert.equal((await app.call('DELETE', `/api/admin/prospects/${id}`)).status, 204)
  assert.equal((await app.call('GET', `/api/admin/prospects/${id}`)).status, 404)
})
