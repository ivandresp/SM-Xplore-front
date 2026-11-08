import { afterEach, describe, expect, it, vi } from 'vitest'
import { sitesApi } from './sitesApi'

const site = {
  siteId: 's1',
  managerId: null,
  name: 'Playa El Rodadero',
  description: null,
  categoryId: 'c1',
  categoryName: 'Playa',
  zoneId: 'z1',
  zoneName: 'Rodadero',
  zoneStatus: 'ACTIVE',
  latitude: 11.2,
  longitude: -74.2,
  photosUrls: ['https://example.com/1.jpg'],
  status: 'PUBLISHED',
  maxCapacity: 100,
  availability: null,
  createdAt: '2026-11-07T18:00:00Z',
  updatedAt: '2026-11-07T18:00:00Z',
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('sitesApi', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('devuelve la página con el mapeo de la vista', async () => {
    const fetchStub = vi.fn(async (_url: string, _init?: RequestInit) =>
      jsonResponse({
        content: [site],
        page: 0,
        size: 12,
        total: 1,
        totalPages: 1,
      }),
    )
    vi.stubGlobal('fetch', fetchStub)

    const page = await sitesApi.list({ search: 'rodadero', page: 0, size: 12 })

    expect(page.total).toBe(1)
    expect(page.content[0]).toMatchObject({
      id: 's1',
      zoneId: 'z1',
      photoUrls: ['https://example.com/1.jpg'],
    })

    const url = fetchStub.mock.calls[0][0]
    expect(url).toContain('/sites?')
    expect(url).toContain('search=rodadero')
    expect(url).toContain('size=12')
  })

  it('manda status y categoryId al servidor', async () => {
    const fetchStub = vi.fn(async (_url: string, _init?: RequestInit) =>
      jsonResponse({ content: [], page: 0, size: 12, total: 0, totalPages: 0 }),
    )
    vi.stubGlobal('fetch', fetchStub)

    await sitesApi.list({ status: 'PUBLISHED', categoryId: 'c1', zoneId: 'z1' })

    const url = fetchStub.mock.calls[0][0]
    expect(url).toContain('status=PUBLISHED')
    expect(url).toContain('categoryId=c1')
    expect(url).toContain('zoneId=z1')
  })
})
