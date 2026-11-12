import { clearCache } from './cache'

const SESSION_KEY = 'sm-xplore:session'

interface StoredSession {
  token: string
  /** ISO-8601 del vencimiento que informa el backend (`expiresAt`). */
  expiresAt: string
}

let cached: StoredSession | null | undefined
let unauthorizedHandler: (() => void) | null = null

/**
 * Sesión en `sessionStorage` y no en `localStorage`: mismo riesgo de XSS en
 * ambos, pero la pestaña cerrada no deja el token guardado en el equipo.
 */
function readSession(): StoredSession | null {
  if (cached !== undefined) {
    return cached
  }

  cached = null
  try {
    const raw = window.sessionStorage.getItem(SESSION_KEY)
    if (raw !== null) {
      const parsed = JSON.parse(raw) as Partial<StoredSession>
      if (typeof parsed.token === 'string' && typeof parsed.expiresAt === 'string') {
        cached = { token: parsed.token, expiresAt: parsed.expiresAt }
      }
    }
  } catch {
    // Sesión ilegible: se trata como si no hubiera.
  }

  return cached
}

/** Token vigente, o `null` si no hay sesión o ya venció. */
export function loadToken(): string | null {
  const session = readSession()
  if (session === null) {
    return null
  }

  const expiresAt = Date.parse(session.expiresAt)
  if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
    clearToken()
    return null
  }

  return session.token
}

export function saveToken(token: string, expiresAt: string) {
  // Otra cuenta no puede ver la caché de la anterior.
  clearCache()
  cached = { token, expiresAt }
  window.sessionStorage.setItem(SESSION_KEY, JSON.stringify(cached))
}

export function clearToken() {
  cached = null
  window.sessionStorage.removeItem(SESSION_KEY)
  clearCache()
}

/** Lo registra AuthProvider para cerrar sesión cuando la API responde 401. */
export function onUnauthorized(handler: () => void) {
  unauthorizedHandler = handler
}

export function notifyUnauthorized() {
  unauthorizedHandler?.()
}
