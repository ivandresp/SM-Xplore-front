export type EventStatus = 'DRAFT' | 'PUBLISHED' | 'POSTPONED' | 'CANCELLED'

export interface EventResponse {
  id: string
  siteId: string
  siteName: string
  name: string
  category: string
  status: EventStatus
  price: number
  maxCapacity: number
  startsAt: string
  endsAt: string
  description: string | null
  expectedAttendance: number
}

export interface EventRequest {
  siteId: string
  siteName?: string
  name: string
  category: string
  price: number
  maxCapacity: number
  startsAt: string
  endsAt: string
  description?: string
}

export interface ChangeEventStatusRequest {
  status: EventStatus
}

export interface EstimateAttendanceRequest {
  expectedAttendance: number
}

export interface EventSearchFilters {
  name: string
}

/** Orden que entiende `GET /events`. */
export type EventSort = 'name' | 'priceAsc' | 'priceDesc' | 'dateAsc' | 'dateDesc'

/**
 * Filtros de `GET /api/v1/events`. Los eventos no tienen `guideId`: su dueño
 * de registro es la gestora (`managerId`).
 */
export interface EventListFilters {
  search?: string
  status?: EventStatus
  category?: string
  siteId?: string
  managerId?: string
  priceMin?: number
  priceMax?: number
  /** ISO-8601, límite inferior inclusivo sobre `startsAt`. */
  startsAfter?: string
  /** ISO-8601, límite superior inclusivo sobre `startsAt`. */
  startsBefore?: string
  sort?: EventSort
  page?: number
  size?: number
}
