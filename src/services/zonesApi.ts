import { z } from 'zod'
import { httpClient } from './httpClient'
import { pageSchema, parseResponse } from './validate'
import { MAX_PAGE_SIZE } from '@/types/common'
import type { Zone, ZoneInput } from '@/types'

/** Contrato de `ZoneResponse` (ms-04). */
const zoneSchema = z.object({
  zoneId: z.string(),
  managerId: z.string().nullable(),
  name: z.string(),
  type: z.string().nullable(),
  description: z.string().nullable(),
  status: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

type ZoneResponse = z.infer<typeof zoneSchema>

/** La vista solo usa id y nombre; el resto del `ZoneResponse` queda disponible aquí. */
function toZone(response: ZoneResponse): Zone {
  return { id: response.zoneId, name: response.name }
}

/**
 * Zonas turísticas - `/api/v1/zones` (ms-04).
 *
 * La relación con los sitios vive en el sitio (`zoneId`), así que los sitios se
 * consultan con `sitesApi`. Listar requiere sesión.
 */
export const zonesApi = {
  /**
   * `GET /api/v1/zones` - primera página de 100.
   * shortcut: el catálogo agrupa por zona en cliente; una página acotada alcanza
   * mientras no haya más de 100 zonas.
   */
  list: async (): Promise<Zone[]> => {
    const payload = await httpClient.get<unknown>('/zones', {
      query: { page: 0, size: MAX_PAGE_SIZE },
    })
    const page = parseResponse(pageSchema(zoneSchema), payload, 'GET /zones')
    return page.content.map(toZone)
  },

  /** `GET /api/v1/zones/{zoneId}` */
  getById: async (zoneId: string): Promise<Zone> => {
    const payload = await httpClient.get<unknown>(`/zones/${zoneId}`)
    return toZone(parseResponse(zoneSchema, payload, 'GET /zones/{zoneId}'))
  },

  /** `POST /api/v1/zones` - 201. */
  create: async (input: ZoneInput): Promise<Zone> => {
    const payload = await httpClient.post<unknown>('/zones', input)
    return toZone(parseResponse(zoneSchema, payload, 'POST /zones'))
  },

  /** `PATCH /api/v1/zones/{zoneId}` - renombra la zona. */
  update: async (zoneId: string, input: ZoneInput): Promise<Zone> => {
    const payload = await httpClient.patch<unknown>(`/zones/${zoneId}`, input)
    return toZone(parseResponse(zoneSchema, payload, 'PATCH /zones/{zoneId}'))
  },
}
