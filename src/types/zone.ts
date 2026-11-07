import type { ContentStatus } from './common'

/** Una zona agrupa varios sitios o atractivos (zona ≠ sitio). */
export interface Zone {
  id: string
  name: string
}/** Un sitio o atractivo turístico, ubicado en una zona. */
export interface Site {
  id: string
  zoneId: string
  name: string
  latitude: number
  longitude: number
  photoUrls: string[]
  categoryId: string | null
  maxCapacity: number
  status: ContentStatus
}

/** Datos que envía el formulario de zona (`POST /zones`). */
export interface ZoneInput {
  name: string
}

/** Datos que envía el formulario de sitio (`POST /sites`). */
export interface SiteInput {
  zoneId: string
  name: string
  categoryId: string
  latitude: number
  longitude: number
  maxCapacity: number
  photoUrls?: string[]
}

/**
 * Edición de un sitio (`PATCH /sites/{id}`): el backend valida el recurso
 * completo, así que se reenvían categoría, zona y capacidad aunque no cambien.
 */
export interface SiteUpdateInput {
  name: string
  categoryId: string
  zoneId: string
  latitude: number
  longitude: number
  maxCapacity: number
  photoUrls?: string[]
}
