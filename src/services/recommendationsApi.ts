import { z } from 'zod'
import { httpClient } from './httpClient'
import { parseResponse } from './validate'
import type {
  PreferenceResponse,
  RecommendationItemType,
  RecommendationQuery,
  RecommendationResponse,
} from '@/types'

const signalsSchema = z.object({
  affinity: z.number(),
  quality: z.number(),
  distanceKm: z.number().nullish(),
  novelty: z.number(),
})

const itemSchema = z.object({
  itemType: z.enum(['SITE', 'ACTIVITY', 'EVENT', 'SERVICE']),
  itemId: z.string(),
  name: z.string(),
  categoryId: z.string(),
  siteId: z.string(),
  score: z.number(),
  reason: z.string(),
  signals: signalsSchema,
})

const recommendationSchema = z.object({
  touristId: z.string(),
  generatedAt: z.string(),
  source: z.enum(['AFFINITY', 'QUALITY', 'NEARBY', 'FALLBACK', 'MIXED']),
  items: z.array(itemSchema),
})

/** El backend devuelve `distanceKm: null` cuando no hay coordenadas. */
const toRecommendations = (
  payload: z.infer<typeof recommendationSchema>,
): RecommendationResponse => ({
  ...payload,
  items: payload.items.map((item) => ({
    ...item,
    signals: { ...item.signals, distanceKm: item.signals.distanceKm ?? null },
  })),
})

const preferenceSchema = z.object({
  touristId: z.string(),
  categoryId: z.string(),
  weight: z.number(),
  source: z.enum(['EXPLICIT', 'INFERRED']),
  updatedAt: z.string(),
})

export const recommendationsApi = {
  /** `GET /api/v1/recommendations` — TOURIST con su id del JWT; ADMIN puede pedir otro. */
  list: async (query: RecommendationQuery = {}) => {
    const payload = await httpClient.get<unknown>('/recommendations', {
      query: {
        siteId: query.siteId,
        lat: query.lat,
        lng: query.lng,
        limit: query.limit,
        touristId: query.touristId,
      },
    })

    return toRecommendations(
      parseResponse(recommendationSchema, payload, 'GET /recommendations'),
    )
  },

  /** `POST /api/v1/interactions/view/{itemType}/{itemId}` — 204. Solo turista. */
  registerView: (
    itemType: RecommendationItemType,
    itemId: string,
  ): Promise<void> => httpClient.post<void>(`/interactions/view/${itemType}/${itemId}`),

  /** `GET /api/v1/preferences` — preferencias del turista autenticado. */
  listPreferences: async (): Promise<PreferenceResponse[]> => {
    const payload = await httpClient.get<unknown>('/preferences')
    return parseResponse(
      z.array(preferenceSchema),
      payload,
      'GET /preferences',
    )
  },

  /** `POST /api/v1/preferences` — 201. */
  addPreference: async (categoryId: string): Promise<PreferenceResponse> => {
    const payload = await httpClient.post<unknown>('/preferences', { categoryId })
    return parseResponse(preferenceSchema, payload, 'POST /preferences')
  },

  /** `DELETE /api/v1/preferences/{categoryId}` — 204. */
  removePreference: (categoryId: string): Promise<void> =>
    httpClient.delete<void>(`/preferences/${categoryId}`),
}
