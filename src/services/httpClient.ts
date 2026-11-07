import type { ProblemDetail } from '@/types'
import { loadToken, notifyUnauthorized } from './authToken'

const BASE_URL: string = import.meta.env.VITE_API_URL ?? '/api/v1'

/** Parámetros de query string; los valores vacíos se omiten. */
export type QueryParams = Record<
  string,
  string | number | boolean | null | undefined
>

export interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown
  query?: QueryParams
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
  { body, query, headers: rawHeaders, ...rest }: RequestOptions = {},
): Promise<T> {
  const headers = new Headers(rawHeaders)
  if (body !== undefined && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  const url = `${BASE_URL}${path}${buildQuery(query)}`
  const payload = body === undefined ? undefined : JSON.stringify(body)

  function send(token: string | null): Promise<Response> {
    const attemptHeaders = new Headers(headers)
    if (token !== null) {
      attemptHeaders.set('Authorization', `Bearer ${token}`)
    }

    return fetch(url, { ...rest, headers: attemptHeaders, body: payload })
  }

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
