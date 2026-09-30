import type { DatabaseSync } from 'node:sqlite'
import { lookup } from './geo.ts'
import { parseUA } from './ua.ts'

export type TrackInput = {
  ip: string
  ua: string
  platform?: string
  mobile?: string
  path: string
  ref?: string
  touch: boolean
}

export function recordVisit(db: DatabaseSync, input: TrackInput, now = Date.now()): void {
  const { os, device } = parseUA(input.ua, { platform: input.platform, mobile: input.mobile }, input.touch)
  const { country, city } = lookup(input.ip)
  db.prepare(
    'INSERT INTO visits (ts, ip, country, city, ua, os, device, path, referrer) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
  ).run(now, input.ip, country, city, input.ua.slice(0, 300), os, device, input.path, input.ref || null)
}

export function purge(db: DatabaseSync, retentionDays: number, now = Date.now()): void {
  db.prepare('DELETE FROM visits WHERE ts < ?').run(now - retentionDays * 86_400_000)
  db.prepare('DELETE FROM sessions WHERE expires <= ?').run(now)
  db.prepare('DELETE FROM reset_tokens WHERE expires <= ? OR used = 1').run(now)
}

export function listVisits(db: DatabaseSync, limit: number, before: number | null) {
  return db
    .prepare(
      'SELECT id, ts, ip, country, city, ua, os, device, path, referrer FROM visits WHERE ts < ? ORDER BY ts DESC, id DESC LIMIT ?',
    )
    .all(before ?? Number.MAX_SAFE_INTEGER, limit)
}

function top(db: DatabaseSync, column: 'country' | 'path' | 'referrer' | 'os' | 'device', since: number, limit: number) {
  return db
    .prepare(
      `SELECT ${column} AS key, COUNT(*) AS n FROM visits WHERE ts >= ? AND ${column} IS NOT NULL GROUP BY ${column} ORDER BY n DESC LIMIT ?`,
    )
    .all(since, limit)
}

export function stats(db: DatabaseSync, days: number, now = Date.now()) {
  const since = now - days * 86_400_000
  const total = db.prepare('SELECT COUNT(*) AS n FROM visits WHERE ts >= ?').get(since) as { n: number }
  const byDay = db
    .prepare(
      "SELECT strftime('%Y-%m-%d', ts / 1000, 'unixepoch') AS day, COUNT(*) AS n FROM visits WHERE ts >= ? GROUP BY day ORDER BY day",
    )
    .all(since)
  return {
    days,
    total: total.n,
    byDay,
    countries: top(db, 'country', since, 5),
    paths: top(db, 'path', since, 5),
    referrers: top(db, 'referrer', since, 5),
    os: top(db, 'os', since, 10),
    devices: top(db, 'device', since, 10),
  }
}

const FILTER_TEXT = ['os', 'device', 'country', 'path'] as const
const FILTER_TS = ['from', 'to'] as const

export type DeleteSpec =
  | { kind: 'ids'; ids: number[] }
  | { kind: 'ip'; ip: string }
  | { kind: 'filter'; where: string; params: (string | number)[] }

const isPlainObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v)

function parseFilter(raw: unknown): DeleteSpec | null {
  if (!isPlainObject(raw)) return null
  const clauses: string[] = []
  const params: (string | number)[] = []
  for (const [key, value] of Object.entries(raw)) {
    if ((FILTER_TEXT as readonly string[]).includes(key)) {
      if (typeof value !== 'string' || value.length === 0 || value.length > 200) return null
      clauses.push(`${key} = ?`)
      params.push(value)
    } else if ((FILTER_TS as readonly string[]).includes(key)) {
      if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) return null
      clauses.push(key === 'from' ? 'ts >= ?' : 'ts <= ?')
      params.push(value)
    } else return null
  }
  return clauses.length === 0 ? null : { kind: 'filter', where: clauses.join(' AND '), params }
}

/** Acepta exactamente una de las formas {ids}, {filter} o {ip}; cualquier otra (o un filtro vacío) devuelve null. */
export function parseDeleteSpec(body: Record<string, unknown>): DeleteSpec | null {
  const keys = Object.keys(body).filter((k) => k !== 'dryRun')
  if (keys.length !== 1) return null
  const [key] = keys
  const value = body[key as string]
  if (key === 'ids') {
    if (!Array.isArray(value) || value.length < 1 || value.length > 500) return null
    if (!value.every((n) => typeof n === 'number' && Number.isSafeInteger(n) && n > 0)) return null
    return { kind: 'ids', ids: [...new Set(value as number[])] }
  }
  if (key === 'ip') {
    return typeof value === 'string' && value.length >= 1 && value.length <= 45 ? { kind: 'ip', ip: value } : null
  }
  if (key === 'filter') return parseFilter(value)
  return null
}

function target(spec: DeleteSpec): { where: string; params: (string | number)[] } {
  if (spec.kind === 'ids') return { where: `id IN (${spec.ids.map(() => '?').join(',')})`, params: spec.ids }
  if (spec.kind === 'ip') return { where: 'ip = ?', params: [spec.ip] }
  return spec
}

export function countMatching(db: DatabaseSync, spec: DeleteSpec): number {
  const { where, params } = target(spec)
  return (db.prepare(`SELECT COUNT(*) AS n FROM visits WHERE ${where}`).get(...params) as { n: number }).n
}

export function deleteVisits(db: DatabaseSync, spec: DeleteSpec): number {
  const { where, params } = target(spec)
  return Number(db.prepare(`DELETE FROM visits WHERE ${where}`).run(...params).changes)
}
