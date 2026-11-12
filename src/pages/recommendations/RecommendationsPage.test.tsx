import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { clearCache } from '@/services/cache'
import RecommendationsPage from './RecommendationsPage'

function jsonResponse(body: unknown, status = 200) {
  return new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

const CATEGORY_PAGE = {
  content: [
    {
      categoryId: 'c1',
      name: 'Playas',
      scope: 'GENERAL',
      parentId: null,
      updatedAt: '2026-11-07T12:00:00Z',
    },
    {
      categoryId: 'c2',
      name: 'Museos',
      scope: 'GENERAL',
      parentId: null,
      updatedAt: '2026-11-07T12:00:00Z',
    },
  ],
  page: 0,
  size: 100,
  total: 2,
  totalPages: 1,
}

function item(index: number) {
  return {
    itemType: 'ACTIVITY',
    itemId: `item-${index}`,
    name: `Plan ${index}`,
    categoryId: 'c1',
    siteId: 's1',
    score: 0.8,
    reason: 'Bien valorado (4.7/5, 120 reseñas)',
    signals: { affinity: 0.5, quality: 0.8, distanceKm: null, novelty: 0.4 },
  }
}

/** Payload con la forma real de ms-05 (RecommendationResponse). */
function recommendation(count: number) {
  return {
    touristId: '278f6f2b-7b68-4655-b16a-4ec33d88168b',
    generatedAt: '2026-11-12T05:56:42.116643745Z',
    source: 'AFFINITY',
    items: Array.from({ length: count }, (_, index) => item(index)),
  }
}

interface StubOptions {
  /** Cuántos items devuelve el backend para cada limit pedido. */
  itemsForLimit?: (limit: number) => number
  /** Limit que el backend rechaza (corte por encima del max-limit desplegado). */
  rejectLimit?: number
  rejectStatus?: number
  preferences?: unknown[]
  /** Respuesta a medida por llamada de /recommendations (1-based); permite diferirla. */
  recommendationsCall?: (callIndex: number, limit: number) => Response | Promise<Response>
}

function stubApi({
  itemsForLimit = (limit) => limit,
  rejectLimit,
  rejectStatus = 400,
  preferences = [],
  recommendationsCall,
}: StubOptions = {}) {
  const limits: number[] = []
  let recommendationCalls = 0

  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input)

    if (url === '/api/v1/preferences' && init?.method === 'POST') {
      return jsonResponse(
        {
          touristId: 't1',
          categoryId: 'c1',
          weight: 1,
          source: 'EXPLICIT',
          updatedAt: '2026-11-12T05:10:00Z',
        },
        201,
      )
    }

    if (url.includes('/recommendations')) {
      const limit = Number(new URL(url, 'http://localhost').searchParams.get('limit'))
      limits.push(limit)
      recommendationCalls += 1

      if (recommendationsCall !== undefined) {
        return await recommendationsCall(recommendationCalls, limit)
      }

      if (limit === rejectLimit) {
        return jsonResponse(
          {
            title: 'Error',
            status: rejectStatus,
            detail: 'limit must be between 1 and 20',
            instance: '/api/v1/recommendations',
          },
          rejectStatus,
        )
      }

      return jsonResponse(recommendation(itemsForLimit(limit)))
    }

    if (url.includes('/preferences') && url !== '/api/v1/preferences') {
      return new Response(null, { status: 204 })
    }

    if (url === '/api/v1/preferences') {
      return jsonResponse(preferences)
    }

    return jsonResponse(CATEGORY_PAGE)
  })

  vi.stubGlobal('fetch', fetchMock)
  return { fetchMock, limits }
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/app/recomendaciones']}>
      <RecommendationsPage />
    </MemoryRouter>,
  )
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  clearCache()
})

describe('RecommendationsPage', () => {
  it('muestra un mensaje accionable y deja el cause en consola cuando el contrato cambia', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input)
        if (url.includes('/recommendations')) {
          return jsonResponse({ ...recommendation(2), source: 'PERSONALIZED' })
        }
        if (url === '/api/v1/preferences') {
          return jsonResponse([])
        }
        return jsonResponse(CATEGORY_PAGE)
      }),
    )

    renderPage()

    expect(await screen.findByText(/formato que no reconocemos/)).toBeTruthy()
    expect(screen.queryByText(/error inesperado/)).toBeNull()

    expect(consoleSpy).toHaveBeenCalled()
    const printed = JSON.stringify(consoleSpy.mock.calls.map((call) => call[1]))
    expect(printed).toContain('GET /recommendations')
    expect(printed).toContain('source')
  })

  it('sube el limit de 12 en 12 y muestra la fuente y cuantas sugerencias hay', async () => {
    const { limits } = stubApi()

    renderPage()

    expect(await screen.findByText('12 sugerencias')).toBeTruthy()
    expect(screen.getByText(/Fuente: Afinidad/)).toBeTruthy()

    await userEvent.click(
      screen.getByRole('button', { name: /ver más sugerencias/i }),
    )

    await waitFor(() => expect(screen.getByText('24 sugerencias')).toBeTruthy())
    expect(limits).toEqual([12, 24])
    expect(screen.getByText(/ni informa un total/i)).toBeTruthy()
  })

  it('se detiene en el maximo de 50 que acepta el servicio y lo dice', async () => {
    const { limits } = stubApi()

    renderPage()

    expect(await screen.findByText('12 sugerencias')).toBeTruthy()

    for (const expected of [24, 36, 48, 50]) {
      await userEvent.click(
        screen.getByRole('button', { name: /ver más sugerencias/i }),
      )
      await waitFor(() =>
        expect(screen.getByText(`${expected} sugerencias`)).toBeTruthy(),
      )
    }

    expect(limits).toEqual([12, 24, 36, 48, 50])
    expect(
      screen.queryByRole('button', { name: /ver más sugerencias/i }),
    ).toBeNull()
    expect(screen.getByText(/máximo de 50/)).toBeTruthy()
  })

  it('deja de ofrecer mas cuando el servicio devuelve menos de lo pedido', async () => {
    stubApi({ itemsForLimit: (limit) => (limit === 12 ? 12 : 13) })

    renderPage()

    expect(await screen.findByText('12 sugerencias')).toBeTruthy()

    await userEvent.click(
      screen.getByRole('button', { name: /ver más sugerencias/i }),
    )

    await waitFor(() => expect(screen.getByText('13 sugerencias')).toBeTruthy())
    expect(
      screen.queryByRole('button', { name: /ver más sugerencias/i }),
    ).toBeNull()
    expect(screen.getByText(/no quedan más candidatas/i)).toBeTruthy()
  })

  it('conserva las tarjetas y no escala el limit cuando falla «ver más»', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { limits } = stubApi({ rejectLimit: 24 })

    renderPage()

    expect(await screen.findByText('12 sugerencias')).toBeTruthy()

    await userEvent.click(
      screen.getByRole('button', { name: /ver más sugerencias/i }),
    )

    // Siguen las 12 tarjetas y el error se queda inline.
    expect(await screen.findByRole('alert')).toBeTruthy()
    expect(screen.getByText('12 sugerencias')).toBeTruthy()
    expect(
      screen.queryByRole('button', { name: /^Reintentar$/ }),
    ).toBeNull()
    expect(consoleSpy).toHaveBeenCalled()

    // Otro intento repite el mismo corte: nunca salta a 48 con la lista vacia.
    await userEvent.click(
      screen.getByRole('button', { name: /ver más sugerencias/i }),
    )
    await waitFor(() => expect(limits).toEqual([12, 24, 24]))
  })

  it('vuelve al corte inicial al reintentar tras un fallo de carga', async () => {
    const { limits } = stubApi({ rejectLimit: 12, rejectStatus: 500 })

    renderPage()

    expect(await screen.findByText(/error interno/i)).toBeTruthy()
    await userEvent.click(screen.getByRole('button', { name: /^Reintentar$/ }))

    await waitFor(() => expect(limits).toEqual([12, 12]))
  })

  it('limpia el select al anadir y no permite un POST duplicado', async () => {
    const { fetchMock } = stubApi()

    renderPage()

    expect(await screen.findByText('12 sugerencias')).toBeTruthy()

    const select = screen.getByLabelText('Añadir categoría') as HTMLSelectElement
    await userEvent.selectOptions(select, 'c1')
    await userEvent.click(screen.getByRole('button', { name: 'Añadir' }))

    await waitFor(() => expect(select.value).toBe(''))
    expect(
      (screen.getByRole('button', { name: 'Añadir' }) as HTMLButtonElement)
        .disabled,
    ).toBe(true)

    const posts = fetchMock.mock.calls.filter(
      ([input, init]) =>
        String(input) === '/api/v1/preferences' &&
        (init as RequestInit | undefined)?.method === 'POST',
    )
    expect(posts).toHaveLength(1)
  })

  it('no pierde el foco de teclado cuando el boton sigue disponible', async () => {
    stubApi()

    renderPage()

    const button = await screen.findByRole('button', {
      name: /ver más sugerencias/i,
    })
    button.focus()
    expect(document.activeElement).toBe(button)

    await userEvent.keyboard('{Enter}')

    await waitFor(() => expect(screen.getByText('24 sugerencias')).toBeTruthy())
    expect(document.activeElement).toBe(
      screen.getByRole('button', { name: /ver más sugerencias/i }),
    )
  })

  it('conserva el corte abierto cuando recarga por una preferencia', async () => {
    const { limits } = stubApi()

    renderPage()

    expect(await screen.findByText('12 sugerencias')).toBeTruthy()
    await userEvent.click(
      screen.getByRole('button', { name: /ver más sugerencias/i }),
    )
    await waitFor(() => expect(screen.getByText('24 sugerencias')).toBeTruthy())

    const select = screen.getByLabelText('Añadir categoría') as HTMLSelectElement
    await userEvent.selectOptions(select, 'c1')
    await userEvent.click(screen.getByRole('button', { name: 'Añadir' }))

    // La recarga vuelve a pedir 24, no 12, y la lista sigue en 24.
    await waitFor(() => expect(limits).toEqual([12, 24, 24]))
    expect(screen.getByText('24 sugerencias')).toBeTruthy()
  })

  it('conserva las tarjetas y avisa inline cuando falla la recarga', async () => {
    stubApi({
      recommendationsCall: (callIndex) =>
        callIndex === 1
          ? jsonResponse(recommendation(12))
          : jsonResponse(
              {
                title: 'Internal error',
                status: 500,
                detail: 'Internal detail: Cypher query failed at line 12',
                instance: '/api/v1/recommendations',
              },
              500,
            ),
    })

    renderPage()

    expect(await screen.findByText('12 sugerencias')).toBeTruthy()

    const select = screen.getByLabelText('Añadir categoría') as HTMLSelectElement
    await userEvent.selectOptions(select, 'c1')
    await userEvent.click(screen.getByRole('button', { name: 'Añadir' }))

    expect(await screen.findByRole('alert')).toBeTruthy()
    expect(screen.getByText('12 sugerencias')).toBeTruthy()
    expect(screen.queryByRole('button', { name: /^Reintentar$/ })).toBeNull()
    expect(screen.queryByText(/Cypher/)).toBeNull()
  })

  it('no deja que una respuesta vieja de «ver más» pise la recarga', async () => {
    let resolveStale: ((response: Response) => void) | null = null
    const stale = new Promise<Response>((resolve) => {
      resolveStale = resolve
    })

    const { limits } = stubApi({
      recommendationsCall: (callIndex) => {
        if (callIndex === 1) return jsonResponse(recommendation(12))
        // El «ver más» a 24 queda en vuelo hasta que el test lo resuelva.
        if (callIndex === 2) return stale
        // La recarga usa el corte que está en pantalla (12), no el 24 que no llegó.
        return jsonResponse(recommendation(9))
      },
    })

    renderPage()

    expect(await screen.findByText('12 sugerencias')).toBeTruthy()
    await userEvent.click(
      screen.getByRole('button', { name: /ver más sugerencias/i }),
    )

    const select = screen.getByLabelText('Añadir categoría') as HTMLSelectElement
    await userEvent.selectOptions(select, 'c1')
    await userEvent.click(screen.getByRole('button', { name: 'Añadir' }))

    await waitFor(() => expect(screen.getByText('9 sugerencias')).toBeTruthy())
    expect(limits).toEqual([12, 24, 12])

    // La respuesta vieja (24 items, ranking anterior) llega tarde y se descarta.
    resolveStale!(jsonResponse(recommendation(24)))
    await new Promise((resolve) => setTimeout(resolve, 80))

    expect(screen.getByText('9 sugerencias')).toBeTruthy()
    expect(screen.queryByText('24 sugerencias')).toBeNull()
  })

  it('lleva el foco al encabezado cuando el boton desaparece tras cargar', async () => {
    stubApi({ itemsForLimit: (limit) => (limit === 12 ? 12 : 13) })

    renderPage()

    const button = await screen.findByRole('button', {
      name: /ver más sugerencias/i,
    })
    button.focus()
    await userEvent.keyboard('{Enter}')

    await waitFor(() => expect(screen.getByText('13 sugerencias')).toBeTruthy())
    expect(
      screen.queryByRole('button', { name: /ver más sugerencias/i }),
    ).toBeNull()
    expect(document.activeElement).toBe(
      screen.getByRole('heading', { name: /^Sugerencias$/ }),
    )
  })
})
