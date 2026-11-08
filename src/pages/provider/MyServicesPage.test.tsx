import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AuthContext } from '@/context/auth-context'
import type { AuthContextValue } from '@/context/auth-context'
import MyServicesPage from './MyServicesPage'

const SERVICE = {
  serviceId: 'sv-1',
  providerId: 'u-2',
  providerName: 'Kayaks del Mar',
  siteId: null,
  siteName: null,
  zoneId: null,
  zoneName: null,
  categoryId: null,
  categoryName: null,
  name: 'Kayak en la bahía',
  description: null,
  type: 'TRANSPORT',
  latitude: 11.24,
  longitude: -74.2,
  price: 80000,
  status: 'PUBLISHED',
  maxCapacity: 8,
  photosUrls: [],
  cancellationPolicy: null,
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
  user: {
    id: 'u-2',
    fullName: 'Kayaks del Mar',
    email: 'kayak@smxplore.local',
    phone: '3009876543',
    role: 'SERVICE_PROVIDER',
    status: 'ACTIVO',
    profile: null,
    signedUpAt: '2026-11-02T10:00:00Z',
    authVersion: 1,
  },
  isAuthenticated: true,
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

function renderServices() {
  return render(
    <AuthContext.Provider value={AUTH}>
      <MemoryRouter initialEntries={['/app/mis-servicios']}>
        <Routes>
          <Route path="/app/mis-servicios" element={<MyServicesPage />} />
          <Route path="/app/mis-servicios/nuevo" element={<p>Nuevo</p>} />
          <Route
            path="/app/mis-servicios/:serviceId"
            element={<p>Gestionar servicio</p>}
          />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>,
  )
}

describe('MyServicesPage', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('lista los servicios de la prestadora autenticada', async () => {
    const fetchMock = vi.fn(async (_input: RequestInfo | URL) =>
      jsonResponse(page([SERVICE])),
    )
    vi.stubGlobal('fetch', fetchMock)

    renderServices()

    expect(await screen.findByText('Kayak en la bahía')).toBeTruthy()
    expect(screen.getByText(/Transporte/)).toBeTruthy()
    expect(screen.getByText('Publicado')).toBeTruthy()

    const urls = fetchMock.mock.calls.map(([url]) => String(url))
    expect(urls.at(-1)).toContain('providerId=u-2')
  })
})
