export type RecommendationSource =
  | 'AFFINITY'
  | 'QUALITY'
  | 'NEARBY'
  | 'FALLBACK'
  | 'MIXED'

/** `ItemType` de ms-05: el mismo vocabulario que usa el catálogo del front. */
export type RecommendationItemType = 'SITE' | 'ACTIVITY' | 'EVENT' | 'SERVICE'

export interface RecommendationSignals {
  affinity: number
  quality: number
  distanceKm: number | null
  novelty: number
}

export interface RecommendationItem {
  itemType: RecommendationItemType
  itemId: string
  name: string
  categoryId: string
  siteId: string
  score: number
  /** Texto ya redactado por el backend, en español. */
  reason: string
  signals: RecommendationSignals
}

export interface RecommendationResponse {
  touristId: string
  generatedAt: string
  source: RecommendationSource
  items: RecommendationItem[]
}

export type PreferenceSource = 'EXPLICIT' | 'INFERRED'

/** `GET|POST /preferences` — las que el turista marca a mano pesan 1.0 y son `EXPLICIT`. */
export interface PreferenceResponse {
  touristId: string
  categoryId: string
  weight: number
  source: PreferenceSource
  updatedAt: string
}

export interface RecommendationQuery {
  siteId?: string
  lat?: number
  lng?: number
  limit?: number
  /** Solo ADMIN. */
  touristId?: string
}
