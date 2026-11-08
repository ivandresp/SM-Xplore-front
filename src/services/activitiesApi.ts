import { z } from 'zod'
import { httpClient } from './httpClient'
import { pageSchema, parseResponse } from './validate'
import { MAX_PAGE_SIZE } from '@/types/common'
import type {
  ActivityListFilters,
  ActivityRequest,
  ActivityResponse,
  ActivitySearchFilters,
  AvailabilityRequest,
  ChangeActivityStatusRequest,
  PageResponse,
  SlotsRequest,
  UpdateActivityRequest,
} from '@/types'

/** Contrato de `ActivityResponse` (ms-03). */
const activitySchema = z.object({
  id: z.string(),
  siteId: z.string(),
  guideId: z.string().nullable(),
  name: z.string(),
  category: z.string(),
  status: z.enum(['DRAFT', 'PUBLISHED', 'PAUSED', 'CANCELLED']),
  price: z.number(),
  maxCapacity: z.number(),
  durationMinutes: z.number(),
  startsAt: z.string(),
  endsAt: z.string(),
  description: z.string().nullable(),
})

const activityPageSchema = pageSchema(activitySchema)

/** `GET /api/v1/activities` y sus variantes devuelven la página completa. */
async function fetchPage(
  path: string,
  query: Record<string, string | number | undefined>,
  label: string,
): Promise<PageResponse<ActivityResponse>> {
  const payload = await httpClient.get<unknown>(path, { query })
  return parseResponse(activityPageSchema, payload, label)
}

export const activitiesApi = {
  /** `POST /api/v1/activities` - 201, nace en `DRAFT`. */
  create: (payload: ActivityRequest) =>
    httpClient.post<ActivityResponse>('/activities', payload),

  /**
   * `GET /api/v1/activities` con los filtros resueltos en el backend
   * (`search`, `status`, `category`, `siteId`, `guideId`, precio y fechas).
   */
  list: (filters: ActivityListFilters = {}) =>
    fetchPage(
      '/activities',
      {
        search: filters.search?.trim(),
        status: filters.status,
        category: filters.category,
        siteId: filters.siteId,
        guideId: filters.guideId,
        priceMin: filters.priceMin,
        priceMax: filters.priceMax,
        startsAfter: filters.startsAfter,
        startsBefore: filters.startsBefore,
        page: filters.page ?? 0,
        size: filters.size ?? MAX_PAGE_SIZE,
      },
      'GET /activities',
    ),

  /** `GET /api/v1/activities/{activityId}` */
  getById: (activityId: string) =>
    httpClient.get<ActivityResponse>(`/activities/${activityId}`),

  /** `GET /api/v1/activities/search` - `category` es obligatorio. */
  search: ({ category }: ActivitySearchFilters) =>
    fetchPage(
      '/activities/search',
      { category, page: 0, size: MAX_PAGE_SIZE },
      'GET /activities/search',
    ).then((page) => page.content),

  /** `GET /api/v1/activities/site/{siteId}` */
  listBySite: (siteId: string) =>
    fetchPage(
      `/activities/site/${siteId}`,
      { page: 0, size: MAX_PAGE_SIZE },
      'GET /activities/site/{siteId}',
    ).then((page) => page.content),

  /** `PATCH /api/v1/activities/{activityId}` - nombre, categoría, descripción y precio. */
  update: (activityId: string, payload: UpdateActivityRequest) =>
    httpClient.patch<ActivityResponse>(`/activities/${activityId}`, payload),

  /** `PATCH /api/v1/activities/{activityId}/availability` */
  setAvailability: (activityId: string, payload: AvailabilityRequest) =>
    httpClient.patch<ActivityResponse>(
      `/activities/${activityId}/availability`,
      payload,
    ),

  /** `PATCH /api/v1/activities/{activityId}/slots` */
  setSlots: (activityId: string, payload: SlotsRequest) =>
    httpClient.patch<ActivityResponse>(
      `/activities/${activityId}/slots`,
      payload,
    ),

  /** `POST /api/v1/activities/{activityId}/cancel` */
  cancel: (activityId: string) =>
    httpClient.post<ActivityResponse>(`/activities/${activityId}/cancel`),

  /** `PATCH /api/v1/activities/{activityId}/status` */
  changeStatus: (activityId: string, payload: ChangeActivityStatusRequest) =>
    httpClient.patch<ActivityResponse>(
      `/activities/${activityId}/status`,
      payload,
    ),
}
