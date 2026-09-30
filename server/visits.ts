import { isIP } from 'node:net'
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
  | { kind: 'ips'; ips: string[] }
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

/** Acepta exactamente una de las formas {ids}, {ips}, {filter} o {ip}; cualquier otra (o un filtro vacío) devuelve null. */
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
  if (key === 'ips') {
    if (!Array.isArray(value) || value.length < 1 || value.length > 200) return null
    if (!value.every((v) => typeof v === 'string' && isIP(v) !== 0)) return null
    return { kind: 'ips', ips: [...new Set(value as string[])] }
  }
  if (key === 'filter') return parseFilter(value)
  return null
}

function target(spec: DeleteSpec): { where: string; params: (string | number)[] } {
  if (spec.kind === 'ids') return { where: `id IN (${spec.ids.map(() => '?').join(',')})`, params: spec.ids }
  if (spec.kind === 'ips') return { where: `ip IN (${spec.ips.map(() => '?').join(',')})`, params: spec.ips }
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

/** Traduce los filtros de la query string a un WHERE parametrizado; null si algún valor es inválido. */
export function filterFromQuery(q: URLSearchParams): { where: string; params: (string | number)[] } | null {
  const raw: Record<string, string | number> = {}
  for (const key of [...FILTER_TEXT, ...FILTER_TS]) {
    const v = q.get(key)
    if (v === null || v === '') continue
    if ((FILTER_TS as readonly string[]).includes(key)) {
      if (!/^\d{1,16}$/.test(v)) return null
      raw[key] = Number(v)
    } else raw[key] = v
  }
  if (Object.keys(raw).length === 0) return { where: '1=1', params: [] }
  const spec = parseFilter(raw)
  return spec && spec.kind === 'filter' ? { where: spec.where, params: spec.params } : null
}

export type Visitor = {
  ip: string
  visits: number
  firstSeen: number
  lastSeen: number
  country: string | null
  city: string | null
  os: string
  device: string
  oses: string[]
  devices: string[]
  paths: { key: string; n: number }[]
  referrers: string[]
}

const MAX_PATHS = 50
const MAX_REFERRERS = 20

export function listVisitors(
  db: DatabaseSync,
  filter: { where: string; params: (string | number)[] },
  limit: number,
  offset: number,
): Visitor[] {
  const { where, params } = filter
  const page = db
    .prepare(
      `SELECT ip, COUNT(*) AS visits, MIN(ts) AS firstSeen, MAX(ts) AS lastSeen FROM visits WHERE ${where} GROUP BY ip ORDER BY lastSeen DESC, ip LIMIT ? OFFSET ?`,
    )
    .all(...params, limit, offset) as { ip: string; visits: number; firstSeen: number; lastSeen: number }[]
  if (page.length === 0) return []

  const marks = page.map(() => '?').join(',')
  const ips = page.map((r) => r.ip)
  const inPage = `${where} AND ip IN (${marks})`
  const args = [...params, ...ips]

  const latest = db
    .prepare(
      `SELECT ip, country, city, os, device FROM (
         SELECT ip, country, city, os, device, ROW_NUMBER() OVER (PARTITION BY ip ORDER BY ts DESC, id DESC) AS rn
         FROM visits WHERE ${inPage}) WHERE rn = 1`,
    )
    .all(...args) as { ip: string; country: string | null; city: string | null; os: string; device: string }[]
  const paths = db
    .prepare(`SELECT ip, path AS key, COUNT(*) AS n FROM visits WHERE ${inPage} GROUP BY ip, path ORDER BY n DESC, key`)
    .all(...args) as { ip: string; key: string; n: number }[]
  const referrers = db
    .prepare(
      `SELECT ip, referrer FROM visits WHERE ${inPage} AND referrer IS NOT NULL GROUP BY ip, referrer ORDER BY MAX(ts) DESC`,
    )
    .all(...args) as { ip: string; referrer: string }[]
  const kinds = db
    .prepare(`SELECT ip, os, device FROM visits WHERE ${inPage} GROUP BY ip, os, device ORDER BY MAX(ts) DESC`)
    .all(...args) as { ip: string; os: string; device: string }[]

  const by = <T extends { ip: string }>(rows: T[]) => {
    const m = new Map<string, T[]>()
    for (const r of rows) m.set(r.ip, [...(m.get(r.ip) ?? []), r])
    return m
  }
  const latestBy = new Map(latest.map((r) => [r.ip, r]))
  const pathsBy = by(paths)
  const refsBy = by(referrers)
  const kindsBy = by(kinds)
  const uniq = (xs: string[]) => [...new Set(xs)]

  return page.map((r) => {
    const l = latestBy.get(r.ip)
    const k = kindsBy.get(r.ip) ?? []
    return {
      ...r,
      country: l?.country ?? null,
      city: l?.city ?? null,
      os: l?.os ?? 'other',
      device: l?.device ?? 'desktop',
      oses: uniq(k.map((x) => x.os)),
      devices: uniq(k.map((x) => x.device)),
      paths: (pathsBy.get(r.ip) ?? []).slice(0, MAX_PATHS).map(({ key, n }) => ({ key, n })),
      referrers: (refsBy.get(r.ip) ?? []).slice(0, MAX_REFERRERS).map((x) => x.referrer),
    }
  })
}

export function visitsOfIp(db: DatabaseSync, ip: string) {
  return db
    .prepare(
      'SELECT id, ts, ip, country, city, ua, os, device, path, referrer FROM visits WHERE ip = ? ORDER BY ts DESC, id DESC LIMIT 500',
    )
    .all(ip)
}
