import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AuthContext } from '@/context/auth-context'
import type { AuthContextValue } from '@/context/auth-context'
import MyActivitiesPage from './MyActivitiesPage'

const ACTIVITY = {
  id: 'a-1',
  siteId: 's-1',
  guideId: 'u-1',
  name: 'Snorkel en Taganga',
  category: 'Aventura',
  status: 'PUBLISHED',
  price: 120000,
  maxCapacity: 10,
  durationMinutes: 180,
  startsAt: '2026-12-01T08:00:00Z',
  endsAt: '2026-12-01T11:00:00Z',
  description: null,
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
    id: 'u-1',
    fullName: 'Ana Guía',
    email: 'ana@smxplore.local',
    phone: '3001234567',
    role: 'GUIDE',
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

function renderActivities() {
  return render(
    <AuthContext.Provider value={AUTH}>
      <MemoryRouter initialEntries={['/app/mis-actividades']}>
        <Routes>
          <Route path="/app/mis-actividades" element={<MyActivitiesPage />} />
          <Route path="/app/mis-actividades/nueva" element={<p>Nueva</p>} />
          <Route
            path="/app/mis-actividades/:activityId"
            element={<p>Editar</p>}
          />
          <Route path="/app/disponibilidad" element={<p>Disponibilidad</p>} />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>,
  )
}

describe('MyActivitiesPage', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('pide al servidor solo las actividades del guía autenticado', async () => {
    const fetchStub = vi.fn(async (url: string) => {
      expect(url).toContain('guideId=u-1')
      return jsonResponse(page([ACTIVITY]))
    })
    vi.stubGlobal('fetch', fetchStub)

    renderActivities()

    expect(await screen.findByText('Snorkel en Taganga')).toBeTruthy()
    expect(screen.queryByText('Caminata de otro guía')).toBeNull()
    expect(screen.getByText('Publicada')).toBeTruthy()
  })

  it('muestra el vacío con el CTA de crear actividad', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse(page([]))))

    renderActivities()

    expect(
      await screen.findByText(/Todavía no tienes actividades/),
    ).toBeTruthy()
    expect(
      screen.getAllByRole('link', { name: 'Nueva actividad' }).length,
    ).toBeGreaterThan(0)
  })
})
