import { z } from 'zod'
import { httpClient } from './httpClient'
import { pageSchema, parseResponse } from './validate'
import { MAX_PAGE_SIZE } from '@/types/common'
import type {
  ContentStatus,
  PageResponse,
  Site,
  SiteInput,
  SiteListFilters,
  SiteUpdateInput,
} from '@/types'

/** Contrato de `SiteResponse` (ms-04). */
const siteSchema = z.object({
  siteId: z.string(),
  managerId: z.string().nullable(),
  name: z.string(),
  description: z.string().nullable(),
  categoryId: z.string().nullable(),
  categoryName: z.string().nullable(),
  zoneId: z.string(),
  zoneName: z.string().nullable(),
  zoneStatus: z.string(),
  latitude: z.number(),
  longitude: z.number(),
  photosUrls: z.array(z.string()),
  status: z.string(),
  maxCapacity: z.number(),
  availability: z.unknown(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

const sitePageSchema = pageSchema(siteSchema)

type SiteResponse = z.infer<typeof siteSchema>

/** La vista usa las coordenadas y el `zoneId`; el resto del `SiteResponse` no se duplica. */
function toSite(response: SiteResponse): Site {
  return {
    id: response.siteId,
    zoneId: response.zoneId,
    name: response.name,
    latitude: response.latitude,
    longitude: response.longitude,
    photoUrls: response.photosUrls,
    categoryId: response.categoryId,
    maxCapacity: response.maxCapacity,
    status: response.status as ContentStatus,
  }
}

/** El wire usa `photosUrls`; la vista, `photoUrls`. */
function toBody(input: SiteInput | SiteUpdateInput) {
  const { photoUrls, ...rest } = input
  return { ...rest, photosUrls: photoUrls }
}

/**
 * Sitios (atractivos) turísticos - `/api/v1/sites` (ms-04).
 *
 * Cada sitio pertenece a una zona (`zoneId`). La lectura es pública.
 */
export const sitesApi = {
  /** `GET /api/v1/sites` con `search`, `status`, `categoryId`, `zoneId` y `managerId`. */
  list: async (
    filters: SiteListFilters = {},
  ): Promise<PageResponse<Site>> => {
    const payload = await httpClient.get<unknown>('/sites', {
      query: {
        search: filters.search?.trim(),
        status: filters.status,
        categoryId: filters.categoryId,
        zoneId: filters.zoneId,
        managerId: filters.managerId,
        page: filters.page ?? 0,
        size: filters.size ?? MAX_PAGE_SIZE,
      },
    })
    const page = parseResponse(sitePageSchema, payload, 'GET /sites')
    return { ...page, content: page.content.map(toSite) }
  },

  /** `GET /api/v1/sites/{siteId}` */
  getById: async (siteId: string): Promise<Site> => {
    const payload = await httpClient.get<unknown>(`/sites/${siteId}`)
    return toSite(parseResponse(siteSchema, payload, 'GET /sites/{siteId}'))
  },

  /** `POST /api/v1/sites` - 201. */
  create: async (input: SiteInput): Promise<Site> => {
    const payload = await httpClient.post<unknown>('/sites', toBody(input))
    return toSite(parseResponse(siteSchema, payload, 'POST /sites'))
  },

  /** `PUT /api/v1/sites/{siteId}` - el backend valida el recurso completo. */
  update: async (siteId: string, input: SiteUpdateInput): Promise<Site> => {
    const payload = await httpClient.put<unknown>(`/sites/${siteId}`, toBody(input))
    return toSite(parseResponse(siteSchema, payload, 'PUT /sites/{siteId}'))
  },

  /** `PATCH /api/v1/sites/{siteId}/status` */
  changeStatus: async (siteId: string, status: ContentStatus): Promise<Site> => {
    const payload = await httpClient.patch<unknown>(`/sites/${siteId}/status`, {
      status,
    })
    return toSite(parseResponse(siteSchema, payload, 'PATCH /sites/{siteId}/status'))
  },
}
