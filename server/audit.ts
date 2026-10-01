import type { DatabaseSync } from 'node:sqlite'

export type AuditEntry = {
  email: string | null
  ip: string
  action: string
  entity: string | null
  entityId: number | null
  summary: string
}

export function recordAudit(db: DatabaseSync, entry: AuditEntry, now = Date.now()): void {
  db.prepare(
    'INSERT INTO audit_log (ts, email, ip, action, entity, entity_id, summary) VALUES (?, ?, ?, ?, ?, ?, ?)',
  ).run(now, entry.email, entry.ip, entry.action, entry.entity, entry.entityId, entry.summary.slice(0, 300))
}

export function listAudit(
  db: DatabaseSync,
  opts: { limit: number; before: number | null; action: string | null; entity: string | null },
) {
  return db
    .prepare(
      `SELECT id, ts, email, ip, action, entity, entity_id AS entityId, summary FROM audit_log
       WHERE ts < ? AND (? IS NULL OR action = ?) AND (? IS NULL OR entity = ?)
       ORDER BY ts DESC, id DESC LIMIT ?`,
    )
    .all(opts.before ?? Number.MAX_SAFE_INTEGER, opts.action, opts.action, opts.entity, opts.entity, opts.limit)
}
