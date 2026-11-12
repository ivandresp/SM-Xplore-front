import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AuthContext } from '@/context/auth-context'
import type { AuthContextValue } from '@/context/auth-context'
import ServiceDetailPage from './ServiceDetailPage'

const SERVICE = {
  serviceId: 'sv-1',
  providerId: 'p-1',
  providerName: 'Hotel Marina',
  siteId: 's-1',
  siteName: 'Playa Blanca',
  zoneId: 'z-1',
  zoneName: 'Taganga',
  categoryId: 'c-1',
  categoryName: 'Hospedaje',
  name: 'Habitación doble',
  description: 'Vista al mar.',
  type: 'LODGING',
  latitude: 11.2404,
  longitude: -74.199,
  price: 250000,
  status: 'PUBLISHED',
  maxCapacity: 4,
  photosUrls: [],
  cancellationPolicy: '',
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

describe('ServiceDetailPage', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('muestra la ubicación real del servicio con un mapa de solo lectura', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input)
        if (url.includes('/services/')) return jsonResponse(SERVICE)
        return jsonResponse(page([]))
      }),
    )

    render(
      <AuthContext.Provider value={AUTH}>
        <MemoryRouter initialEntries={['/servicios/sv-1']}>
          <Routes>
            <Route path="/servicios/:serviceId" element={<ServiceDetailPage />} />
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>,
    )

    expect(await screen.findByRole('heading', { name: 'Habitación doble' })).toBeTruthy()
    expect(
      screen.getByRole('img', { name: /Mapa de Habitación doble en 11\.24040, -74\.19900/ }),
    ).toBeTruthy()
    expect(
      screen.getByRole('link', { name: '© OpenStreetMap contributors' }),
    ).toBeTruthy()
  })
})
