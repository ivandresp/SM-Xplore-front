export type ActivityStatus =
  | 'DRAFT'
  | 'PUBLISHED'
  | 'PAUSED'
  | 'CANCELLED'

export interface ActivityResponse {
  id: string
  siteId: string
  guideId: string | null
  name: string
  category: string
  status: ActivityStatus
  price: number
  maxCapacity: number
  durationMinutes: number
  startsAt: string
  endsAt: string
  description: string | null
}

export interface ActivityRequest {
  siteId: string
  guideId?: string
  name: string
  category: string
  price: number
  maxCapacity: number
  durationMinutes: number
  startsAt: string
  endsAt: string
  description?: string
}

export interface UpdateActivityRequest {
  name: string
  category: string
  description?: string
  price: number
}

export interface AvailabilityRequest {
  startsAt: string
  endsAt: string
}

export interface SlotsRequest {
  maxCapacity: number
}

export interface ChangeActivityStatusRequest {
  status: ActivityStatus
}

export interface ActivitySearchFilters {
  category: string
}

/** Filtros de `GET /api/v1/activities`: todos opcionales y resueltos en servidor. */
export interface ActivityListFilters {
  search?: string
  status?: ActivityStatus
  category?: string
  siteId?: string
  guideId?: string
  priceMin?: number
  priceMax?: number
  /** ISO-8601, límite inferior inclusivo sobre `startsAt`. */
  startsAfter?: string
  /** ISO-8601, límite superior inclusivo sobre `startsAt`. */
  startsBefore?: string
  page?: number
  size?: number
}
