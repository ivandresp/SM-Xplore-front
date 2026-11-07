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
