import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import ExplorePage from './ExplorePage'

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
  description: 'Arrecifes frente a Taganga.',
}

const OTHER_ACTIVITY = {
  ...ACTIVITY,
  id: 'a-2',
  name: 'Caminata por Tayrona',
  category: 'Naturaleza',
}

const DRAFT_ACTIVITY = {
  ...ACTIVITY,
  id: 'a-3',
  name: 'Borrador sin publicar',
  status: 'DRAFT',
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

function renderExplore() {
  return render(
    <MemoryRouter initialEntries={['/explorar']}>
      <Routes>
        <Route path="/explorar" element={<ExplorePage />} />
        <Route path="/actividades/:activityId" element={<p>Detalle</p>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('ExplorePage', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('pinta solo las actividades publicadas y el contador', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input)
        if (url.includes('/activities')) {
          return jsonResponse(page([ACTIVITY, OTHER_ACTIVITY, DRAFT_ACTIVITY]))
        }
        return jsonResponse(page([]))
      }),
    )

    renderExplore()

    expect(await screen.findByText('Snorkel en Taganga')).toBeTruthy()
    expect(screen.getByText('Caminata por Tayrona')).toBeTruthy()
    expect(screen.queryByText('Borrador sin publicar')).toBeNull()
    expect(screen.getByText('2 resultados')).toBeTruthy()
  })

  it('filtra en cliente al aplicar una categoría', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input)
        if (url.includes('/activities')) {
          return jsonResponse(page([ACTIVITY, OTHER_ACTIVITY]))
        }
        return jsonResponse(page([]))
      }),
    )

    const user = userEvent.setup()
    renderExplore()

    await screen.findByText('Snorkel en Taganga')
    await user.click(screen.getByRole('button', { name: 'Aventura' }))
    await user.click(screen.getByRole('button', { name: 'Aplicar' }))

    await waitFor(() => {
      expect(screen.getByText('1 resultado')).toBeTruthy()
    })
    expect(screen.queryByText('Caminata por Tayrona')).toBeNull()
  })

  it('muestra el error y reintenta la carga', async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ code: 'ERROR' }, 500))
    vi.stubGlobal('fetch', fetchMock)

    const user = userEvent.setup()
    renderExplore()

    expect(
      await screen.findByText('No pudimos cargar las actividades'),
    ).toBeTruthy()

    const callsBefore = fetchMock.mock.calls.length
    await user.click(screen.getByRole('button', { name: 'Reintentar' }))

    await waitFor(() => {
      expect(fetchMock.mock.calls.length).toBeGreaterThan(callsBefore)
    })
  })
})
