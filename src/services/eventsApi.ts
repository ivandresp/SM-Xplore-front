import { z } from 'zod'
import { httpClient } from './httpClient'
import { parseResponse, pageSchema } from './validate'
import { MAX_PAGE_SIZE } from '@/types/common'
import type {
  ChangeEventStatusRequest,
  EstimateAttendanceRequest,
  EventListFilters,
  EventRequest,
  EventResponse,
  EventSearchFilters,
  PageResponse,
} from '@/types'

/** Respuesta cruda de ms-03 (ver `EventResponse` en el backend). */
const eventSchema = z.object({
  id: z.string(),
  siteId: z.string(),
  siteName: z.string().nullish(),
  name: z.string(),
  category: z.string(),
  status: z.enum(['DRAFT', 'PUBLISHED', 'POSTPONED', 'CANCELLED']),
  price: z.number(),
  maxCapacity: z.number(),
  startsAt: z.string(),
  endsAt: z.string(),
  description: z.string().nullish(),
  expectedAttendance: z.number(),
})

const eventPageSchema = pageSchema(eventSchema)

type EventWire = z.infer<typeof eventSchema>

function toEvent(response: EventWire): EventResponse {
  return {
    id: response.id,
    siteId: response.siteId,
    siteName: response.siteName ?? '',
    name: response.name,
    category: response.category,
    status: response.status,
    price: response.price,
    maxCapacity: response.maxCapacity,
    startsAt: response.startsAt,
    endsAt: response.endsAt,
    description: response.description ?? null,
    expectedAttendance: response.expectedAttendance,
  }
}

async function fetchPage(
  path: string,
  query: Record<string, string | number | undefined>,
): Promise<PageResponse<EventResponse>> {
  const payload = await httpClient.get<unknown>(path, { query })
  const parsed = parseResponse<PageResponse<EventWire>>(
    eventPageSchema,
    payload,
    `GET ${path}`,
  )

  return { ...parsed, content: parsed.content.map(toEvent) }
}

export const eventsApi = {
  /** `POST /api/v1/events` — 201, el evento nace en `DRAFT`. */
  create: async (payload: EventRequest) => {
    const created = await httpClient.post<unknown>('/events', payload)

    return toEvent(parseResponse(eventSchema, created, 'POST /events'))
  },

  /**
   * `GET /api/v1/events` con los filtros resueltos en el backend
   * (`search`, `status`, `category`, `siteId`, `managerId`, precio y fechas).
   */
  list: (filters: EventListFilters = {}) =>
    fetchPage('/events', {
      search: filters.search?.trim(),
      status: filters.status,
      category: filters.category,
      siteId: filters.siteId,
      managerId: filters.managerId,
      priceMin: filters.priceMin,
      priceMax: filters.priceMax,
      startsAfter: filters.startsAfter,
      startsBefore: filters.startsBefore,
      page: filters.page ?? 0,
      size: filters.size ?? MAX_PAGE_SIZE,
    }),

  /** `GET /api/v1/events/{eventId}` */
  getById: async (eventId: string) => {
    const payload = await httpClient.get<unknown>(`/events/${eventId}`)

    return toEvent(parseResponse(eventSchema, payload, 'GET /events/{id}'))
  },

  /** `GET /api/v1/events/search` — `name` es obligatorio. */
  search: ({ name }: EventSearchFilters) =>
    fetchPage('/events/search', { name, page: 0, size: MAX_PAGE_SIZE }).then(
      (page) => page.content,
    ),

  /** Eventos de un atractivo, filtrados por el backend. */
  listBySite: (siteId: string) =>
    fetchPage('/events', { siteId, page: 0, size: MAX_PAGE_SIZE }).then(
      (page) => page.content,
    ),

  /** `PATCH /api/v1/events/{eventId}/status` — transiciones validadas en el dominio. */
  changeStatus: async (
    eventId: string,
    payload: ChangeEventStatusRequest,
  ) => {
    const updated = await httpClient.patch<unknown>(
      `/events/${eventId}/status`,
      payload,
    )

    return toEvent(
      parseResponse(eventSchema, updated, 'PATCH /events/{id}/status'),
    )
  },

  /** `PATCH /api/v1/events/{eventId}/attendance` */
  estimateAttendance: async (
    eventId: string,
    payload: EstimateAttendanceRequest,
  ) => {
    const updated = await httpClient.patch<unknown>(
      `/events/${eventId}/attendance`,
      payload,
    )

    return toEvent(
      parseResponse(eventSchema, updated, 'PATCH /events/{id}/attendance'),
    )
  },
}
