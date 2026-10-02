import { createApp } from './app.ts'
import { loadConfig } from './config.ts'
import { openDb } from './db.ts'
import { initGeo } from './geo.ts'
import { purge } from './visits.ts'

const config = loadConfig(process.env)
const db = openDb(config.dbPath)
initGeo(config.geoDb)

if (!config.adminEmail || !config.adminPasswordHash) {
  console.warn('[server] ADMIN_EMAIL/ADMIN_PASSWORD_HASH vacíos: solo entra el admin ya guardado en la DB')
}

const runPurge = () => purge(db, Date.now(), config.auditRetentionDays)
runPurge()
const purgeTimer = setInterval(runPurge, 3_600_000)
purgeTimer.unref()

const server = createApp(config, db)
server.listen(config.port, config.host, () => {
  console.log(`[server] http://${config.host}:${config.port} (proxy de confianza: ${config.trustProxy})`)
})

process.on('SIGTERM', () => {
  clearInterval(purgeTimer)
  server.close(() => {
    db.close()
    process.exit(0)
  })
})
