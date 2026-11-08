import { afterEach, describe, expect, it, vi } from 'vitest'
import { eventsApi } from './eventsApi'

const event = {
  id: 'e1',
  siteId: 's1',
  siteName: 'Playa El Rodadero',
  name: 'Festival del Mar',
  category: 'Música',
  status: 'PUBLISHED',
  price: 30000,
  maxCapacity: 200,
  startsAt: '2026-11-20T18:00:00Z',
  endsAt: '2026-11-20T23:00:00Z',
  description: null,
  expectedAttendance: 0,
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('eventsApi', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('desenvuelve la página de eventos', async () => {
    const fetchStub = vi.fn(async (_url: string, _init?: RequestInit) =>
      jsonResponse({
        content: [event],
        page: 0,
        size: 100,
        total: 1,
        totalPages: 1,
      }),
    )
    vi.stubGlobal('fetch', fetchStub)

    const result = await eventsApi.list()

    expect(result.content).toHaveLength(1)
    expect(result.content[0].siteName).toBe('Playa El Rodadero')
    expect(result.total).toBe(1)

    const url = fetchStub.mock.calls[0][0]
    expect(url).toContain('/events?')
    expect(url).toContain('size=100')
  })

  it('manda los filtros de servidor en la query', async () => {
    const fetchStub = vi.fn(async (_url: string, _init?: RequestInit) =>
      jsonResponse({
        content: [],
        page: 0,
        size: 12,
        total: 0,
        totalPages: 0,
      }),
    )
    vi.stubGlobal('fetch', fetchStub)

    await eventsApi.list({
      search: '  bahía ',
      status: 'PUBLISHED',
      category: 'Música',
      siteId: 's1',
      managerId: 'm1',
      priceMin: 0,
      priceMax: 90000,
      page: 1,
      size: 12,
    })

    const url = fetchStub.mock.calls[0][0]
    expect(url).toContain('search=bah%C3%ADa')
    expect(url).toContain('status=PUBLISHED')
    expect(url).toContain('category=M%C3%BAsica')
    expect(url).toContain('siteId=s1')
    expect(url).toContain('managerId=m1')
    expect(url).toContain('priceMin=0')
    expect(url).toContain('priceMax=90000')
    expect(url).toContain('page=1')
    expect(url).toContain('size=12')
  })

  it('crea con POST /events', async () => {
    const fetchStub = vi.fn(async (_url: string, _init?: RequestInit) =>
      jsonResponse({ ...event, status: 'DRAFT' }, 201),
    )
    vi.stubGlobal('fetch', fetchStub)

    const created = await eventsApi.create({
      siteId: 's1',
      name: 'Festival del Mar',
      category: 'Música',
      price: 30000,
      maxCapacity: 200,
      startsAt: '2026-11-20T18:00:00Z',
      endsAt: '2026-11-20T23:00:00Z',
    })

    expect(created.status).toBe('DRAFT')
    const [url, init] = fetchStub.mock.calls[0]
    expect(url).toContain('/events')
    expect(init?.method).toBe('POST')
  })

  it('filtra por atractivo en el servidor', async () => {
    const fetchStub = vi.fn(async (_url: string, _init?: RequestInit) =>
      jsonResponse({
        content: [event],
        page: 0,
        size: 100,
        total: 1,
        totalPages: 1,
      }),
    )
    vi.stubGlobal('fetch', fetchStub)

    const result = await eventsApi.listBySite('s1')

    expect(result.map((item) => item.id)).toEqual(['e1'])
    expect(fetchStub.mock.calls[0][0]).toContain('siteId=s1')
  })
})
