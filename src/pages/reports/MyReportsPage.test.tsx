import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AuthContext } from '@/context/auth-context'
import type { AuthContextValue } from '@/context/auth-context'
import MyReportsPage from './MyReportsPage'

const REPORT = {
  id: 'r-1',
  user: { id: 'u-1', name: 'Ana Turista' },
  title: 'Robo en la playa',
  description: 'Me quitaron la mochila.',
  location: null,
  photosUrls: [],
  status: 'ONGOING',
  createdAt: '2026-11-05T10:00:00Z',
  updatedAt: null,
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function cursorPage(content: unknown[]) {
  return { content, nextCursor: null, hasNext: false }
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

function renderReports() {
  return render(
    <AuthContext.Provider value={AUTH}>
      <MemoryRouter initialEntries={['/reportes']}>
        <Routes>
          <Route path="/reportes" element={<MyReportsPage />} />
          <Route path="/reportes/nuevo" element={<p>Nuevo reporte</p>} />
          <Route path="/reportes/:reportId" element={<p>Detalle</p>} />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>,
  )
}

describe('MyReportsPage', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('lista los reportes propios con el título y el estado en español', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input)
        if (url.includes('/comments')) return jsonResponse(cursorPage([]))
        return jsonResponse(cursorPage([REPORT]))
      }),
    )

    renderReports()

    expect(await screen.findByText('Robo en la playa')).toBeTruthy()
    const card = screen.getByText('Robo en la playa').closest('article')
    expect(within(card as HTMLElement).getByText('En curso')).toBeTruthy()
    expect(screen.getByText('1 reporte')).toBeTruthy()
  })

  it('muestra el error y reintenta la carga', async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ code: 'ERROR' }, 500))
    vi.stubGlobal('fetch', fetchMock)

    const user = userEvent.setup()
    renderReports()

    expect(
      await screen.findByText('No se pudieron cargar tus reportes'),
    ).toBeTruthy()

    const callsBefore = fetchMock.mock.calls.length
    await user.click(screen.getByRole('button', { name: 'Reintentar' }))

    await waitFor(() => {
      expect(fetchMock.mock.calls.length).toBeGreaterThan(callsBefore)
    })
  })

  it('ordena con el combobox accesible y sin select nativo', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => jsonResponse(cursorPage([REPORT]))),
    )
    const user = userEvent.setup()
    renderReports()

    await screen.findByText('Robo en la playa')
    expect(document.querySelector('select')).toBeNull()

    const sort = screen.getByRole('combobox', { name: 'Ordenar' })
    await user.click(sort)
    await user.click(
      screen.getByRole('option', { name: 'Ordenar: más antiguos' }),
    )

    await waitFor(() =>
      expect(sort.textContent).toContain('más antiguos'),
    )
  })
})
