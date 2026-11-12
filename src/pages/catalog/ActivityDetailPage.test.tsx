import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AuthContext } from '@/context/auth-context'
import type { AuthContextValue } from '@/context/auth-context'
import ActivityDetailPage from './ActivityDetailPage'

const ACTIVITY = {
  id: 'a-1',
  siteId: 's-1',
  guideId: 'g-1',
  name: 'Snorkel en Taganga',
  category: 'Aventura',
  status: 'PUBLISHED',
  price: 120000,
  maxCapacity: 10,
  durationMinutes: 180,
  startsAt: '2026-12-01T08:00:00Z',
  endsAt: '2026-12-01T11:00:00Z',
  description: 'Arrecifes frente a Taganga.',
}

const SITE = {
  siteId: 's-1',
  managerId: null,
  name: 'Playa Blanca',
  description: null,
  categoryId: null,
  categoryName: null,
  zoneId: 'z-1',
  zoneName: null,
  zoneStatus: 'ACTIVE',
  latitude: 11.26,
  longitude: -74.19,
  photosUrls: [],
  status: 'PUBLISHED',
  maxCapacity: 100,
  availability: null,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function page(content: unknown[]) {
  return {
    content,
    page: 0,
    size: 100,
    total: content.length,
    totalPages: 1,
  }
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

function renderDetail() {
  return render(
    <AuthContext.Provider value={AUTH}>
      <MemoryRouter initialEntries={['/actividades/a-1']}>
        <Routes>
          <Route path="/actividades/:activityId" element={<ActivityDetailPage />} />
          <Route path="/actividades" element={<p>Actividades</p>} />
          <Route path="/explorar" element={<p>Explorar</p>} />
          <Route path="/mis-reservas" element={<p>Mis reservas</p>} />
          <Route path="/login" element={<p>Iniciar sesión</p>} />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>,
  )
}

describe('ActivityDetailPage', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('pinta la ficha con nombre, precio y descripción', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input)
        if (url.includes('/activities/')) return jsonResponse(ACTIVITY)
        if (url.includes('/sites/')) return jsonResponse(SITE)
        return jsonResponse(page([]))
      }),
    )

    renderDetail()

    expect(
      await screen.findByRole('heading', { name: 'Snorkel en Taganga' }),
    ).toBeTruthy()
    expect(screen.getByText('Arrecifes frente a Taganga.')).toBeTruthy()
    expect(screen.getByText('COP / persona')).toBeTruthy()
    expect(
      screen.getByText((_, element) => {
        const text = element?.textContent?.replace(/\s/g, '') ?? ''
        return element?.tagName === 'SPAN' && text === '$120.000'
      }),
    ).toBeTruthy()
  })

  it('muestra el mapa del atractivo donde ocurre la actividad', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input)
        if (url.includes('/activities/')) return jsonResponse(ACTIVITY)
        if (url.includes('/sites/')) return jsonResponse(SITE)
        return jsonResponse(page([]))
      }),
    )

    renderDetail()

    expect(
      await screen.findByRole('img', {
        name: /Mapa de Playa Blanca en 11\.26000, -74\.19000/,
      }),
    ).toBeTruthy()
    expect(
      screen.getByRole('link', { name: /© OpenStreetMap contributors/ }),
    ).toBeTruthy()
  })

  it('distingue un atractivo que ya no existe de una petición que falló', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input)
        if (url.includes('/activities/')) return jsonResponse(ACTIVITY)
        if (url.includes('/sites/')) {
          return jsonResponse({ detail: 'Site not found', code: 'SITE_NOT_FOUND' }, 404)
        }
        return jsonResponse(page([]))
      }),
    )

    renderDetail()

    expect(
      await screen.findByText(
        'Esta actividad no tiene un atractivo publicado asociado.',
      ),
    ).toBeTruthy()
    expect(screen.queryByRole('img', { name: /Mapa de/ })).toBeNull()
    expect(screen.queryByText(/No pudimos cargar la ubicación/)).toBeNull()
  })

  it('si la consulta del atractivo falla, lo dice en vez de inventar que no tiene ubicación', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input)
        if (url.includes('/activities/')) return jsonResponse(ACTIVITY)
        if (url.includes('/sites/')) {
          return jsonResponse({ detail: 'boom', code: 'INTERNAL_ERROR' }, 500)
        }
        return jsonResponse(page([]))
      }),
    )

    renderDetail()

    expect(
      await screen.findByText(
        'No pudimos cargar la ubicación del atractivo. Vuelve a intentarlo en un momento.',
      ),
    ).toBeTruthy()
    expect(
      screen.queryByText('Esta actividad no tiene un atractivo publicado asociado.'),
    ).toBeNull()
  })

  it('traduce el 404 y no muestra el detail crudo del backend', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        jsonResponse(
          {
            detail: 'Activity not found with id a-1',
            code: 'ACTIVITY_NOT_FOUND',
          },
          404,
        ),
      ),
    )

    renderDetail()

    expect(
      await screen.findByText('No pudimos cargar la actividad'),
    ).toBeTruthy()
    expect(screen.getByText('No se encontró el recurso solicitado.')).toBeTruthy()
    expect(screen.queryByText(/Activity not found/)).toBeNull()
  })
})
