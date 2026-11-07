import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import UsersPage from './UsersPage'

const GUIDE = {
  id: 'u-1',
  fullName: 'Ana Guía',
  email: 'ana@smxplore.local',
  role: 'GUIDE',
  status: 'ACTIVO',
  providerStatus: null,
  signedUpAt: '2026-11-01T10:00:00Z',
}

const PROVIDER = {
  id: 'u-2',
  fullName: 'Kayaks del Mar',
  email: 'kayak@smxplore.local',
  role: 'SERVICE_PROVIDER',
  status: 'ACTIVO',
  providerStatus: 'PENDIENTE',
  signedUpAt: '2026-11-02T10:00:00Z',
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function renderUsers() {
  return render(
    <MemoryRouter initialEntries={['/app/usuarios']}>
      <Routes>
        <Route path="/app/usuarios" element={<UsersPage />} />
        <Route path="/app/usuarios/nuevo" element={<p>Crear usuario</p>} />
        <Route path="/app/usuarios/:userId" element={<p>Detalle</p>} />
        <Route
          path="/app/usuarios/prestadoras/:providerId"
          element={<p>Revisión de prestadora</p>}
        />
      </Routes>
    </MemoryRouter>,
  )
}

describe('UsersPage', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('pinta la página que devuelve el servidor y su estado de prestadora', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        jsonResponse({
          content: [GUIDE, PROVIDER],
          page: 0,
          size: 10,
          totalElements: 2,
          totalPages: 1,
        }),
      ),
    )

    renderUsers()

    expect(await screen.findByText('Ana Guía')).toBeTruthy()
    expect(screen.getByText('Kayaks del Mar')).toBeTruthy()
    expect(screen.getByText('Pendiente')).toBeTruthy()
  })

  it('filtra por rol en el servidor', async () => {
    const fetchMock = vi.fn(async (_url: string) =>
      jsonResponse({
        content: [GUIDE],
        page: 0,
        size: 10,
        totalElements: 1,
        totalPages: 1,
      }),
    )
    vi.stubGlobal('fetch', fetchMock)

    const user = userEvent.setup()
    renderUsers()

    await screen.findByText('Ana Guía')
    await user.click(screen.getByRole('button', { name: 'Guías' }))

    await waitFor(() => {
      const urls = fetchMock.mock.calls.map(([url]) => String(url))
      expect(urls.at(-1)).toContain('role=GUIDE')
    })
  })

  it('pide la siguiente página al servidor', async () => {
    const fetchMock = vi.fn(async (_url: string) =>
      jsonResponse({
        content: [GUIDE],
        page: 0,
        size: 10,
        totalElements: 30,
        totalPages: 3,
      }),
    )
    vi.stubGlobal('fetch', fetchMock)

    const user = userEvent.setup()
    renderUsers()

    await screen.findByText('Ana Guía')
    await user.click(screen.getByRole('button', { name: 'Página siguiente' }))

    await waitFor(() => {
      const urls = fetchMock.mock.calls.map(([url]) => String(url))
      expect(urls.at(-1)).toContain('page=1')
    })
  })
})
