import assert from 'node:assert/strict'
import { existsSync, readdirSync } from 'node:fs'
import { after, before, beforeEach, test } from 'node:test'
import { SAME, startApp } from './cms-helpers.ts'
import { detectMedia, parseRange } from './media.ts'

let app: Awaited<ReturnType<typeof startApp>>
before(async () => {
  app = await startApp()
})
after(() => app.close())
beforeEach(() => app.resetBuckets())

const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
const withTail = (head: Buffer, size = 64, fill = 7) => Buffer.concat([head, Buffer.alloc(size, fill)])
const webp = (fill = 1) => withTail(Buffer.concat([Buffer.from('RIFF'), Buffer.alloc(4), Buffer.from('WEBP')]), 200, fill)
const mp4 = (size = 1000) => withTail(Buffer.concat([Buffer.alloc(4), Buffer.from('ftypisom')]), size)

function upload(data: Buffer, filename: string, headers: Record<string, string> = { 'Sec-Fetch-Site': 'same-origin', Cookie: app.cookie }) {
  const form = new FormData()
  form.append('file', new Blob([new Uint8Array(data)]), filename)
  return fetch(`${app.base}/api/admin/media`, { method: 'POST', headers, body: form })
}

test('magic bytes de cada formato', () => {
  assert.equal(detectMedia(webp())?.ext, 'webp')
  assert.equal(detectMedia(withTail(PNG))?.ext, 'png')
  assert.equal(detectMedia(withTail(Buffer.from([0xff, 0xd8, 0xff, 0xe0])))?.ext, 'jpg')
  assert.equal(detectMedia(withTail(Buffer.from('GIF89a')))?.ext, 'gif')
  assert.equal(detectMedia(withTail(Buffer.from([0x1a, 0x45, 0xdf, 0xa3])))?.ext, 'webm')
  assert.equal(detectMedia(mp4())?.ext, 'mp4')
  assert.equal(detectMedia(Buffer.from('hola mundo, esto es texto')), null)
  assert.equal(detectMedia(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>')), null)
})

test('sube una imagen válida, la sirve con headers seguros y deduplica', async () => {
  const seeded = readdirSync(app.mediaDir).filter((f) => f.endsWith('.webp')).length
  const res = await upload(webp(), 'foto.webp')
  assert.equal(res.status, 201)
  const body = await app.json(res)
  assert.match(body.url, /^\/api\/media\/[a-f0-9]{16}\.webp$/)
  assert.equal(body.type, 'image')
  assert.equal(body.size, 212)

  const again = await app.json(await upload(webp(), 'otra.webp'))
  assert.equal(again.url, body.url)
  assert.equal(readdirSync(app.mediaDir).filter((f) => f.endsWith('.webp')).length, seeded + 1)
  assert.equal(readdirSync(app.mediaDir).some((f) => f.startsWith('.tmp-')), false)

  const got = await fetch(app.base + body.url)
  assert.equal(got.status, 200)
  assert.equal(got.headers.get('content-type'), 'image/webp')
  assert.equal(got.headers.get('cache-control'), 'public, max-age=31536000, immutable')
  assert.equal(got.headers.get('x-content-type-options'), 'nosniff')
  assert.equal(got.headers.get('content-security-policy'), "default-src 'none'")
  assert.deepEqual(Buffer.from(await got.arrayBuffer()), webp())
})

test('el nombre depende del hash: contenidos distintos, archivos distintos', async () => {
  const a = await app.json(await upload(webp(2), 'a.webp'))
  const b = await app.json(await upload(webp(3), 'b.webp'))
  assert.notEqual(a.url, b.url)
})

test('tipo falso da 415: png con extensión webp, texto y svg', async () => {
  assert.equal((await upload(withTail(PNG), 'engano.webp')).status, 415)
  assert.equal((await upload(Buffer.from('solo texto plano'), 'nota.png')).status, 415)
  assert.equal((await upload(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>'), 'x.svg')).status, 415)
  assert.equal((await upload(withTail(PNG), 'bien.png')).status, 201)
})

test('exceso de tamaño da 413: imagen > 5 MB y video > 30 MB', async () => {
  assert.equal((await upload(withTail(PNG, 5 * 1024 * 1024), 'grande.png')).status, 413)
  assert.equal((await upload(mp4(31 * 1024 * 1024), 'grande.mp4')).status, 413)
  const ok = await upload(mp4(2 * 1024 * 1024), 'ok.mp4')
  assert.equal(ok.status, 201)
  assert.equal((await app.json(ok)).type, 'video')
})

test('sin sesión 401, sin same-origin 403, sin archivo 400', async () => {
  assert.equal((await upload(webp(), 'a.webp', { 'Sec-Fetch-Site': 'same-origin' })).status, 401)
  assert.equal((await upload(webp(), 'a.webp', { Cookie: app.cookie })).status, 403)
  const form = new FormData()
  form.append('otro', 'x')
  const res = await fetch(`${app.base}/api/admin/media`, { method: 'POST', headers: { 'Sec-Fetch-Site': 'same-origin', Cookie: app.cookie }, body: form })
  assert.equal(res.status, 400)
  const json = await fetch(`${app.base}/api/admin/media`, { method: 'POST', headers: { ...SAME, Cookie: app.cookie }, body: '{}' })
  assert.equal(json.status, 400)
})

test('Range devuelve 206 y un rango imposible 416', async () => {
  const { url } = await app.json(await upload(mp4(5000), 'v.mp4'))
  const full = Buffer.from(await (await fetch(app.base + url)).arrayBuffer())
  const res = await fetch(app.base + url, { headers: { Range: 'bytes=10-19' } })
  assert.equal(res.status, 206)
  assert.equal(res.headers.get('content-range'), `bytes 10-19/${full.length}`)
  assert.equal(res.headers.get('accept-ranges'), 'bytes')
  assert.deepEqual(Buffer.from(await res.arrayBuffer()), full.subarray(10, 20))
  const open = await fetch(app.base + url, { headers: { Range: 'bytes=5000-' } })
  assert.equal(open.status, 206)
  assert.equal((await open.arrayBuffer()).byteLength, full.length - 5000)
  const tail = await fetch(app.base + url, { headers: { Range: 'bytes=-4' } })
  assert.deepEqual(Buffer.from(await tail.arrayBuffer()), full.subarray(-4))
  assert.equal((await fetch(app.base + url, { headers: { Range: 'bytes=999999-' } })).status, 416)
  assert.deepEqual(parseRange('bytes=0-1,5-6', 100), null)
})

test('nombres inválidos o inexistentes dan 404', async () => {
  for (const name of ['../../etc/passwd', '..%2f..%2fetc%2fpasswd', 'ABCDEF0123456789.webp', 'abc.webp', '0123456789abcdef.svg', '0123456789abcdef.webp', '0123456789abcdef.webp.exe', '.tmp-abc']) {
    const res = await fetch(`${app.base}/api/media/${name}`)
    assert.equal(res.status, 404, name)
  }
  assert.equal(existsSync(app.mediaDir), true)
})
