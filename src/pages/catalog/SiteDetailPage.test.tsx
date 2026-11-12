import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AuthContext } from '@/context/auth-context'
import type { AuthContextValue } from '@/context/auth-context'
import SiteDetailPage from './SiteDetailPage'

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

function mapImages(): HTMLImageElement[] {
  return Array.from(
    document.querySelectorAll<HTMLImageElement>('img[src*="tile.openstreetmap.org"]'),
  )
}

function renderDetail() {
  return render(
    <AuthContext.Provider value={AUTH}>
      <MemoryRouter initialEntries={['/atractivos/s-1']}>
        <Routes>
          <Route path="/atractivos/:siteId" element={<SiteDetailPage />} />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>,
  )
}

describe('SiteDetailPage', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('muestra la ubicación real del atractivo con un mapa de solo lectura', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input)
        if (url.includes('/sites/')) return jsonResponse(SITE)
        if (url.includes('/zones')) return jsonResponse(page([{ id: 'z-1', name: 'Taganga' }]))
        return jsonResponse(page([]))
      }),
    )

    renderDetail()

    expect(await screen.findByRole('heading', { name: 'Playa Blanca' })).toBeTruthy()
    expect(
      screen.getByRole('img', { name: /Mapa de Playa Blanca en 11\.26000, -74\.19000/ }),
    ).toBeTruthy()
    expect(mapImages().length).toBeGreaterThanOrEqual(1)
    expect(
      screen.getByRole('link', { name: /© OpenStreetMap contributors/ }),
    ).toBeTruthy()
  })
})
