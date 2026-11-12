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

const SITE = {
  siteId: 's-1',
  managerId: null,
  name: 'Catedral',
  description: null,
  categoryId: null,
  categoryName: null,
  zoneId: 'z-1',
  zoneName: 'Centro',
  zoneStatus: 'ACTIVO',
  latitude: 11.24,
  longitude: -74.2,
  photosUrls: [],
  status: 'ACTIVO',
  maxCapacity: 40,
  availability: null,
  createdAt: '2026-11-01T10:00:00Z',
  updatedAt: '2026-11-01T10:00:00Z',
}

const ZONE = {
  zoneId: 'z-1',
  managerId: null,
  name: 'Centro',
  type: null,
  description: null,
  status: 'ACTIVO',
  createdAt: '2026-11-01T10:00:00Z',
  updatedAt: '2026-11-01T10:00:00Z',
}

function catalogFetch() {
  return vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input)
    if (url.includes('/activities')) return jsonResponse(page([ACTIVITY]))
    if (url.includes('/sites')) return jsonResponse(page([SITE]))
    if (url.includes('/zones')) return jsonResponse(page([ZONE]))
    return jsonResponse(page([]))
  })
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

  it('filtra por atractivo con un combobox agrupado y sin selects nativos', async () => {
    const fetchStub = catalogFetch()
    vi.stubGlobal('fetch', fetchStub)

    const user = userEvent.setup()
    const { container } = renderExplore()

    await screen.findByText('Snorkel en Taganga')
    expect(container.querySelectorAll('select')).toHaveLength(0)

    const combobox = screen.getByRole('combobox', { name: 'Atractivo' })
    combobox.focus()
    await user.keyboard('{ArrowDown}')

    expect(combobox.getAttribute('aria-expanded')).toBe('true')
    expect(combobox.getAttribute('aria-activedescendant')).toBeTruthy()
    expect(screen.getByRole('group', { name: 'Centro' })).toBeTruthy()

    await user.keyboard('{ArrowDown}{Enter}')

    expect(combobox.getAttribute('aria-expanded')).toBe('false')
    expect(combobox.textContent).toContain('Catedral')

    await waitFor(() => {
      const urls = fetchStub.mock.calls.map(([input]) => String(input))
      expect(
        urls.some(
          (url) => url.includes('/activities') && url.includes('siteId=s-1'),
        ),
      ).toBe(true)
    })
  })

  it('ordena con el combobox del encabezado', async () => {
    const fetchStub = catalogFetch()
    vi.stubGlobal('fetch', fetchStub)

    const user = userEvent.setup()
    renderExplore()

    await screen.findByText('Snorkel en Taganga')

    await user.click(
      screen.getByRole('combobox', { name: 'Ordenar resultados' }),
    )
    await user.click(
      screen.getByRole('option', { name: 'Ordenar: Precio: menor a mayor' }),
    )

    await waitFor(() => {
      const urls = fetchStub.mock.calls.map(([input]) => String(input))
      expect(urls.some((url) => url.includes('sort=priceAsc'))).toBe(true)
    })
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
