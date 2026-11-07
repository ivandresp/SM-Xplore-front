import { z } from 'zod'
import { httpClient } from './httpClient'
import { pageSchema, parseResponse } from './validate'
import { MAX_PAGE_SIZE } from '@/types/common'
import type { Site, SiteInput, SiteUpdateInput } from '@/types'

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
  }
}

/**
 * Sitios (atractivos) turísticos - `/api/v1/sites` (ms-04).
 *
 * Cada sitio pertenece a una zona (`zoneId`). Listar requiere sesión.
 */
export const sitesApi = {
  /**
   * `GET /api/v1/sites[?zoneId=]` - primera página de 100.
   * shortcut: misma razón que en `activitiesApi.list`; paginar en servidor si
   * llega a haber más de 100 atractivos.
   */
  list: async (zoneId?: string): Promise<Site[]> => {
    const payload = await httpClient.get<unknown>('/sites', {
      query: { zoneId, page: 0, size: MAX_PAGE_SIZE },
    })
    const page = parseResponse(pageSchema(siteSchema), payload, 'GET /sites')
    return page.content.map(toSite)
  },

  /** `GET /api/v1/sites/{siteId}` */
  getById: async (siteId: string): Promise<Site> => {
    const payload = await httpClient.get<unknown>(`/sites/${siteId}`)
    return toSite(parseResponse(siteSchema, payload, 'GET /sites/{siteId}'))
  },

  /** `POST /api/v1/sites` - 201. */
  create: async (input: SiteInput): Promise<Site> => {
    const payload = await httpClient.post<unknown>('/sites', input)
    return toSite(parseResponse(siteSchema, payload, 'POST /sites'))
  },

  /** `PATCH /api/v1/sites/{siteId}` - parcial. */
  update: async (siteId: string, input: SiteUpdateInput): Promise<Site> => {
    const payload = await httpClient.patch<unknown>(`/sites/${siteId}`, input)
    return toSite(parseResponse(siteSchema, payload, 'PATCH /sites/{siteId}'))
  },
}
