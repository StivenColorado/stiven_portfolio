import { readFileSync, statSync } from 'node:fs'
import { join, normalize, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { DatabaseSync } from 'node:sqlite'
import { recordAudit } from './audit.ts'
import { detectMedia, saveMedia } from './media.ts'

export const SEED_MEDIA_DIR = fileURLToPath(new URL('./seed/media/', import.meta.url))
export const MIGRATED_FLAG = 'media-migrated'
const LEGACY = '/projects/'

export type MigrationSummary = { rows: number; urls: number; migrated: number; stored: number; reused: number; missing: string[] }

function readLegacy(url: string, publicDir: string | null): Buffer | null {
  const rel = normalize(decodeURIComponent(url.slice(LEGACY.length)))
  if (!rel || rel.startsWith('..') || rel.startsWith(sep)) return null
  const candidates = [join(SEED_MEDIA_DIR, rel), ...(publicDir ? [join(publicDir, 'projects', rel)] : [])]
  for (const path of candidates) {
    try {
      if (statSync(path).isFile()) return readFileSync(path)
    } catch {
      continue
    }
  }
  return null
}

/** Importa un archivo `/projects/...` a MEDIA_DIR con el mismo guardado que la subida del admin; null si no se encuentra. */
export function importLegacyUrl(mediaDir: string, url: string, publicDir: string | null = null): { url: string; reused: boolean } | null {
  if (!url.startsWith(LEGACY)) return null
  let data: Buffer | null
  try {
    data = readLegacy(url, publicDir)
  } catch {
    return null
  }
  const kind = data && detectMedia(data)
  if (!data || !kind) return null
  const { name, reused } = saveMedia(mediaDir, data, kind)
  return { url: `/api/media/${name}`, reused }
}

export function resolveSeedUrls(mediaDir: string, urls: string[]): string[] {
  return urls.map((url) => {
    const imported = importLegacyUrl(mediaDir, url)
    if (!imported) console.warn(`[media] sin archivo de siembra para ${url}`)
    return imported?.url ?? url
  })
}

export function migrateMedia(db: DatabaseSync, mediaDir: string, publicDir: string | null): MigrationSummary {
  const summary: MigrationSummary = { rows: 0, urls: 0, migrated: 0, stored: 0, reused: 0, missing: [] }
  const cache = new Map<string, string | null>()
  const convert = (url: string): string => {
    if (!url.startsWith(LEGACY)) return url
    summary.urls++
    if (!cache.has(url)) {
      const imported = importLegacyUrl(mediaDir, url, publicDir)
      if (imported) summary[imported.reused ? 'reused' : 'stored']++
      cache.set(url, imported?.url ?? null)
    }
    const target = cache.get(url) ?? null
    if (target) summary.migrated++
    else if (!summary.missing.includes(url)) {
      summary.missing.push(url)
      console.warn(`[media] no se encontró ${url}; se deja la URL original`)
    }
    return target ?? url
  }

  const rows = db.prepare('SELECT id, data FROM projects').all() as { id: number; data: string }[]
  const update = db.prepare('UPDATE projects SET data = ? WHERE id = ?')
  db.exec('BEGIN IMMEDIATE')
  try {
    for (const row of rows) {
      const data = JSON.parse(row.data) as { images?: string[]; videos?: string[] }
      const before = summary.migrated
      if (Array.isArray(data.images)) data.images = data.images.map(convert)
      if (Array.isArray(data.videos)) data.videos = data.videos.map(convert)
      if (summary.migrated > before) {
        update.run(JSON.stringify(data), row.id)
        summary.rows++
      }
    }
    db.exec('COMMIT')
  } catch (err) {
    db.exec('ROLLBACK')
    throw err
  }
  return summary
}

export const describeMigration = (s: MigrationSummary): string =>
  `Migró ${s.migrated} URL en ${s.rows} proyectos (${s.stored} archivos nuevos, ${s.reused} reutilizados, ${s.missing.length} faltantes)`

export function recordMigration(db: DatabaseSync, summary: MigrationSummary): void {
  recordAudit(db, { email: null, ip: 'system', action: 'media.migrate', entity: 'media', entityId: null, summary: describeMigration(summary) })
}

/** Corre una sola vez; si quedan archivos sin encontrar no marca el flag, para reintentar con otro PUBLIC_DIR. */
export function migrateMediaOnce(db: DatabaseSync, mediaDir: string, publicDir: string | null): MigrationSummary | null {
  if (db.prepare('SELECT 1 FROM meta WHERE key = ?').get(MIGRATED_FLAG)) return null
  const summary = migrateMedia(db, mediaDir, publicDir)
  if (summary.migrated > 0 || summary.missing.length > 0) recordMigration(db, summary)
  if (summary.missing.length === 0) db.prepare('INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)').run(MIGRATED_FLAG, String(Date.now()))
  return summary
}
