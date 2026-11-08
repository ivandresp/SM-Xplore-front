import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import ZonesListPage from './ZonesListPage'

const ZONE = {
  zoneId: 'z-1',
  managerId: 'u-3',
  name: 'Zona Norte',
  type: 'COSTERA',
  description: null,
  status: 'ACTIVE',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
}

const SITE = {
  siteId: 's-1',
  managerId: 'u-3',
  name: 'Playa Blanca',
  description: null,
  categoryId: null,
  categoryName: null,
  zoneId: 'z-1',
  zoneName: 'Zona Norte',
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

function renderZones() {
  return render(
    <MemoryRouter initialEntries={['/app/zonas']}>
      <Routes>
        <Route path="/app/zonas" element={<ZonesListPage />} />
        <Route path="/app/zonas/nueva" element={<p>Nueva zona</p>} />
        <Route path="/app/zonas/:zoneId" element={<p>Configurar zona</p>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('ZonesListPage', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('lista las zonas con sus sitios', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input)
        if (url.includes('/zones')) return jsonResponse(page([ZONE]))
        if (url.includes('/sites')) return jsonResponse(page([SITE]))
        return jsonResponse({}, 404)
      }),
    )

    renderZones()

    expect(await screen.findByText('Zona Norte')).toBeTruthy()
    expect(screen.getByText('Playa Blanca')).toBeTruthy()
    expect(screen.getByText('1 sitio')).toBeTruthy()
  })

  it('muestra el error y reintenta la carga', async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ code: 'ERROR' }, 500))
    vi.stubGlobal('fetch', fetchMock)

    const user = userEvent.setup()
    renderZones()

    expect(await screen.findByText('No se pudieron cargar las zonas')).toBeTruthy()

    const callsBefore = fetchMock.mock.calls.length
    await user.click(screen.getByRole('button', { name: 'Reintentar' }))

    await waitFor(() => {
      expect(fetchMock.mock.calls.length).toBeGreaterThan(callsBefore)
    })
  })
})
