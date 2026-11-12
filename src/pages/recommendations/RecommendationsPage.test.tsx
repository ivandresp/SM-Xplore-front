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
  ],
  page: 0,
  size: 100,
  total: 1,
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

function stubApi(handler: (url: string) => Response) {
  const fetchMock = vi.fn(async (input: RequestInfo | URL) => handler(String(input)))
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

function limitOf(url: string): number {
  return Number(new URL(url, 'http://localhost').searchParams.get('limit'))
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

    stubApi((url) => {
      if (url.includes('/recommendations')) {
        return jsonResponse({ ...recommendation(2), source: 'PERSONALIZED' })
      }
      if (url.includes('/preferences')) {
        return jsonResponse([])
      }
      return jsonResponse(CATEGORY_PAGE)
    })

    renderPage()

    expect(await screen.findByText(/formato que no reconocemos/)).toBeTruthy()
    expect(screen.queryByText(/error inesperado/)).toBeNull()

    expect(consoleSpy).toHaveBeenCalled()
    const printed = JSON.stringify(consoleSpy.mock.calls.map((call) => call[1]))
    expect(printed).toContain('GET /recommendations')
    expect(printed).toContain('source')
  })

  it('sube el limit de 12 en 12 y muestra la fuente y cuantas sugerencias hay', async () => {
    const limits: number[] = []

    stubApi((url) => {
      if (url.includes('/recommendations')) {
        const limit = limitOf(url)
        limits.push(limit)
        return jsonResponse(recommendation(limit))
      }
      if (url.includes('/preferences')) {
        return jsonResponse([])
      }
      return jsonResponse(CATEGORY_PAGE)
    })

    renderPage()

    expect(await screen.findByText('12 sugerencias')).toBeTruthy()
    expect(screen.getByText(/Fuente: Afinidad/)).toBeTruthy()

    await userEvent.click(
      screen.getByRole('button', { name: /ver más sugerencias/i }),
    )

    await waitFor(() => expect(screen.getByText('24 sugerencias')).toBeTruthy())
    expect(limits).toEqual([12, 24])
    expect(screen.getByText(/no hay páginas/i)).toBeTruthy()
  })

  it('se detiene en el maximo de 50 que acepta el servicio y lo dice', async () => {
    const limits: number[] = []

    stubApi((url) => {
      if (url.includes('/recommendations')) {
        const limit = limitOf(url)
        limits.push(limit)
        return jsonResponse(recommendation(limit))
      }
      if (url.includes('/preferences')) {
        return jsonResponse([])
      }
      return jsonResponse(CATEGORY_PAGE)
    })

    renderPage()

    expect(await screen.findByText('12 sugerencias')).toBeTruthy()

    for (let click = 0; click < 6; click += 1) {
      const button = screen.queryByRole('button', { name: /ver más sugerencias/i })
      if (button === null) {
        break
      }

      const before = limits.length
      await userEvent.click(button)
      await waitFor(() => expect(limits.length).toBeGreaterThan(before))
    }

    expect(limits).toEqual([12, 24, 36, 48, 50])
    expect(
      screen.queryByRole('button', { name: /ver más sugerencias/i }),
    ).toBeNull()
    expect(screen.getByText(/máximo de 50/)).toBeTruthy()
  })

  it('deja de ofrecer mas cuando el servicio devuelve menos de lo pedido', async () => {
    stubApi((url) => {
      if (url.includes('/recommendations')) {
        return jsonResponse(recommendation(limitOf(url) === 12 ? 12 : 13))
      }
      if (url.includes('/preferences')) {
        return jsonResponse([])
      }
      return jsonResponse(CATEGORY_PAGE)
    })

    renderPage()

    expect(await screen.findByText('12 sugerencias')).toBeTruthy()

    await userEvent.click(
      screen.getByRole('button', { name: /ver más sugerencias/i }),
    )

    await waitFor(() => expect(screen.getByText('13 sugerencias')).toBeTruthy())
    expect(
      screen.queryByRole('button', { name: /ver más sugerencias/i }),
    ).toBeNull()
    expect(screen.getByText(/No hay más sugerencias/)).toBeTruthy()
  })
})
