import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { DatabaseSync } from 'node:sqlite'

export function openDb(path: string): DatabaseSync {
  if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true })
  const db = new DatabaseSync(path)
  db.exec(`
    PRAGMA journal_mode=WAL;
    PRAGMA busy_timeout=5000;
    CREATE TABLE IF NOT EXISTS visits (
      id INTEGER PRIMARY KEY, ts INTEGER NOT NULL,
      ip TEXT NOT NULL, country TEXT, city TEXT,
      ua TEXT, os TEXT, device TEXT, path TEXT NOT NULL, referrer TEXT);
    CREATE INDEX IF NOT EXISTS visits_ts ON visits(ts);
    CREATE INDEX IF NOT EXISTS visits_path ON visits(path);
    CREATE INDEX IF NOT EXISTS visits_ip ON visits(ip, ts);
    CREATE TABLE IF NOT EXISTS admins (
      email TEXT PRIMARY KEY, password_hash TEXT NOT NULL, updated INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS reset_tokens (
      hash TEXT PRIMARY KEY, email TEXT NOT NULL, expires INTEGER NOT NULL, used INTEGER NOT NULL DEFAULT 0);
    CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY, slug TEXT, status TEXT NOT NULL DEFAULT 'hidden',
      sort_order INTEGER NOT NULL DEFAULT 0, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL,
      data TEXT NOT NULL);
    CREATE INDEX IF NOT EXISTS projects_order ON projects(status, sort_order, id);
    CREATE TABLE IF NOT EXISTS services (
      id INTEGER PRIMARY KEY, slug TEXT, status TEXT NOT NULL DEFAULT 'hidden',
      sort_order INTEGER NOT NULL DEFAULT 0, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL,
      data TEXT NOT NULL);
    CREATE INDEX IF NOT EXISTS services_order ON services(status, sort_order, id);
    CREATE TABLE IF NOT EXISTS experience (
      id INTEGER PRIMARY KEY, slug TEXT, status TEXT NOT NULL DEFAULT 'hidden',
      sort_order INTEGER NOT NULL DEFAULT 0, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL,
      data TEXT NOT NULL);
    CREATE INDEX IF NOT EXISTS experience_order ON experience(status, sort_order, id);
    CREATE UNIQUE INDEX IF NOT EXISTS projects_slug ON projects(slug);
    CREATE UNIQUE INDEX IF NOT EXISTS services_slug ON services(slug);
    CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS audit_log (
      id INTEGER PRIMARY KEY, ts INTEGER NOT NULL, email TEXT, ip TEXT NOT NULL,
      action TEXT NOT NULL, entity TEXT, entity_id INTEGER, summary TEXT NOT NULL);
    CREATE INDEX IF NOT EXISTS audit_ts ON audit_log(ts);
  `)
  migrateSessions(db)
  migrateI18nColumn(db)
  return db
}

function migrateI18nColumn(db: DatabaseSync): void {
  for (const table of ['projects', 'services', 'experience']) {
    const cols = db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[]
    if (!cols.some((c) => c.name === 'i18n')) db.exec(`ALTER TABLE ${table} ADD COLUMN i18n TEXT NOT NULL DEFAULT '{}'`)
  }
}

/** Las sesiones son desechables: si vienen del esquema viejo (sin email) se recrean. */
function migrateSessions(db: DatabaseSync): void {
  const cols = db.prepare('PRAGMA table_info(sessions)').all() as { name: string }[]
  if (cols.length > 0 && !cols.some((c) => c.name === 'email')) db.exec('DROP TABLE sessions')
  db.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY, email TEXT NOT NULL, expires INTEGER NOT NULL);
    CREATE INDEX IF NOT EXISTS sessions_email ON sessions(email);
  `)
}

export function seedAdmin(db: DatabaseSync, email: string, passwordHash: string): void {
  if (!email || !passwordHash) return
  const row = db.prepare('SELECT COUNT(*) AS n FROM admins').get() as { n: number }
  if (row.n > 0) return
  db.prepare('INSERT INTO admins (email, password_hash, updated) VALUES (?, ?, ?)').run(email, passwordHash, Date.now())
}
