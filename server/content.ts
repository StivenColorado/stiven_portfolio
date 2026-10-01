import type { DatabaseSync } from 'node:sqlite'
import { EXPERIENCE_SEED } from './seed/experience.ts'
import { recordAudit } from './audit.ts'
import { resolveSeedUrls } from './media-migrate.ts'
import { PROJECTS_SEED } from './seed/projects.ts'
import { SERVICES_SEED } from './seed/services.ts'
import { validateExperience, validateProject, validateService } from './validate.ts'
import type { Result, Status } from './validate.ts'

export type Entity = 'projects' | 'services' | 'experience'
export const ENTITIES: readonly Entity[] = ['projects', 'services', 'experience']
export type AdminItem = Record<string, unknown> & { id: number; status: Status; sortOrder: number }

type Row = { id: number; status: Status; sort_order: number; created_at: number; updated_at: number; data: string; i18n: string }
type Lang = 'es' | 'en'
export const parseLang = (raw: string | null): Lang => (raw === 'en' ? 'en' : 'es')

export class SlugTakenError extends Error {}

const PROJECT_DEFAULTS = { githubRepo: null, workingOn: false }

const toItem = (r: Row, entity: Entity): AdminItem => ({
  ...(entity === 'projects' ? PROJECT_DEFAULTS : {}),
  ...(JSON.parse(r.data) as Record<string, unknown>),
  i18n: JSON.parse(r.i18n || '{}') as object,
  id: r.id,
  status: r.status,
  sortOrder: r.sort_order,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
})

function splitI18n(input: object): { data: string; i18n: string } {
  const { i18n, ...rest } = input as { i18n?: object }
  return { data: JSON.stringify(rest), i18n: JSON.stringify(i18n ?? {}) }
}

const slugOf = (input: object): string | null => {
  const slug = (input as { slug?: unknown }).slug
  return typeof slug === 'string' ? slug : null
}

function assertSlugFree(db: DatabaseSync, entity: Entity, slug: string | null, selfId: number): void {
  if (slug === null || entity === 'experience') return
  const row = db.prepare(`SELECT id FROM ${entity} WHERE slug = ? AND id != ?`).get(slug, selfId)
  if (row) throw new SlugTakenError()
}

function insert(db: DatabaseSync, entity: Entity, input: object, status: Status, order: number, now: number): AdminItem {
  const { data, i18n } = splitI18n(input)
  const row = db
    .prepare(
      `INSERT INTO ${entity} (slug, status, sort_order, created_at, updated_at, data, i18n) VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING *`,
    )
    .get(slugOf(input), status, order, now, now, data, i18n) as Row
  return toItem(row, entity)
}

export function getItem(db: DatabaseSync, entity: Entity, id: number): AdminItem | null {
  const row = db.prepare(`SELECT * FROM ${entity} WHERE id = ?`).get(id) as Row | undefined
  return row ? toItem(row, entity) : null
}

export function listItems(db: DatabaseSync, entity: Entity, status: Status | 'all', q: string): AdminItem[] {
  const rows = (
    status === 'all'
      ? db.prepare(`SELECT * FROM ${entity} ORDER BY sort_order, id`).all()
      : db.prepare(`SELECT * FROM ${entity} WHERE status = ? ORDER BY sort_order, id`).all(status)
  ) as Row[]
  const items = rows.map((r) => toItem(r, entity))
  const needle = q.trim().toLowerCase()
  if (!needle) return items
  return items.filter((it) =>
    [it.slug, it.title, it.summary, it.tagline, it.company, it.role].some(
      (v) => typeof v === 'string' && v.toLowerCase().includes(needle),
    ),
  )
}

export function createItem(db: DatabaseSync, entity: Entity, input: object, now = Date.now()): AdminItem {
  assertSlugFree(db, entity, slugOf(input), 0)
  const next = db.prepare(`SELECT COALESCE(MAX(sort_order), -1) + 1 AS n FROM ${entity}`).get() as { n: number }
  return insert(db, entity, input, 'hidden', next.n, now)
}

export function updateItem(db: DatabaseSync, entity: Entity, id: number, input: object, now = Date.now()): AdminItem | null {
  if (!getItem(db, entity, id)) return null
  assertSlugFree(db, entity, slugOf(input), id)
  const { data, i18n } = splitI18n(input)
  db.prepare(`UPDATE ${entity} SET slug = ?, data = ?, i18n = ?, updated_at = ? WHERE id = ?`).run(
    slugOf(input),
    data,
    i18n,
    now,
    id,
  )
  return getItem(db, entity, id)
}

export function setStatus(db: DatabaseSync, entity: Entity, id: number, status: Status, now = Date.now()): AdminItem | null {
  db.prepare(`UPDATE ${entity} SET status = ?, updated_at = ? WHERE id = ?`).run(status, now, id)
  return getItem(db, entity, id)
}

export function setFeatured(db: DatabaseSync, id: number, featured: boolean, now = Date.now()): AdminItem | null {
  const row = db.prepare('SELECT data FROM projects WHERE id = ?').get(id) as { data: string } | undefined
  if (!row) return null
  const data = { ...(JSON.parse(row.data) as object), featured }
  db.prepare('UPDATE projects SET data = ?, updated_at = ? WHERE id = ?').run(JSON.stringify(data), now, id)
  return getItem(db, 'projects', id)
}

export function reorder(db: DatabaseSync, entity: Entity, ids: number[]): boolean {
  const all = (db.prepare(`SELECT id FROM ${entity} ORDER BY sort_order, id`).all() as { id: number }[]).map((r) => r.id)
  const known = new Set(all)
  if (!ids.every((id) => known.has(id))) return false
  const listed = new Set(ids)
  const order = [...ids, ...all.filter((id) => !listed.has(id))]
  const update = db.prepare(`UPDATE ${entity} SET sort_order = ? WHERE id = ?`)
  db.exec('BEGIN IMMEDIATE')
  try {
    order.forEach((id, i) => update.run(i, id))
    db.exec('COMMIT')
  } catch (err) {
    db.exec('ROLLBACK')
    throw err
  }
  return true
}

export function removeItem(db: DatabaseSync, entity: Entity, id: number): 'ok' | 'not_found' | 'not_archived' {
  const item = getItem(db, entity, id)
  if (!item) return 'not_found'
  if (item.status !== 'archived') return 'not_archived'
  db.prepare(`DELETE FROM ${entity} WHERE id = ?`).run(id)
  return 'ok'
}

type En = Record<string, unknown>

function localize(row: Row, entity: Entity, lang: Lang): Record<string, unknown> {
  const data = JSON.parse(row.data) as Record<string, unknown>
  const en = lang === 'en' ? ((JSON.parse(row.i18n || '{}') as { en?: En }).en ?? {}) : {}
  const merged: Record<string, unknown> = { ...data }
  for (const [key, value] of Object.entries(en)) {
    const filled = Array.isArray(value) ? value.length > 0 : typeof value === 'string' ? value.trim() !== '' : false
    if (filled) merged[key] = value
  }
  return entity === 'experience' ? { id: row.id, ...merged } : merged
}

/** Contenido publicado con el idioma ya fusionado; conserva `githubRepo` para que el llamador lo retire. */
export function publicContent(db: DatabaseSync, lang: Lang = 'es') {
  const published = (entity: Entity) =>
    (db.prepare(`SELECT * FROM ${entity} WHERE status = 'published' ORDER BY sort_order, id`).all() as Row[]).map((r) =>
      localize(r, entity, lang),
    )
  return { projects: published('projects'), services: published('services'), experience: published('experience') }
}

function unwrap<T>(entity: string, result: Result<T>): T {
  if (!result.ok) throw new Error(`Siembra inválida (${entity}): ${JSON.stringify(result.fields)}`)
  return result.value
}

const seedInputs = (entity: Entity, mediaDir: string | null = null): (object & { i18n: object })[] =>
  ({
    projects: () =>
      PROJECTS_SEED.map((p) => {
        const value = unwrap('projects', validateProject({ ...p }))
        return mediaDir === null ? value : { ...value, images: resolveSeedUrls(mediaDir, value.images), videos: resolveSeedUrls(mediaDir, value.videos) }
      }),
    services: () => SERVICES_SEED.map((x) => unwrap('services', validateService({ ...x }))),
    experience: () => EXPERIENCE_SEED.map((e) => unwrap('experience', validateExperience({ ...e }))),
  })[entity]() as (object & { i18n: object })[]

/** Rellena una sola vez el inglés vacío de las filas existentes desde la siembra, sin pisar ediciones. */
export function backfillI18n(db: DatabaseSync): void {
  for (const entity of ENTITIES) {
    const flag = `i18n-en:${entity}`
    if (db.prepare('SELECT 1 FROM meta WHERE key = ?').get(flag)) continue
    const key = entity === 'experience' ? 'title' : 'slug'
    const byKey = new Map(seedInputs(entity).map((input) => [(input as Record<string, unknown>)[key], input.i18n as { en?: object }]))
    const rows = db.prepare(`SELECT id, data, i18n FROM ${entity}`).all() as { id: number; data: string; i18n: string }[]
    const update = db.prepare(`UPDATE ${entity} SET i18n = ? WHERE id = ?`)
    db.exec('BEGIN IMMEDIATE')
    try {
      for (const row of rows) {
        const current = JSON.parse(row.i18n || '{}') as { en?: object }
        if (current.en && Object.keys(current.en).length > 0) continue
        const seed = byKey.get((JSON.parse(row.data) as Record<string, unknown>)[key])
        if (seed?.en && Object.keys(seed.en).length > 0) update.run(JSON.stringify({ ...current, en: seed.en }), row.id)
      }
      db.prepare('INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)').run(flag, String(Date.now()))
      db.exec('COMMIT')
    } catch (err) {
      db.exec('ROLLBACK')
      throw err
    }
  }
}

export const GITHUB_REPOS_FLAG = 'github-repos'

/** Asigna una sola vez el repo de la siembra (por slug) a los proyectos sin uno; nunca pisa un valor. Devuelve cuántos cambió. */
export function migrateGithubRepos(db: DatabaseSync): number {
  if (db.prepare('SELECT 1 FROM meta WHERE key = ?').get(GITHUB_REPOS_FLAG)) return 0
  const bySlug = new Map(PROJECTS_SEED.map((p) => [p.slug, p.githubRepo]))
  const rows = db.prepare('SELECT id, slug, data FROM projects').all() as { id: number; slug: string | null; data: string }[]
  const update = db.prepare('UPDATE projects SET data = ?, updated_at = ? WHERE id = ?')
  let changed = 0
  db.exec('BEGIN IMMEDIATE')
  try {
    for (const row of rows) {
      const repo = row.slug ? bySlug.get(row.slug) : null
      const data = JSON.parse(row.data) as Record<string, unknown>
      if (!repo || (typeof data.githubRepo === 'string' && data.githubRepo !== '')) continue
      update.run(JSON.stringify({ ...data, githubRepo: repo }), Date.now(), row.id)
      changed++
    }
    if (changed > 0) {
      recordAudit(db, { email: null, ip: 'system', action: 'github.migrate', entity: 'projects', entityId: null, summary: `Asignó repositorio de GitHub a ${changed} proyectos` })
    }
    db.prepare('INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)').run(GITHUB_REPOS_FLAG, String(Date.now()))
    db.exec('COMMIT')
  } catch (err) {
    db.exec('ROLLBACK')
    throw err
  }
  return changed
}

/** Siembra una sola vez por entidad: si el admin borra todo, no se vuelve a sembrar. */
export function seedContent(db: DatabaseSync, mediaDir: string, now = Date.now()): void {
  for (const entity of ENTITIES) {
    const flag = `seeded:${entity}`
    if (db.prepare('SELECT 1 FROM meta WHERE key = ?').get(flag)) continue
    const empty = (db.prepare(`SELECT COUNT(*) AS n FROM ${entity}`).get() as { n: number }).n === 0
    if (empty) {
      const items = seedInputs(entity, mediaDir)
      db.exec('BEGIN IMMEDIATE')
      try {
        items.forEach((input, i) => insert(db, entity, input, 'published', i, now))
        db.exec('COMMIT')
      } catch (err) {
        db.exec('ROLLBACK')
        throw err
      }
    }
    db.prepare('INSERT INTO meta (key, value) VALUES (?, ?)').run(flag, String(now))
  }
  backfillI18n(db)
}
