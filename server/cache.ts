const entries = new Map<string, { value: unknown; expires: number }>()
const MAX_ENTRIES = 500

export function memo<T>(key: string, ttlMs: number, fn: () => T): T {
  const now = Date.now()
  const cached = entries.get(key)
  if (cached && cached.expires > now) return cached.value as T
  const value = fn()
  if (entries.size >= MAX_ENTRIES) {
    for (const [k, e] of entries) if (e.expires <= now) entries.delete(k)
    if (entries.size >= MAX_ENTRIES) entries.clear()
  }
  entries.set(key, { value, expires: now + ttlMs })
  return value
}

export function clearCache(): void {
  entries.clear()
}
