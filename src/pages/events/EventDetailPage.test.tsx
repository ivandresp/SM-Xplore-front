import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AuthContext } from '@/context/auth-context'
import type { AuthContextValue } from '@/context/auth-context'
import EventDetailPage from './EventDetailPage'

const EVENT = {
  id: 'e-1',
  siteId: 's-1',
  siteName: 'Playa Blanca',
  name: 'Festival del Mar',
  category: 'Cultura',
  status: 'PUBLISHED',
  price: 50000,
  maxCapacity: 200,
  startsAt: '2026-12-01T18:00:00Z',
  endsAt: '2026-12-01T22:00:00Z',
  description: 'Música en la playa.',
  expectedAttendance: 150,
}

const SITE = {
  siteId: 's-1',
  managerId: null,
  name: 'Playa Blanca',
  description: null,
  categoryId: null,
  categoryName: null,
  zoneId: 'z-1',
  zoneName: 'Taganga',
  zoneStatus: 'ACTIVE',
  latitude: 11.2404,
  longitude: -74.199,
  photosUrls: [],
  status: 'PUBLISHED',
  maxCapacity: 100,
  availability: null,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
}

const AUTH: AuthContextValue = {
  user: null,
  isAuthenticated: false,
  isRestoring: false,
  mfaChallenge: null,
  login: vi.fn(),
  completeMfa: vi.fn(),
  cancelMfa: vi.fn(),
  registerTourist: vi.fn(),
  registerProvider: vi.fn(),
  registerGuide: vi.fn(),
  logout: vi.fn(),
  updateSessionUser: vi.fn(),
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function page(content: unknown[]) {
  return { content, page: 0, size: 100, total: content.length, totalPages: 1 }
}

function renderEvent() {
  return render(
    <AuthContext.Provider value={AUTH}>
      <MemoryRouter initialEntries={['/eventos/e-1']}>
        <Routes>
          <Route path="/eventos/:eventId" element={<EventDetailPage />} />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>,
  )
}

describe('EventDetailPage', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('muestra la ubicación real del evento con un mapa de solo lectura', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input)
        if (url.includes('/events/')) return jsonResponse(EVENT)
        if (url.includes('/sites/')) return jsonResponse(SITE)
        if (url.includes('/zones')) return jsonResponse(page([{ id: 'z-1', name: 'Taganga' }]))
        return jsonResponse(page([]))
      }),
    )

    renderEvent()

    expect(await screen.findByRole('heading', { name: 'Festival del Mar' })).toBeTruthy()
    expect(
      screen.getByRole('img', { name: /Mapa de Playa Blanca en 11\.24040, -74\.19900/ }),
    ).toBeTruthy()
    expect(
      screen.getByRole('link', { name: /© OpenStreetMap contributors/ }),
    ).toBeTruthy()
  })
  it('distingue un lugar que ya no existe de una petición que falló', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input)
        if (url.includes('/events/')) return jsonResponse(EVENT)
        if (url.includes('/sites/')) {
          return jsonResponse({ detail: 'Not found', code: 'SITE_NOT_FOUND' }, 404)
        }
        return jsonResponse(page([]))
      }),
    )

    renderEvent()

    expect(
      await screen.findByText('Este evento no tiene un lugar publicado asociado.'),
    ).toBeTruthy()
    expect(screen.queryByRole('img', { name: /Mapa de/ })).toBeNull()
  })

  it('si la consulta del lugar falla, lo dice en vez de inventar que no tiene lugar', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input)
        if (url.includes('/events/')) return jsonResponse(EVENT)
        if (url.includes('/sites/')) {
          return jsonResponse({ detail: 'boom', code: 'INTERNAL_ERROR' }, 500)
        }
        return jsonResponse(page([]))
      }),
    )

    renderEvent()

    expect(
      await screen.findByText(
        'No pudimos cargar la ubicación del evento. Vuelve a intentarlo en un momento.',
      ),
    ).toBeTruthy()
    expect(
      screen.queryByText('Este evento no tiene un lugar publicado asociado.'),
    ).toBeNull()
  })
})

