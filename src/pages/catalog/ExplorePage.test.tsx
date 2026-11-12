import { act, render, screen, waitFor } from '@testing-library/react'
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
    size: 12,
    total: content.length,
    totalPages: 1,
  }
}

function renderExplore(entry = '/explorar') {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <Routes>
        <Route path="/explorar" element={<ExplorePage />} />
        <Route path="/actividades/:activityId" element={<p>Detalle</p>} />
      </Routes>
    </MemoryRouter>,
  )
}

function activityFetch(
  respond: (url: string) => ReturnType<typeof jsonResponse>,
) {
  return vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input)
    if (url.includes('/activities')) {
      return respond(url)
    }
    return jsonResponse(page([]))
  })
}

describe('ExplorePage', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('pide solo las publicadas al servidor y muestra el total', async () => {
    const fetchStub = activityFetch(() =>
      jsonResponse(page([ACTIVITY, OTHER_ACTIVITY])),
    )
    vi.stubGlobal('fetch', fetchStub)

    renderExplore()

    expect(await screen.findByText('Snorkel en Taganga')).toBeTruthy()
    expect(screen.getByText('Caminata por Tayrona')).toBeTruthy()
    expect(screen.getByText('2 resultados')).toBeTruthy()

    const activitiesCall = fetchStub.mock.calls
      .map(([input]) => String(input))
      .find((url) => url.includes('/activities?'))
    expect(activitiesCall).toContain('status=PUBLISHED')
    expect(activitiesCall).toContain('size=12')
  })

  it('lee los filtros de la URL al entrar', async () => {
    const fetchStub = activityFetch(() =>
      jsonResponse(page([ACTIVITY])),
    )
    vi.stubGlobal('fetch', fetchStub)

    renderExplore('/explorar?categoria=Aventura&precioMax=150000&pagina=2')

    await screen.findByText('Snorkel en Taganga')

    const activitiesCall = fetchStub.mock.calls
      .map(([input]) => String(input))
      .find((url) => url.includes('/activities?'))
    expect(activitiesCall).toContain('category=Aventura')
    expect(activitiesCall).toContain('priceMax=150000')
    expect(activitiesCall).toContain('page=1')
    expect(screen.getByRole('button', { name: /Quitar filtro Categoría/ })).toBeTruthy()
  })

  it('escribe el texto de categoría en la URL y vuelve a consultar', async () => {
    const fetchStub = activityFetch((url) =>
      url.includes('category=Aventura')
        ? jsonResponse(page([ACTIVITY]))
        : jsonResponse(page([ACTIVITY, OTHER_ACTIVITY])),
    )
    vi.stubGlobal('fetch', fetchStub)

    const user = userEvent.setup()
    renderExplore()

    await screen.findByText('Caminata por Tayrona')
    await user.type(screen.getByLabelText('Categoría'), 'Aventura')

    await waitFor(() => {
      expect(screen.getByText('1 resultado')).toBeTruthy()
    })

    const urls = fetchStub.mock.calls.map(([input]) => String(input))
    expect(urls.some((url) => url.includes('category=Aventura'))).toBe(true)
  })

  it('no pinta el esqueleto si la respuesta llega antes de 200 ms', async () => {
    vi.useFakeTimers()
    try {
      let resolveActivities: ((response: Response) => void) | null = null
      vi.stubGlobal(
        'fetch',
        vi.fn((input: RequestInfo | URL) => {
          const url = String(input)
          if (url.includes('/activities?')) {
            return new Promise<Response>((resolve) => {
              resolveActivities = resolve
            })
          }
          return Promise.resolve(jsonResponse(page([])))
        }),
      )

      renderExplore()

      await act(async () => {
        await vi.advanceTimersByTimeAsync(150)
      })
      expect(
        screen.queryByRole('status', { name: 'Cargando actividades…' }),
      ).toBeNull()

      await act(async () => {
        resolveActivities?.(jsonResponse(page([ACTIVITY])))
      })
      await act(async () => {
        await vi.advanceTimersByTimeAsync(400)
      })

      expect(
        screen.queryByRole('status', { name: 'Cargando actividades…' }),
      ).toBeNull()
      expect(screen.getByText('Snorkel en Taganga')).toBeTruthy()
    } finally {
      vi.useRealTimers()
    }
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