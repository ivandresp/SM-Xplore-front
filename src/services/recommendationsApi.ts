import { z } from 'zod'
import { httpClient } from './httpClient'
import { parseResponse } from './validate'
import type {
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
}
