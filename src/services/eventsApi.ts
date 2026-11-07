import { z } from 'zod'
import { httpClient } from './httpClient'
import { parseResponse, pageSchema } from './validate'
import { MAX_PAGE_SIZE } from '@/types/common'
import type {
  ChangeEventStatusRequest,
  EstimateAttendanceRequest,
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

function toEvent(response: z.infer<typeof eventSchema>): EventResponse {
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

async function listPage(path: string, query: Record<string, string | number>) {
  const page = await httpClient.get<unknown>(path, { query })

  const parsed = parseResponse<PageResponse<z.infer<typeof eventSchema>>>(
    eventPageSchema,
    page,
    `GET ${path}`,
  )

  return parsed.content.map(toEvent)
}

export const eventsApi = {
  /** `POST /api/v1/events` — 201, el evento nace en `DRAFT`. */
  create: async (payload: EventRequest) => {
    const created = await httpClient.post<unknown>('/events', payload)

    return toEvent(parseResponse(eventSchema, created, 'POST /events'))
  },

  /** `GET /api/v1/events` — página de eventos. */
  list: () => listPage('/events', { page: 0, size: MAX_PAGE_SIZE }),

  /** `GET /api/v1/events/{eventId}` */
  getById: async (eventId: string) => {
    const payload = await httpClient.get<unknown>(`/events/${eventId}`)

    return toEvent(parseResponse(eventSchema, payload, 'GET /events/{id}'))
  },

  /** `GET /api/v1/events/search` — `name` es obligatorio. */
  search: ({ name }: EventSearchFilters) =>
    listPage('/events/search', { name, page: 0, size: MAX_PAGE_SIZE }),

  /**
   * Eventos de un atractivo. El backend no tiene endpoint por sitio:
   * se filtra en cliente sobre la página de eventos.
   * shortcut: solo alcanza los primeros 100 eventos, filtrar en servidor cuando haya endpoint.
   */
  listBySite: async (siteId: string) => {
    const events = await listPage('/events', { page: 0, size: MAX_PAGE_SIZE })

    return events.filter((event) => event.siteId === siteId)
  },

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
