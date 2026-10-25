import type { IncomingMessage, ServerResponse } from 'node:http'

const MAX_BODY = 1024
export const MINUTE = 60_000

export function send(res: ServerResponse, status: number, body?: unknown, extra: Record<string, string> = {}): void {
  const payload = body === undefined ? undefined : JSON.stringify(body)
  res.writeHead(status, {
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer',
    ...(payload ? { 'Content-Type': 'application/json; charset=utf-8' } : {}),
    ...extra,
  })
  res.end(payload)
}

export type Body = { tooBig: boolean; json: Record<string, unknown> | null }

export function readJson(req: IncomingMessage, max = MAX_BODY): Promise<Body> {
  return new Promise((resolve) => {
    const declared = Number(req.headers['content-length'] ?? 0)
    if (declared > max) {
      req.resume()
      resolve({ tooBig: true, json: null })
      return
    }
    const chunks: Buffer[] = []
    let size = 0
    let tooBig = false
    req.on('data', (chunk: Buffer) => {
      size += chunk.length
      if (size > max) tooBig = true
      else chunks.push(chunk)
    })
    req.on('error', () => resolve({ tooBig, json: null }))
    req.on('end', () => {
      if (tooBig) return resolve({ tooBig, json: null })
      try {
        const parsed: unknown = JSON.parse(Buffer.concat(chunks).toString('utf8'))
        const isObject = typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)
        resolve({ tooBig, json: isObject ? (parsed as Record<string, unknown>) : null })
      } catch {
        resolve({ tooBig, json: null })
      }
    })
  })
}

export function readBuffer(req: IncomingMessage, max: number): Promise<Buffer | null> {
  return new Promise((resolve) => {
    const chunks: Buffer[] = []
    let size = 0
    let tooBig = false
    req.on('data', (chunk: Buffer) => {
      size += chunk.length
      if (size > max) {
        tooBig = true
        chunks.length = 0
      } else if (!tooBig) chunks.push(chunk)
    })
    req.on('error', () => resolve(null))
    req.on('end', () => resolve(tooBig ? null : Buffer.concat(chunks)))
  })
}

export function header(req: IncomingMessage, name: string): string {
  const v = req.headers[name]
  return (Array.isArray(v) ? v[0] : v) ?? ''
}

export function isSameOrigin(req: IncomingMessage): boolean {
  const site = header(req, 'sec-fetch-site')
  if (site) return site === 'same-origin'
  const origin = header(req, 'origin')
  if (!origin) return false
  try {
    return new URL(origin).host === header(req, 'host')
  } catch {
    return false
  }
}

export function clampInt(raw: string | null, min: number, max: number, fallback: number): number {
  const n = Number.parseInt(raw ?? '', 10)
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback
}

