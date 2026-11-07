import { describe, expect, it } from 'vitest'
import { ApiError } from '@/services/httpClient'
import { describeApiError } from './errors'

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
      'No se pudo conectar con el backend',
    )
  })

  it('no disfraza un bug de programación de error de conexión', () => {
    const message = describeApiError(
      new TypeError('activities.filter is not a function'),
    )

    expect(message).not.toContain('No se pudo conectar')
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
})
