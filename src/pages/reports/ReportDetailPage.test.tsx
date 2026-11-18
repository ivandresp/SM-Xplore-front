import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AuthContext } from '@/context/auth-context'
import type { AuthContextValue } from '@/context/auth-context'
import { securityReportsApi } from '@/services/securityReportsApi'
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
  registerGuide: vi.fn(),
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

function renderDetail(payload: Record<string, unknown>, path = '/reportes/r-1') {
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
      <MemoryRouter initialEntries={[path]}>
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
    vi.restoreAllMocks()
  })

  it('scrolls and focuses comments after the report loads when opened with its hash', async () => {
    const scroll = vi.fn()
    const original = HTMLElement.prototype.scrollIntoView
    HTMLElement.prototype.scrollIntoView = scroll
    try {
      renderDetail(report(), '/reportes/r-1#comentarios')
      const section = await screen.findByRole('article', { name: 'Comentarios (0)' })
      expect(document.activeElement).toBe(section)
      expect(scroll).toHaveBeenCalledWith({ block: 'start' })
    } finally {
      HTMLElement.prototype.scrollIntoView = original
    }
  })

  it('replaces description with the report sheet and opens a collapsible comments panel', async () => {
    renderDetail(report())
    await screen.findByText('Ficha del reporte')
    expect(screen.queryByRole('heading', { name: 'Descripción' })).toBeNull()
    expect(screen.queryByText('Me quitaron la mochila.')).toBeNull()
    const summary = screen.getByText('Comentarios (0)').closest('summary')!
    expect(summary).toBeTruthy()
    expect(summary.closest('details')?.open).toBe(true)
    expect((screen.getByLabelText('Añadir un comentario') as HTMLTextAreaElement).rows).toBe(1)
    expect(screen.getByRole('button', { name: 'Publicar comentario' }).querySelector('svg')).toBeTruthy()
  })

  it('publishes from the icon button, clears on success and preserves the draft on failure', async () => {
    const post = vi.spyOn(securityReportsApi, 'addComment').mockResolvedValue({ id: 'c1', reportId: 'r-1', user: { id: 'u-1', name: 'Ana' }, content: 'Mensaje', createdAt: '2026-11-12T10:00:00Z' })
    renderDetail(report())
    const input = await screen.findByLabelText('Añadir un comentario') as HTMLTextAreaElement
    fireEvent.change(input, { target: { value: '  Mensaje  ' } })
    fireEvent.click(screen.getByRole('button', { name: 'Publicar comentario' }))
    await waitFor(() => expect(input.value).toBe(''))
    expect(post).toHaveBeenCalledWith('r-1', { content: 'Mensaje' })
    post.mockRejectedValueOnce(new Error('offline'))
    fireEvent.change(input, { target: { value: 'Conservar borrador' } })
    fireEvent.click(screen.getByRole('button', { name: 'Publicar comentario' }))
    await screen.findByRole('alert')
    expect(input.value).toBe('Conservar borrador')
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
    expect(screen.queryByRole('img', { name: /^Mapa de / })).toBeNull()
  })

  it('muestra un mapa de la ubicación en la ficha en lugar de coordenadas', async () => {
    renderDetail(
      report({ location: { latitude: 11.2404, longitude: -74.199 } }),
    )

    const map = await screen.findByRole('img', { name: 'Mapa de Robo en la playa en 11.24040, -74.19900' })
    expect(map.closest('dd')?.previousElementSibling?.textContent).toBe('Ubicación')
    expect(screen.getByRole('link', { name: /© OpenStreetMap contributors/ })).toBeTruthy()
    expect(screen.queryByText('11.24040, -74.19900')).toBeNull()
    expect(screen.queryByText('Identificador')).toBeNull()
    const author = screen.getByText('Ana Turista')
    expect(author.parentElement?.querySelector('time')?.getAttribute('datetime')).toBe('2026-11-12T10:00:00Z')
    expect(screen.getByRole('button', { name: 'Acercar mapa' })).toBeTruthy()
  })
})
