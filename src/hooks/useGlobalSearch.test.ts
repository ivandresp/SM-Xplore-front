import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { setLanguage } from '@/i18n/language'
import { activitiesApi } from '@/services/activitiesApi'
import { eventsApi } from '@/services/eventsApi'
import { sitesApi } from '@/services/sitesApi'
import { servicesApi } from '@/services/servicesApi'
import { ApiError } from '@/services/httpClient'
import { formatCurrency } from '@/utils/format'
import { groupHref, normalizeSearchTerm, useGlobalSearch } from './useGlobalSearch'

describe('normalizeSearchTerm', () => {
  it('pasa a minúsculas, quita tildes y recorta espacios', () => {
    expect(normalizeSearchTerm('  Playa Blanca ')).toBe('playa blanca')
    expect(normalizeSearchTerm('PARQUE TAYRONA')).toBe('parque tayrona')
    expect(normalizeSearchTerm('Bahía Concha')).toBe('bahia concha')
  })
})

describe('groupHref', () => {
  it('lleva cada grupo a su catálogo con el término codificado', () => {
    expect(groupHref('activities', 'bahía')).toBe(
      '/explorar?search=bah%C3%ADa',
    )
    expect(groupHref('events', '  kayak ')).toBe('/eventos?search=kayak')
    expect(groupHref('sites', 'playa')).toBe('/atractivos?search=playa')
    expect(groupHref('services', 'hotel')).toBe('/servicios?search=hotel')
  })
})

afterEach(() => {
  act(() => setLanguage('es'))
  vi.restoreAllMocks()
})

const START = '2026-12-01T12:00:00Z'
const END = '2026-12-01T14:00:00Z'
const PUBLISHED = 'PUBLISHED' as const

function page<T>(content: T[]) {
  return { content, total: content.length, page: 0, size: 5, totalPages: 1 }
}

function mockSearch() {
  const activities = vi.spyOn(activitiesApi, 'list').mockResolvedValue(page([{
    id: 'a-1', siteId: 's-1', guideId: null, name: 'Actividades', category: 'Aventura',
    status: PUBLISHED, price: 50000, maxCapacity: 10, durationMinutes: 120,
    startsAt: START, endsAt: END, description: null,
  }]))
  const events = vi.spyOn(eventsApi, 'list').mockResolvedValue(page([{
    id: 'e-1', siteId: 's-1', siteName: 'Atractivos', name: 'Eventos', category: 'Cultura',
    status: PUBLISHED, price: 25000, maxCapacity: 20, expectedAttendance: 15,
    startsAt: START, endsAt: END, description: null,
  }]))
  const sites = vi.spyOn(sitesApi, 'list').mockResolvedValue(page([{
    id: 's-1', zoneId: 'z-1', name: 'Atractivos', latitude: 11, longitude: -74,
    photoUrls: [], categoryId: null, maxCapacity: 30, status: PUBLISHED,
  }, {
    id: 's-2', zoneId: 'z-1', name: 'Otro atractivo', latitude: 11, longitude: -74,
    photoUrls: [], categoryId: null, maxCapacity: 0, status: PUBLISHED,
  }]))
  const services = vi.spyOn(servicesApi, 'list').mockResolvedValue(page([{
    id: 'v-1', providerId: 'p-1', providerName: 'Prestadora', siteId: 's-1', siteName: 'Atractivos',
    zoneId: 'z-1', zoneName: 'Zona', categoryId: 'c-1', categoryName: 'Categoría', name: 'Servicios',
    description: 'Descripción libre', type: 'TRANSPORT', latitude: 11, longitude: -74,
    price: 10000, status: PUBLISHED, maxCapacity: 10, photosUrls: [], cancellationPolicy: '',
    createdAt: START, updatedAt: START,
  }]))
  return [activities, events, sites, services]
}

describe('useGlobalSearch: live language', () => {
  it('reformats loaded results without refetching or translating catalog content', async () => {
    const requests = mockSearch()
    const { result } = renderHook(() => useGlobalSearch())
    act(() => result.current.setTerm('playa'))
    await waitFor(() => expect(result.current.results.sites.items).toHaveLength(2))
    expect(result.current.results.sites.items[0].subtitle).toBe('Hasta 30 visitantes')
    expect(result.current.results.services.items[0].subtitle).toContain('Transporte')

    act(() => setLanguage('en'))
    expect(result.current.term).toBe('playa')
    expect(result.current.results.sites.items[0].subtitle).toBe('Up to 30 visitors')
    expect(result.current.results.sites.items[1].subtitle).toBe('Tourist attraction')
    expect(result.current.results.services.items[0].subtitle).toBe(`Transport · ${formatCurrency(10000)}`)
    expect(result.current.results.activities.items[0].subtitle).toBe(`Aventura · ${formatCurrency(50000)}`)
    expect(result.current.results.events.items[0].subtitle).toBe(`Atractivos · ${formatCurrency(25000)}`)
    expect(result.current.results.activities.items[0].name).toBe('Actividades')
    expect(result.current.results.events.items[0].name).toBe('Eventos')
    expect(result.current.results.sites.items[0].name).toBe('Atractivos')
    expect(result.current.results.services.items[0].name).toBe('Servicios')
    requests.forEach((request) => expect(request).toHaveBeenCalledTimes(1))

    act(() => setLanguage('es'))
    expect(result.current.results.sites.items[0].subtitle).toBe('Hasta 30 visitantes')
    requests.forEach((request) => expect(request).toHaveBeenCalledTimes(1))
  })

  it('retranslates a loaded request error without retrying the search', async () => {
    const requests = mockSearch()
    const error = new ApiError('private backend detail', 403)
    requests.forEach((request) => request.mockRejectedValue(error))
    const { result } = renderHook(() => useGlobalSearch())
    act(() => result.current.setTerm('playa'))
    await waitFor(() => expect(result.current.error).not.toBeNull())
    expect(result.current.error).toBe('Tu cuenta no tiene permiso para ver esta información.')
    act(() => setLanguage('en'))
    expect(result.current.error).toBe('Your account does not have permission to view this information.')
    requests.forEach((request) => expect(request).toHaveBeenCalledTimes(1))
  })
})
