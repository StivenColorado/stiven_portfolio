import assert from 'node:assert/strict'
import { existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { after, before, test } from 'node:test'
import { startApp } from './cms-helpers.ts'
import { MIGRATED_FLAG, SEED_MEDIA_DIR, migrateMedia, migrateMediaOnce } from './media-migrate.ts'

let app: Awaited<ReturnType<typeof startApp>>
before(async () => {
  app = await startApp()
})
after(() => app.close())

const rowsData = () =>
  (app.db.prepare('SELECT data FROM projects').all() as { data: string }[]).map((r) => JSON.parse(r.data) as { images: string[]; videos: string[] })
const urls = () => rowsData().flatMap((d) => [...d.images, ...d.videos])
const scratch = () => mkdtempSync(join(tmpdir(), 'media-migrate-'))

const legacy = (images: string[], videos: string[] = []) => {
  app.db.prepare('UPDATE projects SET data = ? WHERE slug = ?').run(JSON.stringify({ images, videos }), 'azur')
}

test('la siembra fresca deja solo URLs de media y los archivos existen', () => {
  const all = urls()
  assert.ok(all.length === 18)
  assert.ok(all.every((u) => u.startsWith('/api/media/')))
  for (const u of all) assert.ok(existsSync(join(app.mediaDir, u.slice('/api/media/'.length))))
  assert.ok(existsSync(SEED_MEDIA_DIR))
})

test('/api/content sirve las URLs nuevas y el archivo responde', async () => {
  const content = await app.json(await fetch(`${app.base}/api/content`))
  const imgs: string[] = content.projects.flatMap((p: { images: string[] }) => p.images)
  assert.ok(imgs.length > 0 && imgs.every((u) => /^\/api\/media\/[a-f0-9]{16}\.webp$/.test(u)))
  const res = await fetch(app.base + imgs[0])
  assert.equal(res.status, 200)
  assert.equal(res.headers.get('content-type'), 'image/webp')
})

test('la migración convierte filas viejas, deduplica y es idempotente', () => {
  const dir = scratch()
  legacy(['/projects/pokemon/pokemon_p1.webp', '/projects/pokemon/pokemon_p1.webp'], ['/projects/eyetracking/eyetrackingVideo.webm'])
  app.db.prepare('DELETE FROM meta WHERE key = ?').run(MIGRATED_FLAG)
  const first = migrateMediaOnce(app.db, dir, null)
  assert.ok(first)
  assert.equal(first.migrated, 3)
  assert.equal(first.missing.length, 0)
  assert.equal(first.stored, 2)
  const azur = JSON.parse((app.db.prepare("SELECT data FROM projects WHERE slug = 'azur'").get() as { data: string }).data)
  assert.equal(azur.images[0], azur.images[1])
  assert.ok(azur.images[0].startsWith('/api/media/') && azur.videos[0].endsWith('.webm'))
  assert.equal(readdirSync(dir).length, 2)
  assert.equal(migrateMediaOnce(app.db, dir, null), null)
  assert.equal(migrateMedia(app.db, dir, null).migrated, 0)
  const log = app.db.prepare("SELECT email, ip, summary FROM audit_log WHERE action = 'media.migrate'").all() as { email: string | null; ip: string }[]
  assert.equal(log.length, 1)
  assert.equal(log[0]?.email, null)
  rmSync(dir, { recursive: true, force: true })
})

test('un archivo faltante conserva la URL, no rompe y se resuelve desde PUBLIC_DIR', () => {
  const dir = scratch()
  const pub = scratch()
  legacy(['/projects/no-existe/x.webp', '/projects/pokemon/pokemon_p2.webp', '/projects/../../etc/passwd', '/projects/extra/nuevo.webp'])
  mkdirSync(join(pub, 'projects', 'extra'), { recursive: true })
  writeFileSync(join(pub, 'projects', 'extra', 'nuevo.webp'), Buffer.concat([Buffer.from('RIFF'), Buffer.alloc(4), Buffer.from('WEBPextra')]))
  const summary = migrateMedia(app.db, dir, pub)
  assert.deepEqual(summary.missing, ['/projects/no-existe/x.webp', '/projects/../../etc/passwd'])
  assert.equal(summary.migrated, 2)
  const azur = JSON.parse((app.db.prepare("SELECT data FROM projects WHERE slug = 'azur'").get() as { data: string }).data)
  assert.equal(azur.images[0], '/projects/no-existe/x.webp')
  assert.ok(azur.images[1].startsWith('/api/media/') && azur.images[3].startsWith('/api/media/'))
  rmSync(dir, { recursive: true, force: true })
  rmSync(pub, { recursive: true, force: true })
})
