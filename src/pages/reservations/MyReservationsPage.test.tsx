import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AuthContext } from '@/context/auth-context'
import type { AuthContextValue } from '@/context/auth-context'
import MyReservationsPage from './MyReservationsPage'

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
  description: null,
}

const RESERVATION = {
  id: 'r-1',
  code: 'RES-001',
  touristId: 'u-1',
  itemType: 'ACTIVITY',
  itemId: 'a-1',
  providerId: null,
  guideId: 'g-1',
  unitPrice: 120000,
  numberOfPeople: 2,
  total: 240000,
  paymentMethod: 'CARD',
  status: 'CONFIRMED',
  bookedAt: '2026-11-01T10:00:00Z',
  bookedFor: '2026-12-01T08:00:00Z',
  itemStartsAt: '2026-12-01T08:00:00Z',
  notes: null,
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
  registerGuide: vi.fn(),
  logout: vi.fn(),
  updateSessionUser: vi.fn(),
}

function renderReservations() {
  return render(
    <AuthContext.Provider value={AUTH}>
      <MemoryRouter initialEntries={['/mis-reservas']}>
        <Routes>
          <Route path="/mis-reservas" element={<MyReservationsPage />} />
          <Route path="/mis-reservas/:reservationId" element={<p>Detalle</p>} />
          <Route path="/explorar" element={<p>Catálogo</p>} />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>,
  )
}

function routeFetch(reservations: unknown[]) {
  return vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input)
    if (url.includes('/reservations/tourists/')) return jsonResponse(reservations)
    if (url.includes('/activities')) return jsonResponse(page([ACTIVITY]))
    return jsonResponse(page([]))
  })
}

describe('MyReservationsPage', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('lista las reservas del turista con el nombre y el estado', async () => {
    vi.stubGlobal('fetch', routeFetch([RESERVATION]))

    renderReservations()

    expect(await screen.findByText('Snorkel en Taganga')).toBeTruthy()
    expect(screen.getByText('Confirmada')).toBeTruthy()
    expect(
      screen.getByText(/Actividad ·.*2 personas/),
    ).toBeTruthy()
  })

  it('muestra el vacío con su acción cuando no hay reservas', async () => {
    vi.stubGlobal('fetch', routeFetch([]))

    renderReservations()

    expect(await screen.findByText('Aún no tienes reservas')).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Explorar' })).toBeTruthy()
  })
})
