/**
 * Caché de respuestas GET en memoria, por pestaña: TTL corto + dedupe en vuelo.
 * Se vacía entera al cambiar de token y tras cualquier mutación (ver httpClient).
 */
export const DEFAULT_TTL_MS = 30_000

/** Tope de entradas vivas: por encima se purgan las expiradas y luego la más antigua. */
const MAX_ENTRIES = 200

interface CacheEntry {
  expiresAt: number
  value: unknown
}

const entries = new Map<string, CacheEntry>()
const inflight = new Map<string, Promise<unknown>>()
let generation = 0

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
  prune(now)
  entries.set(key, { expiresAt: now + ttlMs, value })
}

/**
 * Escribe solo si la caché no se limpió desde que empezó la petición. Evita que
 * la respuesta en vuelo de una cuenta acabe sirviéndose a la siguiente.
 */
export function writeCacheIfCurrent(
  key: string,
  value: unknown,
  expectedGeneration: number,
  ttlMs = DEFAULT_TTL_MS,
): boolean {
  if (expectedGeneration !== generation) {
    return false
  }
  writeCache(key, value, ttlMs)
  return true
}

export function cacheGeneration(): number {
  return generation
}

/** Si la clave ya se está pidiendo, devuelve esa misma promesa en vez de repetir la llamada. */
export function dedupe<T>(key: string, load: () => Promise<T>): Promise<T> {
  const running = inflight.get(key)
  if (running !== undefined) {
    return running as Promise<T>
  }

  const promise = load().finally(() => {
    // La limpieza pudo reemplazar esta promesa por otra: no borres la nueva.
    if (inflight.get(key) === promise) {
      inflight.delete(key)
    }
  })
  inflight.set(key, promise)
  return promise
}

export function clearCache(): void {
  generation += 1
  entries.clear()
  inflight.clear()
}

export function cacheSize(): number {
  return entries.size
}

function prune(now: number): void {
  if (entries.size < MAX_ENTRIES) {
    return
  }
  for (const [key, entry] of entries) {
    if (entry.expiresAt <= now) {
      entries.delete(key)
    }
  }
  while (entries.size >= MAX_ENTRIES) {
    const oldest = entries.keys().next().value
    if (oldest === undefined) {
      return
    }
    entries.delete(oldest)
  }
}
