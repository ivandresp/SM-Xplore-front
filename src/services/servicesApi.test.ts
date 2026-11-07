import { afterEach, describe, expect, it, vi } from 'vitest'
import { servicesApi } from './servicesApi'

const service = {
  serviceId: 'sv1',
  providerId: 'p1',
  providerName: 'Kayak Santa Marta',
  siteId: 's1',
  siteName: 'Playa El Rodadero',
  zoneId: 'z1',
  zoneName: 'Rodadero',
  zoneStatus: 'ACTIVE',
  categoryId: 'c1',
  categoryName: 'Deportes acuáticos',
  name: 'Alquiler de kayak',
  description: null,
  type: 'LODGING',
  latitude: 11.2,
  longitude: -74.2,
  price: 60000,
  status: 'PUBLISHED',
  maxCapacity: 8,
  availability: [],
  photosUrls: null,
  cancellationPolicy: null,
  createdAt: '2026-11-07T18:00:00Z',
  updatedAt: '2026-11-07T18:00:00Z',
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('servicesApi', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('desenvuelve la página y mapea serviceId a id', async () => {
    const fetchStub = vi.fn(async (_url: string, _init?: RequestInit) =>
      jsonResponse({
        content: [service],
        page: 0,
        size: 100,
        total: 1,
        totalPages: 1,
      }),
    )
    vi.stubGlobal('fetch', fetchStub)

    const [result] = await servicesApi.list({ status: 'PUBLISHED' })

    expect(result.id).toBe('sv1')
    expect(result.providerName).toBe('Kayak Santa Marta')
    expect(result.photosUrls).toEqual([])
    expect(result.cancellationPolicy).toBe('')

    const url = fetchStub.mock.calls[0][0]
    expect(url).toContain('/services?')
    expect(url).toContain('status=PUBLISHED')
    expect(url).toContain('size=100')
  })

  it('cambia el estado con PATCH /services/{id}/status', async () => {
    const fetchStub = vi.fn(async (_url: string, _init?: RequestInit) =>
      jsonResponse({ ...service, status: 'INACTIVE' }),
    )
    vi.stubGlobal('fetch', fetchStub)

    const result = await servicesApi.changeStatus('sv1', 'INACTIVE')

    expect(result.status).toBe('INACTIVE')
    const [url, init] = fetchStub.mock.calls[0]
    expect(url).toContain('/services/sv1/status')
    expect(init?.method).toBe('PATCH')
    expect(init?.body).toBe(JSON.stringify({ status: 'INACTIVE' }))
  })

  it('falla en voz alta si el backend deja de paginar', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse([service])))

    await expect(servicesApi.list()).rejects.toThrow(
      /Respuesta inesperada de GET \/services/,
    )
  })
})
