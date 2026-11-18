import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
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

function DetailTarget() {
  const { hash } = useLocation()
  return <p>Detalle{hash}</p>
}

function renderReports() {
  return render(
    <AuthContext.Provider value={AUTH}>
      <MemoryRouter initialEntries={['/reportes']}>
        <Routes>
          <Route path="/reportes" element={<MyReportsPage />} />
          <Route path="/reportes/nuevo" element={<p>Nuevo reporte</p>} />
          <Route path="/reportes/:reportId" element={<DetailTarget />} />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>,
  )
}

describe('MyReportsPage', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('lista los reportes con su estado en español', async () => {
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

  it('muestra reportes propios y ajenos por defecto, pagina y permite filtrar los propios', async () => {
    const other = { ...REPORT, id: 'r-2', user: { id: 'u-2', name: 'Luis' }, title: 'Aviso de otro turista' }
    const older = { ...other, id: 'r-3', title: 'Aviso de la siguiente página' }
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url.includes('/comments')) return jsonResponse(cursorPage([]))
      if (url.includes('/by-user/u-1')) return jsonResponse(cursorPage([REPORT]))
      if (url.includes('cursor=next')) return jsonResponse(cursorPage([older]))
      return jsonResponse({ content: [REPORT, other], nextCursor: 'next', hasNext: true })
    })
    vi.stubGlobal('fetch', fetchMock)
    const user = userEvent.setup()
    renderReports()

    expect(await screen.findByText(other.title)).toBeTruthy()
    expect(screen.getByText(REPORT.title)).toBeTruthy()
    expect(screen.queryByRole('heading', { name: 'Mis reportes de seguridad' })).toBeNull()
    expect(screen.queryByText('Lo que has reportado a las autoridades de destino.')).toBeNull()
    expect(String(fetchMock.mock.calls[0][0])).toMatch(/\/security-reports\?size=20$/)

    await user.click(screen.getByRole('button', { name: 'Ver más reportes' }))
    expect(await screen.findByText(older.title)).toBeTruthy()
    expect(screen.getByText(other.title)).toBeTruthy()

    await user.click(screen.getByRole('button', { name: 'Filtros' }))
    expect(screen.getByRole('button', { name: 'Ver todos' }).getAttribute('aria-pressed')).toBe('true')
    await user.click(screen.getByRole('button', { name: 'Ver mis reportes' }))
    expect(await screen.findByText(REPORT.title)).toBeTruthy()
    expect(screen.queryByText(other.title)).toBeNull()
    expect(screen.queryByText(older.title)).toBeNull()
    expect(fetchMock.mock.calls.some(([url]) => String(url).includes('/by-user/u-1?size=20'))).toBe(true)

    await user.click(screen.getByRole('button', { name: 'Ver todos' }))
    expect(await screen.findByText(other.title)).toBeTruthy()
    expect(screen.queryByText(older.title)).toBeNull()
  })

  it('offers a message button linked to comments, without coordinates or duplicate count', async () => {
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
      if (String(input).includes('/comments')) return jsonResponse(cursorPage([]))
      return jsonResponse(cursorPage([{ ...REPORT, location: { latitude: 11.24, longitude: -74.19 } }]))
    }))
    const user = userEvent.setup()
    renderReports()
    const button = await screen.findByRole('button', { name: 'Ver 0 respuestas' })
    expect(button.textContent).toBe('0')
    expect(button.querySelector('svg')).toBeTruthy()
    expect(screen.queryByText('Ver detalle y responder')).toBeNull()
    expect(screen.queryByText(/11\.24/)).toBeNull()
    const badge = within(button.closest('article')!).getByText('En curso')
    expect(badge.parentElement?.textContent).not.toBe('En curso')
    await user.click(button)
    expect(await screen.findByText('Detalle#comentarios')).toBeTruthy()
  })

  it('filters by status inside the collapsible panel and clears the selection', async () => {
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
      if (String(input).includes('/comments')) return jsonResponse(cursorPage([]))
      return jsonResponse(cursorPage([REPORT, { ...REPORT, id: 'r-2', title: 'Incidente resuelto', status: 'SOLVED' }]))
    }))
    const user = userEvent.setup()
    renderReports()
    await screen.findByText('Incidente resuelto')
    await user.click(screen.getByRole('button', { name: 'Filtros' }))
    await user.click(screen.getByRole('button', { name: 'Resueltos' }))
    expect(screen.queryByText('Robo en la playa')).toBeNull()
    expect(await screen.findByText('Incidente resuelto')).toBeTruthy()
    await user.click(screen.getByRole('button', { name: 'Limpiar filtros' }))
    expect(await screen.findByText('Robo en la playa')).toBeTruthy()
    await user.click(screen.getByRole('button', { name: 'Filtros' }))
    expect(screen.queryByRole('combobox', { name: 'Ordenar por fecha' })).toBeNull()
  })

  it('replaces retry with session exit when the API requires login', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({ status: 401 }, 401)))
    renderReports()
    expect(await screen.findByRole('button', { name: 'Cerrar sesión' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Reintentar' })).toBeNull()
  })

  it('muestra el error y reintenta la carga', async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ code: 'ERROR' }, 500))
    vi.stubGlobal('fetch', fetchMock)

    const user = userEvent.setup()
    renderReports()

    expect(
      await screen.findByText('No se pudieron cargar los reportes'),
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

    expect(screen.queryByRole('combobox', { name: 'Ordenar por fecha' })).toBeNull()
    const filters = screen.getByRole('button', { name: 'Filtros' })
    expect(filters.getAttribute('aria-expanded')).toBe('false')
    await user.click(filters)
    expect(filters.getAttribute('aria-expanded')).toBe('true')
    const sort = screen.getByRole('combobox', { name: 'Ordenar por fecha' })
    await user.click(sort)
    await user.click(
      screen.getByRole('option', { name: 'Más antiguos' }),
    )

    await waitFor(() =>
      expect(sort.textContent).toContain('Más antiguos'),
    )
  })
})
