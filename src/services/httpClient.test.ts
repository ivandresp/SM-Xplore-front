import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError, httpClient } from './httpClient'
import { clearToken, loadToken, onUnauthorized, saveToken } from './authToken'

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('httpClient', () => {
  beforeEach(() => {
    clearToken()
    onUnauthorized(() => undefined)
  })

  afterEach(() => {
    clearToken()
    vi.unstubAllGlobals()
  })

  it('expone status, code y detail del ProblemDetail', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        jsonResponse(
          {
            title: 'Unauthorized',
            status: 401,
            detail: 'Credenciales inválidas',
            code: 'INVALID_CREDENTIALS',
          },
          401,
        ),
      ),
    )

    const error = (await httpClient
      .get('/users/me')
      .catch((cause) => cause)) as ApiError

    expect(error).toBeInstanceOf(ApiError)
    expect(error.status).toBe(401)
    expect(error.code).toBe('INVALID_CREDENTIALS')
    expect(error.message).toBe('Credenciales inválidas')
  })

  it('expone los errores por campo de una validación', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        jsonResponse(
          {
            detail: 'Los datos enviados no son válidos',
            code: 'VALIDATION_ERROR',
            errors: { password: 'El tamaño debe estar entre 12 y 72' },
          },
          400,
        ),
      ),
    )

    const error = (await httpClient
      .post('/auth/login', {})
      .catch((cause) => cause)) as ApiError

    expect(error.fieldErrors).toEqual({
      password: 'El tamaño debe estar entre 12 y 72',
    })
  })

  it('devuelve undefined en un 204', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(null, { status: 204 })),
    )

    await expect(httpClient.post('/users/me/logout')).resolves.toBeUndefined()
  })

  it('ante un 401 con token avisa de la sesión caída y reintenta sin token', async () => {
    saveToken('jwt-viejo', '2100-01-01T00:00:00Z')
    const handler = vi.fn()
    onUnauthorized(handler)

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ code: 'INVALID_TOKEN' }, 401))
      .mockResolvedValueOnce(jsonResponse({ items: [] }))
    vi.stubGlobal('fetch', fetchMock)

    await expect(httpClient.get('/public/activities')).resolves.toEqual({
      items: [],
    })

    expect(handler).toHaveBeenCalledTimes(1)
    const firstHeaders = fetchMock.mock.calls[0][1]?.headers as Headers
    const secondHeaders = fetchMock.mock.calls[1][1]?.headers as Headers
    expect(firstHeaders.get('Authorization')).toBe('Bearer jwt-viejo')
    expect(secondHeaders.get('Authorization')).toBeNull()
  })

  it('no avisa de sesión caída si la petición iba sin token', async () => {
    const handler = vi.fn()
    onUnauthorized(handler)
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => jsonResponse({ code: 'INVALID_CREDENTIALS' }, 401)),
    )

    await expect(
      httpClient.post('/auth/login', { email: 'a@b.co', password: 'x' }),
    ).rejects.toBeInstanceOf(ApiError)

    expect(handler).not.toHaveBeenCalled()
    expect(loadToken()).toBeNull()
  })
})
