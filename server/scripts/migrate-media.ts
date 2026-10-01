import { loadConfig } from '../config.ts'
import { openDb } from '../db.ts'
import { describeMigration, migrateMedia, recordMigration } from '../media-migrate.ts'

const config = loadConfig(process.env)
const publicDir = process.argv[2] || config.publicDir || null
const db = openDb(config.dbPath)
const summary = migrateMedia(db, config.mediaDir, publicDir)
recordMigration(db, summary)
console.log(describeMigration(summary))
for (const url of summary.missing) console.log(`  falta: ${url}`)
db.close()
