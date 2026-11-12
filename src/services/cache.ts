export const DEFAULT_TTL_MS = 30_000

/** Tope de entradas vivas: por encima se purgan las expiradas y luego la mas antigua. */
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

export function readCache<T>(key: string): CachedValue<T> {
  const entry = entries.get(key)
  if (entry === undefined) {
    return { found: false, value: undefined }
  }
  if (entry.expiresAt <= Date.now()) {
    entries.delete(key)
    return { found: false, value: undefined }
  }
  return { found: true, value: entry.value as T }
}

export function writeCache(key: string, value: unknown, ttlMs = DEFAULT_TTL_MS): void {
  prune(Date.now())
  // Reescribir una clave la rejuvenece: Map conserva el orden de insercion.
  entries.delete(key)
  entries.set(key, { expiresAt: Date.now() + ttlMs, value })
}

/**
 * Escribe solo si la cache no se limpio desde que empezo la peticion. Evita que
 * la respuesta en vuelo de una cuenta acabe sirviendose a la siguiente.
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

/** Si la clave ya se esta pidiendo, devuelve esa misma promesa en vez de repetir la llamada. */
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
