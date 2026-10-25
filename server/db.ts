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
    CREATE TABLE IF NOT EXISTS clients (
      id INTEGER PRIMARY KEY, name TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'active',
      created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL, data TEXT NOT NULL);
    CREATE INDEX IF NOT EXISTS clients_status ON clients(status, name);
    CREATE TABLE IF NOT EXISTS contract_templates (
      id INTEGER PRIMARY KEY, kind TEXT NOT NULL, lang TEXT NOT NULL DEFAULT 'es', name TEXT NOT NULL,
      body TEXT NOT NULL, variables TEXT NOT NULL DEFAULT '[]', seed_key TEXT,
      created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS contracts (
      id INTEGER PRIMARY KEY, client_id INTEGER NOT NULL, parent_id INTEGER, template_id INTEGER,
      kind TEXT NOT NULL, lang TEXT NOT NULL DEFAULT 'es', title TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'draft', version INTEGER NOT NULL DEFAULT 0,
      body TEXT NOT NULL, variables TEXT NOT NULL DEFAULT '{}', content_hash TEXT,
      token_hash TEXT, token_expires INTEGER, sent_to TEXT, sent_at INTEGER, completed_at INTEGER, expires_at INTEGER,
      remind_days INTEGER NOT NULL DEFAULT 0, last_reminder INTEGER, reminders_sent INTEGER NOT NULL DEFAULT 0,
      pdf BLOB, data TEXT NOT NULL DEFAULT '{}', created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL);
    CREATE INDEX IF NOT EXISTS contracts_client ON contracts(client_id, created_at);
    CREATE UNIQUE INDEX IF NOT EXISTS contracts_token ON contracts(token_hash);
    CREATE INDEX IF NOT EXISTS contracts_status ON contracts(status, expires_at);
    CREATE TABLE IF NOT EXISTS contract_versions (
      id INTEGER PRIMARY KEY, contract_id INTEGER NOT NULL, version INTEGER NOT NULL,
      rendered TEXT NOT NULL, variables TEXT NOT NULL, content_hash TEXT NOT NULL, note TEXT, created_at INTEGER NOT NULL);
    CREATE INDEX IF NOT EXISTS contract_versions_doc ON contract_versions(contract_id, version);
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
