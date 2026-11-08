import type { ContentStatus } from './common'

/** Tipos que ofrece el formulario; el backend acepta cualquier texto (máx. 50). */
export type ServiceType = 'TRANSPORT' | 'LODGING' | 'FEEDING'

/**
 * Servicio turístico tal como lo consumen las páginas: el `ServiceResponse` de ms-04
 * con `serviceId` mapeado a `id` y los nulos normalizados a cadena vacía.
 */
export interface ServiceResponse {
  id: string
  providerId: string
  providerName: string
  siteId: string
  siteName: string
  zoneId: string
  zoneName: string
  categoryId: string
  categoryName: string
  name: string
  description: string
  type: string
  latitude: number
  longitude: number
  price: number
  status: ContentStatus
  maxCapacity: number
  photosUrls: string[]
  cancellationPolicy: string
  createdAt: string
  updatedAt: string
}

/** Cuerpo de `POST /api/v1/services`. */
export interface CreateServiceRequest {
  name: string
  description?: string
  type: string
  categoryId: string
  siteId: string
  zoneId: string
  latitude: number
  longitude: number
  price: number
  maxCapacity: number
  photosUrls?: string[]
  cancellationPolicy?: string
  status?: ContentStatus
}

/** Cuerpo de `PUT /api/v1/services/{id}`: igual que el alta, sin `status`. */
export type UpdateServiceRequest = Omit<CreateServiceRequest, 'status'>

/** Filtros de `GET /api/v1/services`: todos son opcionales. */
export interface ServiceListFilters {
  categoryId?: string
  zoneId?: string
  siteId?: string
  providerId?: string
  status?: ContentStatus
  type?: string
  search?: string
  priceMin?: number
  priceMax?: number
  page?: number
  size?: number
}
