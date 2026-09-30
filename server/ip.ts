import { isIP } from 'node:net'

type ReqLike = {
  headers: Record<string, string | string[] | undefined>
  socket: { remoteAddress?: string }
}

const LOOPBACK = new Set(['127.0.0.1', '::1'])

function normalize(addr: string): string {
  return addr.startsWith('::ffff:') ? addr.slice(7) : addr
}

/** X-Real-IP solo vale si TRUST_PROXY=1 y la conexión viene del proxy local; así no se falsifica pegando al puerto directo. */
export function clientIp(req: ReqLike, trustProxy: boolean): string {
  const remote = normalize(req.socket.remoteAddress ?? '')
  if (trustProxy && LOOPBACK.has(remote)) {
    const real = req.headers['x-real-ip']
    const value = (Array.isArray(real) ? real[0] : real)?.trim()
    if (value && isIP(value)) return normalize(value)
  }
  return remote || 'unknown'
}
