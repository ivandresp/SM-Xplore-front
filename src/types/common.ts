/**
 * Error RFC 7807 (`ProblemDetail`) que devuelve `ApiExceptionHandler`.
 * `code` es el identificador estable para la UI (`INVALID_CREDENTIALS`, ...)
 * y `errors` solo llega en las validaciones de campos.
 */
export interface ProblemDetail {
  type?: string
  title?: string
  status?: number
  detail?: string
  instance?: string
  code?: string
  errors?: Record<string, string>
  retryAfterSeconds?: number
}

/** Límite de elementos de los endpoints paginados (el backend lo acota a 1-100). */
export type QueryLimit = number

/**
 * Envoltorio de página de ms-03 y ms-04: `{content, page, size, total, totalPages}`.
 * `page` es 0-based y `size` va tope a 100. ms-02 usa paginación por cursor.
 */
export interface PageResponse<T> {
  content: T[]
  page: number
  size: number
  total: number
  totalPages: number
}

/** Tamaño de página máximo que aceptan ms-03 y ms-04. */
export const MAX_PAGE_SIZE = 100

/** Estado de publicación de sitios y servicios (ms-04). */
export type ContentStatus = 'DRAFT' | 'PUBLISHED' | 'INACTIVE'

/** Petición con lista de URLs de fotos (usada por servicios y reportes). */
export interface PhotosRequest {
  photosUrls: string[]
}

/** Ubicación geográfica. */
export interface LocationDto {
  latitude: number
  longitude: number
}

/** Referencia ligera a un usuario (reportes y comentarios). */
export interface UserRefDto {
  id: string
  name: string
}

/** Referencia ligera a una prestadora de servicios. */
export interface ProviderRefDto {
  id: string
  name: string
}

/** Valor admitido en los atributos extra: texto, número, booleano u objeto anidado. */
export type AttributeValue = string | number | boolean | AttributeDto

/** Atributo adicional de un servicio turístico. */
export interface AttributeDto {
  name: string
  value: AttributeValue
}
