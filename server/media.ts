import { createHash, randomBytes } from 'node:crypto'
import { mkdirSync, renameSync, statSync, writeFileSync, existsSync, unlinkSync } from 'node:fs'
import { join } from 'node:path'

export const MEDIA_NAME = /^[a-f0-9]{16}\.(webp|png|jpg|gif|webm|mp4)$/
export const MAX_IMAGE = 5 * 1024 * 1024
export const MAX_VIDEO = 30 * 1024 * 1024

export type MediaKind = { ext: 'webp' | 'png' | 'jpg' | 'gif' | 'webm' | 'mp4'; type: 'image' | 'video'; mime: string }

const KINDS: Record<MediaKind['ext'], MediaKind> = {
  webp: { ext: 'webp', type: 'image', mime: 'image/webp' },
  png: { ext: 'png', type: 'image', mime: 'image/png' },
  jpg: { ext: 'jpg', type: 'image', mime: 'image/jpeg' },
  gif: { ext: 'gif', type: 'image', mime: 'image/gif' },
  webm: { ext: 'webm', type: 'video', mime: 'video/webm' },
  mp4: { ext: 'mp4', type: 'video', mime: 'video/mp4' },
}

export const mimeOf = (name: string): string => KINDS[name.slice(name.lastIndexOf('.') + 1) as MediaKind['ext']]?.mime ?? 'application/octet-stream'

export function detectMedia(b: Buffer): MediaKind | null {
  const at = (off: number, s: string) => b.length >= off + s.length && b.toString('latin1', off, off + s.length) === s
  if (at(0, 'RIFF') && at(8, 'WEBP')) return KINDS.webp
  if (b.length >= 8 && b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return KINDS.png
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return KINDS.jpg
  if (at(0, 'GIF87a') || at(0, 'GIF89a')) return KINDS.gif
  if (b.length >= 4 && b.readUInt32BE(0) === 0x1a45dfa3) return KINDS.webm
  if (at(4, 'ftyp')) return KINDS.mp4
  return null
}

export function extensionMatches(filename: string, kind: MediaKind): boolean {
  const dot = filename.lastIndexOf('.')
  if (dot < 0) return true
  const ext = filename.slice(dot + 1).toLowerCase()
  return ext === kind.ext || (kind.ext === 'jpg' && ext === 'jpeg')
}

export function saveMedia(dir: string, data: Buffer, kind: MediaKind): { name: string; reused: boolean } {
  const name = `${createHash('sha256').update(data).digest('hex').slice(0, 16)}.${kind.ext}`
  const target = join(dir, name)
  if (existsSync(target)) return { name, reused: true }
  mkdirSync(dir, { recursive: true })
  const tmp = join(dir, `.tmp-${randomBytes(8).toString('hex')}`)
  try {
    writeFileSync(tmp, data, { flag: 'wx' })
    renameSync(tmp, target)
  } catch (err) {
    if (existsSync(tmp)) unlinkSync(tmp)
    throw err
  }
  return { name, reused: false }
}

export function mediaSize(dir: string, name: string): number | null {
  try {
    const st = statSync(join(dir, name))
    return st.isFile() ? st.size : null
  } catch {
    return null
  }
}

/** null: sin Range válido de un solo tramo (se sirve completo); 'invalid': no satisfacible. */
export function parseRange(header: string | undefined, size: number): { start: number; end: number } | 'invalid' | null {
  const m = /^bytes=(\d*)-(\d*)$/.exec((header ?? '').trim())
  if (!m || (m[1] === '' && m[2] === '')) return null
  let start: number
  let end: number
  if (m[1] === '') {
    const n = Number(m[2])
    if (n === 0) return 'invalid'
    start = Math.max(0, size - n)
    end = size - 1
  } else {
    start = Number(m[1])
    end = m[2] === '' ? size - 1 : Math.min(Number(m[2]), size - 1)
  }
  return start >= size || start > end ? 'invalid' : { start, end }
}
