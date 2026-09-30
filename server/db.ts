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
    CREATE TABLE IF NOT EXISTS admins (
      email TEXT PRIMARY KEY, password_hash TEXT NOT NULL, updated INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS reset_tokens (
      hash TEXT PRIMARY KEY, email TEXT NOT NULL, expires INTEGER NOT NULL, used INTEGER NOT NULL DEFAULT 0);
  `)
  migrateSessions(db)
  return db
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
