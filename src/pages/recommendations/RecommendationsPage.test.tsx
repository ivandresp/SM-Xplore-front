import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { clearCache } from '@/services/cache'
import { recommendationsApi } from '@/services/recommendationsApi'
import RecommendationsPage from './RecommendationsPage'

function jsonResponse(body: unknown, status = 200) {
  return new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
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
  /** Respuesta a medida por llamada de /recommendations (1-based); permite diferirla. */
  recommendationsCall?: (callIndex: number, limit: number) => Response | Promise<Response>
}

function stubApi({
  itemsForLimit = (limit) => limit,
  rejectLimit,
  rejectStatus = 400,
  recommendationsCall,
}: StubOptions = {}) {
  const limits: number[] = []
  let recommendationCalls = 0

  const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input)

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

    throw new Error(`Unexpected request: ${url}`)
  })

  vi.stubGlobal('fetch', fetchMock)
  return { fetchMock, limits }
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/recomendaciones']}>
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
  it('no ofrece edición de preferencias ni consulta sus catálogos desde Para ti', async () => {
    const { fetchMock } = stubApi()
    renderPage()
    expect(await screen.findByText('12 sugerencias')).toBeTruthy()
    expect(screen.queryByRole('heading', { name: 'Tus intereses' })).toBeNull()
    expect(screen.queryByRole('combobox', { name: 'Añadir categoría' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Añadir' })).toBeNull()
    expect(fetchMock.mock.calls.some(([input]) => /\/(preferences|categories)(?:[/?]|$)/.test(String(input)))).toBe(false)
  })

  it('muestra un mensaje accionable y deja el cause en consola cuando el contrato cambia', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input)
        if (url.includes('/recommendations')) {
          return jsonResponse({ ...recommendation(2), source: 'PERSONALIZED' })
        }
        throw new Error(`Unexpected request: ${url}`)
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
    // El estado de error completo no aparece; el aviso es inline y trae su propio reintento.
    expect(screen.queryByText('No pudimos cargar tus recomendaciones')).toBeNull()
    expect(screen.getByRole('button', { name: /^Reintentar$/ })).toBeTruthy()
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


  it('conserva las tarjetas y avisa inline cuando falla ampliar las sugerencias', async () => {
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

    await userEvent.click(screen.getByRole('button', { name: /ver más sugerencias/i }))

    expect(await screen.findByRole('alert')).toBeTruthy()
    expect(screen.getByText('12 sugerencias')).toBeTruthy()
    expect(screen.queryByText('No pudimos cargar tus recomendaciones')).toBeNull()
    expect(screen.getByRole('button', { name: /^Reintentar$/ })).toBeTruthy()
    expect(screen.queryByText(/Cypher/)).toBeNull()
  })

  it('no deja que una respuesta vieja del reintento pise una ampliación posterior', async () => {
    let resolveStale!: (response: Response) => void
    const stale = new Promise<Response>((resolve) => { resolveStale = resolve })
    stubApi({ recommendationsCall: (callIndex) => {
      if (callIndex === 1) return jsonResponse(recommendation(12))
      if (callIndex === 2) return jsonResponse({ status: 500, title: 'Error' }, 500)
      if (callIndex === 3) return stale
      return jsonResponse(recommendation(24))
    } })
    renderPage()
    expect(await screen.findByText('12 sugerencias')).toBeTruthy()
    await userEvent.click(screen.getByRole('button', { name: /ver más sugerencias/i }))
    await screen.findByRole('alert')
    // Simula que la entrada de 12 ya expiró para que el reintento use la red.
    clearCache()
    await userEvent.click(screen.getByRole('button', { name: /^Reintentar$/ }))
    await userEvent.click(screen.getByRole('button', { name: /ver más sugerencias/i }))
    expect(await screen.findByText('24 sugerencias')).toBeTruthy()
    await act(async () => { resolveStale(jsonResponse(recommendation(9))) })
    expect(screen.getByText('24 sugerencias')).toBeTruthy()
    expect(screen.queryByText('9 sugerencias')).toBeNull()
  })

  it('el reintento inline conserva el corte actual, incluido cuando sigue cacheado', async () => {
    const request = vi.spyOn(recommendationsApi, 'list')
    const { limits } = stubApi({ rejectLimit: 36, rejectStatus: 500 })
    renderPage()
    expect(await screen.findByText('12 sugerencias')).toBeTruthy()
    await userEvent.click(screen.getByRole('button', { name: /ver más sugerencias/i }))
    expect(await screen.findByText('24 sugerencias')).toBeTruthy()
    await userEvent.click(screen.getByRole('button', { name: /ver más sugerencias/i }))
    await screen.findByRole('alert')
    await userEvent.click(screen.getByRole('button', { name: /^Reintentar$/ }))
    await waitFor(() => expect(request.mock.calls.map(([query]) => query?.limit)).toEqual([12, 24, 36, 24]))
    expect(limits).toEqual([12, 24, 36])
    expect(screen.getByText('24 sugerencias')).toBeTruthy()
    expect(screen.queryByRole('alert')).toBeNull()
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
