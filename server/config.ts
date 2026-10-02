export type Config = {
  port: number
  host: string
  dbPath: string
  geoDb: string
  adminEmail: string
  adminPasswordHash: string
  publicUrl: string
  mailFrom: string
  mailReplyTo: string
  brevoApiKey: string
  isProd: boolean
  trustProxy: boolean
  auditRetentionDays: number
  mediaDir: string
  publicDir: string
  githubToken: string
  sessionHours: number
  cookieSecure: boolean
}

function int(value: string | undefined, fallback: number): number {
  const n = Number.parseInt(value ?? '', 10)
  return Number.isFinite(n) && n > 0 ? n : fallback
}

export function loadConfig(env: Record<string, string | undefined>): Config {
  return {
    port: int(env.PORT, 3001),
    host: env.HOST || '127.0.0.1',
    dbPath: env.DB_PATH || 'server/data/visits.sqlite',
    geoDb: env.GEO_DB || 'server/data/dbip-city-lite.mmdb',
    adminEmail: (env.ADMIN_EMAIL ?? '').trim().toLowerCase(),
    adminPasswordHash: env.ADMIN_PASSWORD_HASH ?? '',
    publicUrl: (env.PUBLIC_URL || 'http://localhost:5173').replace(/\/+$/, ''),
    mailFrom: env.MAIL_FROM || 'Stiven Colorado <no-reply@negocioempresarial.online>',
    mailReplyTo: env.MAIL_REPLY_TO ?? '',
    brevoApiKey: env.BREVO_API_KEY ?? '',
    isProd: env.NODE_ENV === 'production',
    trustProxy: env.TRUST_PROXY === '1',
    auditRetentionDays: int(env.AUDIT_RETENTION_DAYS, 365),
    mediaDir: env.MEDIA_DIR || 'server/data/media',
    publicDir: env.PUBLIC_DIR ?? '',
    githubToken: (env.GITHUB_TOKEN ?? '').trim(),
    sessionHours: int(env.SESSION_HOURS, 12),
    cookieSecure: env.COOKIE_SECURE !== '0',
  }
}
