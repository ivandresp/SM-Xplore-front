import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AuthContext } from '@/context/auth-context'
import type { AuthContextValue } from '@/context/auth-context'
import ReportDetailPage from './ReportDetailPage'

const PHOTOS = [
  'https://res.cloudinary.com/demo/image/upload/v1/sm-xplore/reports/uno.jpg',
  'https://res.cloudinary.com/demo/image/upload/v1/sm-xplore/reports/dos.jpg',
]

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

const AUTH: AuthContextValue = {
  user: {
    id: 'u-1',
    fullName: 'Ana Turista',
    email: 'ana@smxplore.local',
    phone: '3001234567',
    role: 'TOURIST',
    status: 'ACTIVO',
    profile: null,
    signedUpAt: '2026-11-01T10:00:00Z',
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

function report(overrides: Record<string, unknown> = {}) {
  return {
    id: 'r-1',
    user: { id: 'u-1', name: 'Ana Turista' },
    title: 'Robo en la playa',
    description: 'Me quitaron la mochila.',
    location: null,
    photosUrls: PHOTOS,
    status: 'ONGOING',
    createdAt: '2026-11-12T10:00:00Z',
    updatedAt: '2026-11-12T10:00:00Z',
    ...overrides,
  }
}

function renderDetail(payload: Record<string, unknown>) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url.includes('/comments')) {
        return jsonResponse({ content: [], nextCursor: null, hasNext: false })
      }
      return jsonResponse(payload)
    }),
  )

  return render(
    <AuthContext.Provider value={AUTH}>
      <MemoryRouter initialEntries={['/reportes/r-1']}>
        <Routes>
          <Route path="/reportes/:reportId" element={<ReportDetailPage />} />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>,
  )
}

describe('ReportDetailPage', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('muestra las fotos que se adjuntaron al reporte', async () => {
    renderDetail(report())

    expect(await screen.findByText('Fotos (2)')).toBeTruthy()
    expect(screen.getByAltText('Foto 1 del reporte')).toBeTruthy()
    expect(screen.getByAltText('Foto 2 del reporte')).toBeTruthy()
  })

  it('dice que el reporte no trae ubicación cuando se envió sin ella', async () => {
    renderDetail(report())

    expect(await screen.findByText('Sin ubicación registrada')).toBeTruthy()
  })

  it('muestra la ubicación cuando el navegador sí la aportó', async () => {
    renderDetail(
      report({ location: { latitude: 11.2404, longitude: -74.199 } }),
    )

    expect(await screen.findByText('11.24040, -74.19900')).toBeTruthy()
  })
})
