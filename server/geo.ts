import { readFileSync } from 'node:fs'
import { Reader } from 'mmdb-lib'
import type { CityResponse } from 'mmdb-lib'

export type GeoResult = { country: string | null; city: string | null }

const LRU_SIZE = 5000
const NONE: GeoResult = { country: null, city: null }
const lru = new Map<string, GeoResult>()
let reader: Reader<CityResponse> | null = null

/** Si la base no existe el server arranca igual y todo lookup devuelve nulos. */
export function initGeo(path: string): boolean {
  lru.clear()
  try {
    reader = new Reader<CityResponse>(readFileSync(path))
    return true
  } catch (err) {
    reader = null
    console.error(`[geo] base no disponible (${path}): ${(err as Error).message}`)
    return false
  }
}

export function geoReady(): boolean {
  return reader !== null
}

export function lookup(ip: string): GeoResult {
  if (!reader) return NONE
  const cached = lru.get(ip)
  if (cached) {
    lru.delete(ip)
    lru.set(ip, cached)
    return cached
  }
  let result = NONE
  try {
    const rec = reader.get(ip)
    if (rec) {
      result = {
        country: rec.country?.iso_code ?? null,
        city: rec.city?.names?.en ?? null,
      }
    }
  } catch {
    result = NONE
  }
  if (lru.size >= LRU_SIZE) lru.delete(lru.keys().next().value as string)
  lru.set(ip, result)
  return result
}
