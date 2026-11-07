import { describe, expect, it } from 'vitest'
import { describeApiError } from './errors'

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
})
