import { act, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { activitiesApi } from '@/services/activitiesApi'
import { eventsApi } from '@/services/eventsApi'
import { servicesApi } from '@/services/servicesApi'
import { sitesApi } from '@/services/sitesApi'
import EventListPage from '@/pages/events/EventListPage'
import ExplorePage from './ExplorePage'
import ServiceListPage from './ServiceListPage'
import SiteListPage from './SiteListPage'

vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: null, isAuthenticated: false }) }))

const emptyPage = { content: [], page: 0, size: 12, total: 0, totalPages: 0 }

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('mínimo de búsqueda en todos los catálogos', () => {
  it.each([
    ['actividades', ExplorePage, activitiesApi, 'search', 0],
    ['eventos', EventListPage, eventsApi, 'search', 0],
    ['atractivos', SiteListPage, sitesApi, 'search', 0],
    ['servicios', ServiceListPage, servicesApi, 'search', 0],
  ] as const)('%s: bloquea URL corta y espera mínimo y debounce al escribir', async (_name, Page, api, key, inputIndex) => {
    vi.useFakeTimers()
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify([]), {
      headers: { 'Content-Type': 'application/json' },
    })))
    const request = vi.spyOn(api, 'list').mockResolvedValue(emptyPage)
    render(<MemoryRouter initialEntries={[`/?${key}=ab`]}><Page /></MemoryRouter>)
    fireEvent.click(screen.getByRole('button', { name: 'Filtros' }))
    await act(() => vi.advanceTimersByTimeAsync(1000))
    expect(request).not.toHaveBeenCalled()
    expect(screen.getByText('Escribe al menos 3 caracteres para buscar.')).toBeTruthy()
    const input = screen.getAllByRole('searchbox')[inputIndex]
    fireEvent.change(input, { target: { value: 'abc' } })
    await act(() => vi.advanceTimersByTimeAsync(299))
    expect(request).not.toHaveBeenCalled()
    await act(() => vi.advanceTimersByTimeAsync(1))
    expect(request).toHaveBeenCalledTimes(1)
    expect(request).toHaveBeenLastCalledWith(expect.objectContaining({ [key]: 'abc' }))
    fireEvent.change(input, { target: { value: 'xy' } })
    await act(() => vi.advanceTimersByTimeAsync(1000))
    expect(request).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('button', { name: /Quitar filtro .*: xy/ })).toBeNull()
    expect(screen.getByRole('button', { name: /Quitar filtro .*: abc/ })).toBeTruthy()
    fireEvent.change(input, { target: { value: '' } })
    await act(() => vi.advanceTimersByTimeAsync(300))
    expect(request).toHaveBeenCalledTimes(2)
    expect(request).toHaveBeenLastCalledWith(expect.objectContaining({ [key]: undefined }))
  })
})
