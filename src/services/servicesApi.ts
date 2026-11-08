import { z } from 'zod'
import { httpClient } from './httpClient'
import { pageSchema, parseResponse } from './validate'
import { MAX_PAGE_SIZE } from '@/types/common'
import type {
  ContentStatus,
  CreateServiceRequest,
  PageResponse,
  ServiceListFilters,
  ServiceResponse,
  UpdateServiceRequest,
} from '@/types'

/** Respuesta cruda de ms-04 (ver `ServiceResponse` en el backend). */
const serviceSchema = z.object({
  serviceId: z.string(),
  providerId: z.string().nullish(),
  providerName: z.string().nullish(),
  siteId: z.string().nullish(),
  siteName: z.string().nullish(),
  zoneId: z.string().nullish(),
  zoneName: z.string().nullish(),
  categoryId: z.string().nullish(),
  categoryName: z.string().nullish(),
  name: z.string(),
  description: z.string().nullish(),
  type: z.string(),
  latitude: z.number(),
  longitude: z.number(),
  price: z.number(),
  status: z.enum(['DRAFT', 'PUBLISHED', 'INACTIVE']),
  maxCapacity: z.number(),
  photosUrls: z.array(z.string()).nullish(),
  cancellationPolicy: z.string().nullish(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

const servicePageSchema = pageSchema(serviceSchema)

function toService(response: z.infer<typeof serviceSchema>): ServiceResponse {
  return {
    id: response.serviceId,
    providerId: response.providerId ?? '',
    providerName: response.providerName ?? '',
    siteId: response.siteId ?? '',
    siteName: response.siteName ?? '',
    zoneId: response.zoneId ?? '',
    zoneName: response.zoneName ?? '',
    categoryId: response.categoryId ?? '',
    categoryName: response.categoryName ?? '',
    name: response.name,
    description: response.description ?? '',
    type: response.type,
    latitude: response.latitude,
    longitude: response.longitude,
    price: response.price,
    status: response.status,
    maxCapacity: response.maxCapacity,
    photosUrls: response.photosUrls ?? [],
    cancellationPolicy: response.cancellationPolicy ?? '',
    createdAt: response.createdAt,
    updatedAt: response.updatedAt,
  }
}

/** Servicios turísticos ofrecidos por las prestadoras (alojamiento, transporte, alimentación). */
export const servicesApi = {
  /** `GET /api/v1/services` — todos los filtros son opcionales y los aplica el backend. */
  list: async (filters: ServiceListFilters = {}) => {
    const page = await httpClient.get<unknown>('/services', {
      query: {
        categoryId: filters.categoryId,
        zoneId: filters.zoneId,
        siteId: filters.siteId,
        providerId: filters.providerId,
        status: filters.status,
        type: filters.type,
        search: filters.search?.trim(),
        priceMin: filters.priceMin,
        priceMax: filters.priceMax,
        page: filters.page ?? 0,
        size: filters.size ?? MAX_PAGE_SIZE,
      },
    })

    const parsed = parseResponse<PageResponse<z.infer<typeof serviceSchema>>>(
      servicePageSchema,
      page,
      'GET /services',
    )

    return { ...parsed, content: parsed.content.map(toService) }
  },

  /** `GET /api/v1/services/{serviceId}` */
  getById: async (serviceId: string) => {
    const payload = await httpClient.get<unknown>(`/services/${serviceId}`)

    return toService(parseResponse(serviceSchema, payload, 'GET /services/{id}'))
  },

  /** `POST /api/v1/services` — 201, nace en el estado que traiga el cuerpo. */
  create: async (payload: CreateServiceRequest) => {
    const created = await httpClient.post<unknown>('/services', payload)

    return toService(
      parseResponse(serviceSchema, created, 'POST /services'),
    )
  },

  /** `PUT /api/v1/services/{serviceId}` — reemplaza el servicio completo. */
  update: async (serviceId: string, payload: UpdateServiceRequest) => {
    const updated = await httpClient.put<unknown>(
      `/services/${serviceId}`,
      payload,
    )

    return toService(
      parseResponse(serviceSchema, updated, 'PUT /services/{id}'),
    )
  },

  /** `PATCH /api/v1/services/{serviceId}/status` */
  changeStatus: async (serviceId: string, status: ContentStatus) => {
    const updated = await httpClient.patch<unknown>(
      `/services/${serviceId}/status`,
      { status },
    )

    return toService(
      parseResponse(serviceSchema, updated, 'PATCH /services/{id}/status'),
    )
  },
}
