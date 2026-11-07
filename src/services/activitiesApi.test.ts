import { afterEach, describe, expect, it, vi } from 'vitest'
import { activitiesApi } from './activitiesApi'

const activity = {
  id: 'a1',
  siteId: 's1',
  guideId: null,
  name: 'Senderismo',
  category: 'Aventura',
  status: 'PUBLISHED',
  price: 50000,
  maxCapacity: 10,
  durationMinutes: 120,
  startsAt: '2026-11-10T13:00:00Z',
  endsAt: '2026-11-10T15:00:00Z',
  description: null,
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('activitiesApi', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('desenvuelve la página {content, page, size, total, totalPages}', async () => {
    const fetchStub = vi.fn(async (_url: string, _init?: RequestInit) =>
      jsonResponse({
        content: [activity],
        page: 0,
        size: 100,
        total: 1,
        totalPages: 1,
      }),
    )
    vi.stubGlobal('fetch', fetchStub)

    const result = await activitiesApi.list()

    expect(result).toEqual([activity])
    const url = fetchStub.mock.calls[0][0]
    expect(url).toContain('/activities?')
    expect(url).toContain('page=0')
    expect(url).toContain('size=100')
  })

  it('falla en voz alta si el backend deja de paginar', async () => {
    // Regresión del bug real: /activities devolvía un array y la vista lo
    // trataba como lista, ocultando el contrato roto detrás de un TypeError.
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse([activity])))

    await expect(activitiesApi.list()).rejects.toThrow(
      /Respuesta inesperada de GET \/activities/,
    )
  })
})
