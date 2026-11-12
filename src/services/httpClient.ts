import type { ProblemDetail } from '@/types'
import { loadToken, notifyUnauthorized } from './authToken'
import { clearCache, dedupe, readCache, writeCache } from './cache'

const BASE_URL: string = import.meta.env.VITE_API_URL ?? '/api/v1'

/**
 * El backend tarda hasta 60 s en la primera escritura de ms-04 o el primer
 * listado de ms-02: el margen debe cubrir esa latencia conocida.
 */
const READ_TIMEOUT_MS = 45_000
const WRITE_TIMEOUT_MS = 90_000

/** Escrituras que no cambian nada de lo que la UI lee: no invalidan la caché. */
const CACHE_NEUTRAL_WRITES = /\/interactions\/view\//

/** Parámetros de query string; los valores vacíos se omiten. */
export type QueryParams = Record<
  string,
  string | number | boolean | null | undefined
>

export interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown
  query?: QueryParams
  /** Milisegundos antes de abortar. Por defecto 45 s en lectura y 90 s en escritura. */
  timeoutMs?: number
}

/** El servidor no respondió dentro del plazo: no es un fallo de red. */
export class RequestTimeoutError extends Error {
  readonly timeoutMs: number

  constructor(timeoutMs: number) {
    super(`La petición superó ${timeoutMs} ms`)
    this.name = 'RequestTimeoutError'
    this.timeoutMs = timeoutMs
  }
}

export function isRequestTimeout(error: unknown): error is RequestTimeoutError {
  return error instanceof RequestTimeoutError
}

/** Error de la API con el código HTTP y el `ProblemDetail` del backend. */
export class ApiError extends Error {
  readonly status: number
  readonly payload: ProblemDetail | undefined

  constructor(message: string, status: number, payload?: ProblemDetail) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.payload = payload
  }

  /** Identificador estable del backend (`INVALID_CREDENTIALS`, ...). */
  get code(): string | undefined {
    return this.payload?.code
  }

  /** Errores por campo de las validaciones de Bean Validation. */
  get fieldErrors(): Record<string, string> | undefined {
    return this.payload?.errors
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError
}

function buildQuery(params?: QueryParams): string {
  if (!params) {
    return ''
  }

  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      search.set(key, String(value))
    }
  }

  const query = search.toString()
  return query === '' ? '' : `?${query}`
}

async function toApiError(response: Response): Promise<ApiError> {
  let payload: ProblemDetail | undefined

  try {
    const text = await response.text()
    payload = text === '' ? undefined : (JSON.parse(text) as ProblemDetail)
  } catch {
    // Respuesta de error sin cuerpo JSON.
  }

  const message =
    payload?.detail ?? payload?.title ?? `${response.status} ${response.statusText}`
  return new ApiError(message, response.status, payload)
}

async function request<T>(
  path: string,
  { body, query, headers: rawHeaders, timeoutMs, ...rest }: RequestOptions = {},
): Promise<T> {
  const headers = new Headers(rawHeaders)
  if (body !== undefined && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  const url = `${BASE_URL}${path}${buildQuery(query)}`
  const method = (rest.method ?? 'GET').toUpperCase()
  const cacheable = method === 'GET' || method === 'HEAD'
  const cacheKey = `${method} ${url}`

  if (cacheable) {
    const cached = readCache<T>(cacheKey)
    if (cached.found) {
      return cached.value as T
    }
  }

  const execute = async (): Promise<T> => {
    const payload = body === undefined ? undefined : JSON.stringify(body)
    const effectiveTimeout =
      timeoutMs ??
      (method === 'GET' || method === 'HEAD'
        ? READ_TIMEOUT_MS
        : WRITE_TIMEOUT_MS)

    const controller = new AbortController()
    const callerSignal = rest.signal
    if (callerSignal !== null && callerSignal !== undefined) {
      if (callerSignal.aborted) {
        controller.abort()
      } else {
        callerSignal.addEventListener('abort', () => controller.abort(), {
          once: true,
        })
      }
    }
    const timer = setTimeout(() => controller.abort(), effectiveTimeout)

    function send(token: string | null): Promise<Response> {
      const attemptHeaders = new Headers(headers)
      if (token !== null) {
        attemptHeaders.set('Authorization', `Bearer ${token}`)
      }

      return fetch(url, {
        ...rest,
        headers: attemptHeaders,
        body: payload,
        signal: controller.signal,
      })
    }

    try {
      const token = loadToken()
      let response = await send(token)

      if (response.status === 401 && token !== null) {
        // La sesión ya no sirve (expirada o revocada).
        notifyUnauthorized()

        // Varios endpoints responden también sin token: se reintenta anónimo
        // antes de dar el 401 por perdido.
        response = await send(null)
      }

      if (!response.ok) {
        throw await toApiError(response)
      }

      if (response.status === 204) {
        return undefined as T
      }

      const text = await response.text()
      return text === '' ? (undefined as T) : (JSON.parse(text) as T)
    } catch (cause) {
      if (controller.signal.aborted && callerSignal?.aborted !== true) {
        throw new RequestTimeoutError(effectiveTimeout)
      }

      throw cause
    } finally {
      clearTimeout(timer)
    }
  }

  const result = cacheable ? await dedupe(cacheKey, execute) : await execute()

  if (cacheable) {
    writeCache(cacheKey, result)
  } else if (!CACHE_NEUTRAL_WRITES.test(url)) {
    // Una mutación puede invalidar cualquier listado o ficha ya cacheada.
    clearCache()
  }

  return result
}

export const httpClient = {
  get: <T>(path: string, options?: RequestOptions) =>
    request<T>(path, { ...options, method: 'GET' }),

  post: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: 'POST', body }),

  put: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: 'PUT', body }),

  patch: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: 'PATCH', body }),

  delete: <T>(path: string, options?: RequestOptions) =>
    request<T>(path, { ...options, method: 'DELETE' }),
}
