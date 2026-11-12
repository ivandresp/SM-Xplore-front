import { afterEach, describe, expect, it, vi } from 'vitest'
import { registrationsApi } from './registrationsApi'

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

const GUIDE = {
  id: 'reg-1',
  role: 'GUIDE',
  fullName: 'Ana Guía',
  email: 'ana@correo.com',
  license: 'LIC-1',
  nit: null,
  signedUpAt: '2026-11-01T10:00:00Z',
  registrationStatus: 'PENDIENTE',
}

describe('registrationsApi', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('list pide la cola por rol y estado y desenvuelve la página del backend', async () => {
    const fetchStub = vi.fn(async (_url: string, _init?: RequestInit) =>
      jsonResponse({ content: [GUIDE], page: 0, size: 10, total: 1, totalPages: 1 }),
    )
    vi.stubGlobal('fetch', fetchStub)

    const page = await registrationsApi.list({
      role: 'GUIDE',
      status: 'PENDIENTE',
      page: 0,
      size: 10,
    })

    expect(page.total).toBe(1)
    expect(page.content[0].license).toBe('LIC-1')

    const url = String(fetchStub.mock.calls[0][0])
    expect(url).toContain('/registrations?')
    expect(url).toContain('role=GUIDE')
    expect(url).toContain('status=PENDIENTE')
    expect(url).toContain('page=0')
    expect(url).toContain('size=10')
  })

  it('rechaza una respuesta que no trae el sobre de página de ms-01', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => jsonResponse({ content: [GUIDE], total: 1 })),
    )

    await expect(
      registrationsApi.list({ role: 'GUIDE', status: 'PENDIENTE' }),
    ).rejects.toThrow(/Respuesta inesperada de GET \/registrations/)
  })

  it('review manda la decisión y el motivo y acepta el 204 sin cuerpo', async () => {
    const fetchStub = vi.fn(
      async (_url: string, _init?: RequestInit) => new Response(null, { status: 204 }),
    )
    vi.stubGlobal('fetch', fetchStub)

    await registrationsApi.review('reg-1', {
      decision: 'RECHAZADO',
      reason: 'Licencia vencida',
    })

    const [url, init] = fetchStub.mock.calls[0]
    expect(String(url)).toContain('/registrations/reg-1/review')
    expect(init?.method).toBe('POST')
    expect(JSON.parse(String(init?.body))).toEqual({
      decision: 'RECHAZADO',
      reason: 'Licencia vencida',
    })
  })

  it('propaga el 409 de una transición inválida con su código estable', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        jsonResponse(
          { code: 'INVALID_STATUS_TRANSITION', detail: 'Ya fue revisada' },
          409,
        ),
      ),
    )

    await expect(
      registrationsApi.review('reg-1', { decision: 'APROBADO' }),
    ).rejects.toMatchObject({ status: 409, payload: { code: 'INVALID_STATUS_TRANSITION' } })
  })
})
