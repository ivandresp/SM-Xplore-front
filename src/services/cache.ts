/**
 * Caché de respuestas GET en memoria, por pestaña: TTL corto + dedupe en vuelo.
 * Se vacía entera al cambiar de token y tras cualquier mutación (ver httpClient).
 */
export const DEFAULT_TTL_MS = 30_000

interface CacheEntry {
  expiresAt: number
  value: unknown
}

const entries = new Map<string, CacheEntry>()
const inflight = new Map<string, Promise<unknown>>()

export interface CachedValue<T> {
  found: boolean
  value: T | undefined
}

export function readCache<T>(key: string, now = Date.now()): CachedValue<T> {
  const entry = entries.get(key)
  if (entry === undefined) {
    return { found: false, value: undefined }
  }
  if (entry.expiresAt <= now) {
    entries.delete(key)
    return { found: false, value: undefined }
  }
  return { found: true, value: entry.value as T }
}

export function writeCache(
  key: string,
  value: unknown,
  ttlMs = DEFAULT_TTL_MS,
  now = Date.now(),
): void {
  entries.set(key, { expiresAt: now + ttlMs, value })
}

/** Si la clave ya se está pidiendo, devuelve esa misma promesa en vez de repetir la llamada. */
export function dedupe<T>(key: string, load: () => Promise<T>): Promise<T> {
  const running = inflight.get(key)
  if (running !== undefined) {
    return running as Promise<T>
  }

  const promise = load().finally(() => {
    inflight.delete(key)
  })
  inflight.set(key, promise)
  return promise
}

export function clearCache(): void {
  entries.clear()
  inflight.clear()
}

export function cacheSize(): number {
  return entries.size
}
