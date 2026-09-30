const buckets = new Map<string, { n: number; reset: number }>()

/** Devuelve true si la petición cabe en el límite de la ventana, false si hay que rechazarla. */
export function hit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now()
  const bucket = buckets.get(key)
  if (!bucket || bucket.reset <= now) {
    buckets.set(key, { n: 1, reset: now + windowMs })
    return true
  }
  bucket.n += 1
  return bucket.n <= limit
}

export function resetBuckets(): void {
  buckets.clear()
}

const sweeper = setInterval(() => {
  const now = Date.now()
  for (const [key, bucket] of buckets) if (bucket.reset <= now) buckets.delete(key)
}, 5 * 60_000)
sweeper.unref()
