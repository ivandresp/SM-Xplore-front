import { afterEach, describe, expect, it, vi } from 'vitest'
import { recommendationsApi } from './recommendationsApi'

const recommendationBody = {
  touristId: '0b132f27-8549-4332-b929-ebf2d1d16954',
  generatedAt: '2026-11-07T12:00:00Z',
  source: 'FALLBACK',
  items: [
    {
      itemType: 'EVENT',
      itemId: '34df7b18-3a05-4a8c-8213-0a180b7bbd56',
      name: 'Festival del Mar',
      categoryId: 'c1',
      siteId: 's1',
      score: 0.82,
      reason: 'Bien valorado (4.7/5, 120 reseñas)',
      signals: { affinity: 0.2, quality: 0.9, distanceKm: null, novelty: 0.5 },
    },
  ],
}

afterEach(() => {
  vi.unstubAllGlobals()
})

function stubFetch(body: unknown, status = 200) {
  const payload = status === 204 || body === undefined ? null : JSON.stringify(body)
  const fetchMock = vi.fn().mockResolvedValue(
    new Response(payload, {
      status,
      headers: { 'Content-Type': 'application/json' },
    }),
  )
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

describe('recommendationsApi', () => {
  it('normaliza distanceKm nulo y arma la query de la recomendación', async () => {
    const fetchMock = stubFetch(recommendationBody)

    const result = await recommendationsApi.list({ limit: 5 })

    expect(result.source).toBe('FALLBACK')
    expect(result.items[0].signals.distanceKm).toBeNull()
    expect(result.items[0].reason).toContain('Bien valorado')
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/recommendations?limit=5',
      expect.objectContaining({ method: 'GET' }),
    )
  })

  it('rechaza un source que el contrato no conoce y deja la etiqueta del endpoint', async () => {
    stubFetch({ ...recommendationBody, source: 'PERSONALIZED' })

    await expect(recommendationsApi.list()).rejects.toThrow(
      /^Respuesta inesperada de GET \/recommendations: /,
    )
  })

  it('rechaza un 200 sin cuerpo en vez de devolver undefined', async () => {
    stubFetch(undefined, 200)

    await expect(recommendationsApi.list()).rejects.toThrow(
      /Respuesta inesperada de GET \/recommendations/,
    )
  })

  it('rechaza una respuesta sin items', async () => {
    stubFetch({ touristId: 'x', generatedAt: 'y', source: 'MIXED' })

    await expect(recommendationsApi.list()).rejects.toThrow(/items/)
  })

  it('registra la visita con el tipo y el id en la ruta', async () => {
    const fetchMock = stubFetch(null, 204)

    await recommendationsApi.registerView('ACTIVITY', 'edfa1912-fe97-4cff-901d-e26bbfafcaa8')

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/interactions/view/ACTIVITY/edfa1912-fe97-4cff-901d-e26bbfafcaa8',
      expect.objectContaining({ method: 'POST' }),
    )
  })

  it('lista las preferencias del turista', async () => {
    const fetchMock = stubFetch([
      {
        touristId: 't1',
        categoryId: 'c1',
        weight: 1,
        source: 'EXPLICIT',
        updatedAt: '2026-11-07T12:00:00Z',
      },
    ])

    const preferences = await recommendationsApi.listPreferences()

    expect(preferences).toHaveLength(1)
    expect(preferences[0].categoryId).toBe('c1')
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/preferences',
      expect.objectContaining({ method: 'GET' }),
    )
  })

  it('añade y quita una preferencia por categoria', async () => {
    const fetchMock = stubFetch(
      {
        touristId: 't1',
        categoryId: 'c1',
        weight: 1,
        source: 'EXPLICIT',
        updatedAt: '2026-11-07T12:00:00Z',
      },
      201,
    )

    const added = await recommendationsApi.addPreference('c1')

    expect(added.source).toBe('EXPLICIT')
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/preferences',
      expect.objectContaining({ method: 'POST' }),
    )

    stubFetch(null, 204)
    await recommendationsApi.removePreference('c1')
  })
})
