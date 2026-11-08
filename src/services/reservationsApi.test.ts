import { afterEach, describe, expect, it, vi } from 'vitest'
import { itemOf, reservationsApi } from './reservationsApi'
import type { ReservationResponse } from '@/types'

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

const reservation: ReservationResponse = {
  id: 'r1',
  code: 'RES-1',
  touristId: 't1',
  itemType: 'ACTIVITY',
  itemId: 'a1',
  providerId: null,
  guideId: 'g1',
  unitPrice: 50000,
  numberOfPeople: 2,
  total: 100000,
  paymentMethod: 'CARD',
  status: 'CONFIRMED',
  bookedAt: '2026-11-01T10:00:00Z',
  bookedFor: '2026-12-20T18:00:00Z',
  itemStartsAt: '2026-12-20T18:00:00Z',
  notes: null,
}

describe('reservationsApi', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('crea la reserva sin enviar precio: lo pone el backend', async () => {
    const fetchStub = vi.fn(async (_url: string, _init?: RequestInit) =>
      jsonResponse(reservation, 201),
    )
    vi.stubGlobal('fetch', fetchStub)

    const created = await reservationsApi.create({
      touristId: 't1',
      itemType: 'ACTIVITY',
      itemId: 'a1',
      numberOfPeople: 2,
      paymentMethod: 'CARD',
      bookedFor: '2026-12-20T18:00:00Z',
    })

    expect(created.total).toBe(100000)

    const [url, init] = fetchStub.mock.calls[0]
    expect(url).toContain('/reservations')
    expect(init?.method).toBe('POST')
    expect(JSON.parse(String(init?.body))).not.toHaveProperty('unitPrice')
  })

  it('listByTourist devuelve el array tal cual y usa limit', async () => {
    const fetchStub = vi.fn(async (_url: string, _init?: RequestInit) =>
      jsonResponse([reservation]),
    )
    vi.stubGlobal('fetch', fetchStub)

    const list = await reservationsApi.listByTourist('t1', 200)

    expect(list).toHaveLength(1)
    expect(list[0].code).toBe('RES-1')

    const url = String(fetchStub.mock.calls[0][0])
    expect(url).toContain('/reservations/tourists/t1')
    expect(url).toContain('limit=200')
  })

  it('acepta el estado COMPLETED que devuelve el backend', async () => {
    const fetchStub = vi.fn(async (_url: string, _init?: RequestInit) =>
      jsonResponse({ ...reservation, status: 'COMPLETED' }),
    )
    vi.stubGlobal('fetch', fetchStub)

    const updated = await reservationsApi.markAttendance('r1')

    expect(updated.status).toBe('COMPLETED')
    expect(String(fetchStub.mock.calls[0][0])).toContain('/reservations/r1/attendance')
    expect(fetchStub.mock.calls[0][1]?.method).toBe('PATCH')
  })

  it('itemOf deriva el ítem de la propia reserva', () => {
    const item = itemOf(reservation)

    expect(item.itemId).toBe('a1')
    expect(item.type).toBe('ACTIVITY')
    expect(item.price).toBe(50000)
  })

  it('listByProvider apunta a la ruta de la prestadora y filtra por estado', async () => {
    const fetchStub = vi.fn(async (_url: string, _init?: RequestInit) =>
      jsonResponse([{ ...reservation, providerId: 'p1', guideId: null }]),
    )
    vi.stubGlobal('fetch', fetchStub)

    const list = await reservationsApi.listByProvider('p1', { status: 'CONFIRMED' })

    expect(list).toHaveLength(1)
    expect(list[0].providerId).toBe('p1')

    const url = String(fetchStub.mock.calls[0][0])
    expect(url).toContain('/reservations/providers/p1')
    expect(url).toContain('status=CONFIRMED')
  })
})
