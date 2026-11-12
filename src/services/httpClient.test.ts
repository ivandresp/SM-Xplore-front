import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError, RequestTimeoutError, httpClient } from './httpClient'
import { clearToken, loadToken, onUnauthorized, saveToken } from './authToken'

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

/** `fetch` que solo termina cuando la señal se aborta. */
function hangingFetch() {
  return vi.fn(
    (_input: RequestInfo | URL, init?: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => {
          reject(new DOMException('Aborted', 'AbortError'))
        })
      }),
  )
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

  it('deduplica dos GET en vuelo y reutiliza la respuesta cacheada', async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ items: [1] }))
    vi.stubGlobal('fetch', fetchMock)

    const [first, second] = await Promise.all([
      httpClient.get('/activities'),
      httpClient.get('/activities'),
    ])
    const third = await httpClient.get('/activities')

    expect(first).toEqual({ items: [1] })
    expect(second).toEqual(first)
    expect(third).toEqual(first)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('no cachea respuestas de error', async () => {
    const fetchMock = vi.fn(async () =>
      jsonResponse({ title: 'boom', status: 500 }, 500),
    )
    vi.stubGlobal('fetch', fetchMock)

    await expect(httpClient.get('/activities')).rejects.toBeInstanceOf(ApiError)
    await expect(httpClient.get('/activities')).rejects.toBeInstanceOf(ApiError)

    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('una mutación invalida la caché de los GET', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ items: [] }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(jsonResponse({ items: [2] }))
    vi.stubGlobal('fetch', fetchMock)

    await httpClient.get('/activities')
    await httpClient.post('/activities')
    const refreshed = await httpClient.get('/activities')

    expect(refreshed).toEqual({ items: [2] })
    expect(fetchMock).toHaveBeenCalledTimes(3)
  })

  it('registrar una vista no invalida la caché', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ items: [] }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(jsonResponse({ items: [3] }))
    vi.stubGlobal('fetch', fetchMock)

    await httpClient.get('/activities')
    await httpClient.post('/interactions/view/ACTIVITY/a1')
    const cached = await httpClient.get('/activities')

    expect(cached).toEqual({ items: [] })
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('la respuesta en vuelo de una cuenta no se sirve a la siguiente', async () => {
    saveToken('jwt-A', '2100-01-01T00:00:00Z')

    let releaseA: (response: Response) => void = () => undefined
    const pendingA = new Promise<Response>((resolve) => {
      releaseA = resolve
    })
    const fetchMock = vi
      .fn()
      .mockReturnValueOnce(pendingA)
      .mockResolvedValueOnce(jsonResponse({ email: 'b@smxplore.local' }))
    vi.stubGlobal('fetch', fetchMock)

    const requestA = httpClient.get('/users/me')

    // La cuenta B entra antes de que responda la petición de A.
    saveToken('jwt-B', '2100-01-01T00:00:00Z')
    releaseA(jsonResponse({ email: 'a@smxplore.local' }))

    await expect(requestA).resolves.toEqual({ email: 'a@smxplore.local' })
    await expect(httpClient.get('/users/me')).resolves.toEqual({
      email: 'b@smxplore.local',
    })
    expect(fetchMock).toHaveBeenCalledTimes(2)
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

  it('aborta y avisa cuando el servidor no responde a tiempo', async () => {
    vi.stubGlobal('fetch', hangingFetch())

    const error = await httpClient
      .get('/users/me', { timeoutMs: 5 })
      .catch((cause) => cause)

    expect(error).toBeInstanceOf(RequestTimeoutError)
    expect((error as RequestTimeoutError).timeoutMs).toBe(5)
  })

  it('respeta la señal del llamador y no la disfraza de timeout', async () => {
    vi.stubGlobal('fetch', hangingFetch())
    const controller = new AbortController()

    const pending = httpClient
      .get('/users/me', { signal: controller.signal })
      .catch((cause) => cause)
    controller.abort()

    const error = await pending
    expect(error).not.toBeInstanceOf(RequestTimeoutError)
  })
})
