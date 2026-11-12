import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError, RequestTimeoutError } from '@/services/httpClient'
import { describeApiError, logApiError } from './errors'

function apiError(status: number, code?: string, detail = 'English detail') {
  return new ApiError(detail, status, {
    title: 'Title',
    status,
    detail,
    ...(code === undefined ? {} : { code }),
  })
}

describe('describeApiError', () => {
  it('solo culpa a la red cuando el fallo es de red', () => {
    expect(describeApiError(new TypeError('Failed to fetch'))).toContain(
      'No pudimos conectar con el servidor',
    )
  })

  it('no disfraza un bug de programación de error de conexión', () => {
    const message = describeApiError(
      new TypeError('activities.filter is not a function'),
    )

    expect(message).not.toContain('No pudimos conectar')
    expect(message).toContain('error inesperado')
  })

  it('nunca muestra el detalle crudo del backend en un 409', () => {
    const message = describeApiError(
      apiError(409, undefined, 'Attendance can only be registered after the item has started.'),
    )

    expect(message).not.toContain('Attendance')
    expect(message).toContain('vuelve a intentarlo')
  })

  it('traduce por código estable', () => {
    expect(
      describeApiError(apiError(409, 'INVALID_STATUS_TRANSITION')),
    ).toContain('no es válida con el estado actual')
  })

  it('traduce un filtro inválido sin mostrar el detalle del backend', () => {
    const message = describeApiError(
      apiError(400, 'INVALID_FILTER', 'Failed to convert status=BASURA'),
    )

    expect(message).toContain('filtros no es válido')
    expect(message).not.toContain('BASURA')
  })

  it('dice cuánto esperar en un 429', () => {
    const error = new ApiError('Too many', 429, {
      title: 'Too Many Requests',
      status: 429,
      detail: 'Too many attempts',
      code: 'TOO_MANY_ATTEMPTS',
      retryAfterSeconds: 42,
    })

    expect(describeApiError(error)).toContain('42 segundos')
  })

  it('distingue el timeout del fallo de conexión', () => {
    const message = describeApiError(new RequestTimeoutError(45_000))

    expect(message).toContain('45 s')
    expect(message).not.toContain('No pudimos conectar')
  })

  it('explica un 405 sin mostrar el detalle crudo', () => {
    const message = describeApiError(
      apiError(405, undefined, 'Method Not Allowed'),
    )

    expect(message).toContain('no está disponible')
    expect(message).not.toContain('Method Not Allowed')
  })

  it('distingue el rate limit de los intentos de login', () => {
    expect(describeApiError(apiError(429, 'RATE_LIMIT_EXCEEDED'))).toContain(
      'Demasiadas solicitudes',
    )
  })

  it('traduce los códigos de permisos y sesión', () => {
    expect(describeApiError(apiError(403, 'ACCESS_DENIED'))).toContain('permiso')
    expect(describeApiError(apiError(401, 'UNAUTHORIZED'))).toContain(
      'Inicia sesión',
    )
    expect(describeApiError(apiError(403, 'MFA_ENROLLMENT_REQUIRED'))).toContain(
      'dos pasos',
    )
  })

  it('no llama error interno a un 503', () => {
    const message = describeApiError(apiError(503))

    expect(message).toContain('no está disponible')
    expect(message).not.toContain('error interno')
  })

  it('nunca muestra el texto en ingles del backend', () => {
    const message = describeApiError(
      apiError(409, undefined, 'Cannot change reservation from COMPLETED to COMPLETED'),
    )

    expect(message).not.toContain('COMPLETED')
    expect(message).toContain('conflicto')
  })
})
afterEach(() => {
  vi.restoreAllMocks()
})

/** Lo que lanza `parseResponse` (services/validate.ts) cuando el wire no cuadra. */
function contractError(label = 'GET /recommendations') {
  return new Error(
    `Respuesta inesperada de ${label}: [{"code":"invalid_value","path":["source"],"message":"Invalid option"}] `,
  )
}

describe('contrato roto', () => {
  it('da un mensaje accionable en vez del genérico de error inesperado', () => {
    const message = describeApiError(contractError())

    expect(message).toContain('formato que no reconocemos')
    expect(message).not.toContain('error inesperado')
    expect(message).toContain('Vuelve a intentarlo')
  })

  it('deja el cause en consola con la etiqueta del endpoint y los issues', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})

    logApiError(contractError(), 'recomendaciones')

    expect(spy).toHaveBeenCalledTimes(1)
    const printed = JSON.stringify(spy.mock.calls.map((call) => call[1]))
    expect(printed).toContain('GET /recommendations')
    expect(printed).toContain('invalid_value')
    expect(spy.mock.calls[0][0]).toContain('recomendaciones')
  })

  it('nunca escribe el detail crudo del backend en consola', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})

    logApiError(
      apiError(500, undefined, 'Cypher query failed at line 12 of Neo4jQueries'),
      'recomendaciones',
    )

    const printed = JSON.stringify(spy.mock.calls)
    expect(printed).not.toContain('Cypher')
    expect(printed).not.toContain('Neo4jQueries')
    expect(printed).toContain('500')
  })

  it('registra un fallo de red como red, no como bug', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})

    logApiError(new TypeError('Failed to fetch'), 'recomendaciones')

    const detail = spy.mock.calls[0][1] as { kind: string }
    expect(detail.kind).toBe('network')
  })

  it('registra el error desconocido tal cual para conservar el stack', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const bug = new TypeError('activities.filter is not a function')

    logApiError(bug, 'recomendaciones')

    const detail = spy.mock.calls[0][1] as { kind: string; error: unknown }
    expect(detail.kind).toBe('unexpected')
    expect(detail.error).toBe(bug)
  })
})
