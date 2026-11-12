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

function page(content: unknown[], totalPages = 1) {
  return {
    content,
    page: 0,
    size: 12,
    total: content.length,
    totalPages,
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

/** Actividades + atractivos + zonas: hace falta para el combobox agrupado. */
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
      // Reserva la caja, pero no se pinta ni se anuncia.
      expect(document.querySelector('[data-skeleton="hidden"]')).not.toBeNull()
      expect(document.querySelector('[data-skeleton="visible"]')).toBeNull()

      await act(async () => {
        resolveActivities?.(jsonResponse(page([ACTIVITY])))
      })
      await act(async () => {
        await vi.advanceTimersByTimeAsync(400)
      })

      expect(document.querySelector('[data-skeleton]')).toBeNull()
      expect(screen.getByText('Snorkel en Taganga')).toBeTruthy()
    } finally {
      vi.useRealTimers()
    }
  })

  for (const total of [0, 1, 4, 12]) {
    it(`primera carga con ${total} resultados no pinta el esqueleto`, async () => {
      const items = Array.from({ length: total }, (_, index) => ({
        ...ACTIVITY,
        id: `a-${index + 1}`,
        name: `Actividad ${index + 1}`,
      }))
      vi.stubGlobal(
        'fetch',
        activityFetch(() => jsonResponse(page(items))),
      )

      renderExplore()

      if (total === 0) {
        expect(
          await screen.findByText('Todavía no hay actividades publicadas'),
        ).toBeTruthy()
      } else {
        expect(await screen.findByText('Actividad 1')).toBeTruthy()
      }

      expect(document.querySelector('[data-skeleton]')).toBeNull()
      expect(document.querySelector('section[aria-busy="true"]')).toBeNull()
    })
  }

  for (const nextCount of [0, 4, 12]) {
    it(`recarga con ${nextCount} resultados mantiene la lista anterior sin esqueleto`, async () => {
      let release: ((response: Response) => void) | null = null
      const initial = Array.from({ length: 12 }, (_, index) => ({
        ...ACTIVITY,
        id: `a-${index + 1}`,
        name: `Inicial ${index + 1}`,
      }))
      const next = Array.from({ length: nextCount }, (_, index) => ({
        ...OTHER_ACTIVITY,
        id: `n-${index + 1}`,
        name: `Nueva ${index + 1}`,
      }))

      vi.stubGlobal(
        'fetch',
        vi.fn((input: RequestInfo | URL) => {
          const url = String(input)
          if (!url.includes('/activities?')) {
            return Promise.resolve(jsonResponse(page([])))
          }
          if (url.includes('category=Naturaleza')) {
            return new Promise<Response>((resolve) => {
              release = resolve
            })
          }
          return Promise.resolve(jsonResponse(page(initial)))
        }),
      )

      const user = userEvent.setup()
      renderExplore()
      expect(await screen.findByText('Inicial 1')).toBeTruthy()

      await user.type(screen.getByLabelText('Categoría'), 'Naturaleza')
      await waitFor(() => {
        expect(release).not.toBeNull()
      })

      // Recarga en curso: el contenido anterior sigue montado y no hay esqueleto.
      expect(screen.getByText('Inicial 1')).toBeTruthy()
      expect(document.querySelector('[data-skeleton]')).toBeNull()
      expect(
        document.querySelector('section[aria-busy="true"]'),
      ).not.toBeNull()

      await act(async () => {
        release?.(jsonResponse(page(next)))
      })

      if (nextCount === 0) {
        expect(
          await screen.findByText(
            'No encontramos actividades con esos filtros',
          ),
        ).toBeTruthy()
      } else {
        expect(await screen.findByText('Nueva 1')).toBeTruthy()
      }
      expect(screen.queryByText('Inicial 1')).toBeNull()
    })
  }

  it('el reintento tras error vuelve a cargar sin dejar hueco ni esqueleto visible', async () => {
    let calls = 0
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input)
        if (url.includes('/activities?')) {
          calls += 1
          return calls === 1
            ? jsonResponse({ code: 'ERROR' }, 500)
            : jsonResponse(page([ACTIVITY]))
        }
        return jsonResponse(page([]))
      }),
    )

    const user = userEvent.setup()
    renderExplore()

    expect(
      await screen.findByText('No pudimos cargar las actividades'),
    ).toBeTruthy()

    await user.click(screen.getByRole('button', { name: 'Reintentar' }))

    expect(await screen.findByText('Snorkel en Taganga')).toBeTruthy()
    expect(document.querySelector('[data-skeleton]')).toBeNull()
  })

  it('si el esqueleto aparece, se mantiene 250 ms aunque la respuesta llegue a los 210 ms', async () => {
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
        await vi.advanceTimersByTimeAsync(200)
      })
      expect(document.querySelector('[data-skeleton="visible"]')).not.toBeNull()

      // La respuesta llega a los 210 ms, pero el contenido no puede tapar el
      // minimo visible de 250 ms.
      await act(async () => {
        resolveActivities?.(jsonResponse(page([ACTIVITY])))
      })
      expect(screen.queryByText('Snorkel en Taganga')).toBeNull()
      expect(document.querySelector('[data-skeleton="visible"]')).not.toBeNull()

      await act(async () => {
        await vi.advanceTimersByTimeAsync(249)
      })
      expect(document.querySelector('[data-skeleton="visible"]')).not.toBeNull()
      expect(screen.queryByText('Snorkel en Taganga')).toBeNull()

      await act(async () => {
        await vi.advanceTimersByTimeAsync(1)
      })
      expect(document.querySelector('[data-skeleton]')).toBeNull()
      expect(screen.getByText('Snorkel en Taganga')).toBeTruthy()
    } finally {
      vi.useRealTimers()
    }
  })

  it('la paginacion aparece junto al contenido, no durante el esqueleto', async () => {
    vi.useFakeTimers()
    try {
      let resolveActivities: ((response: Response) => void) | null = null
      const items = Array.from({ length: 12 }, (_, index) => ({
        ...ACTIVITY,
        id: `a-${index + 1}`,
        name: `Actividad ${index + 1}`,
      }))
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
        await vi.advanceTimersByTimeAsync(200)
      })
      expect(document.querySelector('[data-skeleton="visible"]')).not.toBeNull()
      expect(
        screen.queryByRole('navigation', { name: 'Paginación' }),
      ).toBeNull()

      // La respuesta llega a los 210 ms, pero el esqueleto retiene 250 ms.
      await act(async () => {
        resolveActivities?.(jsonResponse(page(items, 2)))
      })
      expect(
        screen.queryByRole('navigation', { name: 'Paginación' }),
      ).toBeNull()
      expect(screen.queryByText('Actividad 1')).toBeNull()

      await act(async () => {
        await vi.advanceTimersByTimeAsync(249)
      })
      expect(
        screen.queryByRole('navigation', { name: 'Paginación' }),
      ).toBeNull()

      await act(async () => {
        await vi.advanceTimersByTimeAsync(1)
      })
      expect(screen.getByText('Actividad 1')).toBeTruthy()
      expect(
        screen.getByRole('navigation', { name: 'Paginación' }),
      ).toBeTruthy()
      expect(document.querySelector('[data-skeleton]')).toBeNull()
    } finally {
      vi.useRealTimers()
    }
  })

  it('al reintentar mantiene el mensaje de error hasta que aparece el esqueleto', async () => {
    vi.useFakeTimers()
    try {
      let calls = 0
      let resolveRetry: ((response: Response) => void) | null = null
      vi.stubGlobal(
        'fetch',
        vi.fn((input: RequestInfo | URL) => {
          const url = String(input)
          if (!url.includes('/activities?')) {
            return Promise.resolve(jsonResponse(page([])))
          }
          calls += 1
          if (calls === 1) {
            return Promise.resolve(jsonResponse({ code: 'ERROR' }, 500))
          }
          return new Promise<Response>((resolve) => {
            resolveRetry = resolve
          })
        }),
      )

      renderExplore()
      await act(async () => {
        await vi.advanceTimersByTimeAsync(50)
      })
      expect(
        screen.getByText('No pudimos cargar las actividades'),
      ).toBeTruthy()

      await act(async () => {
        screen.getByRole('button', { name: 'Reintentar' }).click()
      })

      // t=0..199: el mensaje sigue montado y el esqueleto aun no se pinta.
      expect(
        screen.getByText('No pudimos cargar las actividades'),
      ).toBeTruthy()
      expect(document.querySelector('[data-skeleton="visible"]')).toBeNull()

      await act(async () => {
        await vi.advanceTimersByTimeAsync(199)
      })
      expect(
        screen.getByText('No pudimos cargar las actividades'),
      ).toBeTruthy()
      expect(document.querySelector('[data-skeleton="visible"]')).toBeNull()

      await act(async () => {
        await vi.advanceTimersByTimeAsync(1)
      })
      expect(
        screen.queryByText('No pudimos cargar las actividades'),
      ).toBeNull()
      expect(document.querySelector('[data-skeleton="visible"]')).not.toBeNull()

      await act(async () => {
        resolveRetry?.(jsonResponse(page([ACTIVITY])))
      })
      await act(async () => {
        await vi.advanceTimersByTimeAsync(250)
      })
      expect(screen.getByText('Snorkel en Taganga')).toBeTruthy()
      expect(document.querySelector('[data-skeleton]')).toBeNull()
    } finally {
      vi.useRealTimers()
    }
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
