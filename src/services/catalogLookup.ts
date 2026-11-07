import { activitiesApi } from './activitiesApi'
import { eventsApi } from './eventsApi'
import { servicesApi } from './servicesApi'
import type { ReservationItemType } from '@/types'

export interface CatalogEntry {
  name: string
  type: ReservationItemType
  /** Guía (actividades) o prestadora (servicios) del ítem. */
  providerId?: string
}

/**
 * Índice `itemId → nombre` para resolver los ítems de una reserva.
 * El backend guarda solo `itemId`, así que se cruzan los tres catálogos.
 * Los servicios solo se listan cuando están disponibles.
 */
export async function loadCatalogLookup(): Promise<Map<string, CatalogEntry>> {
  const [activities, services, events] = await Promise.allSettled([
    activitiesApi.list(),
    servicesApi.list({ status: 'PUBLISHED' }),
    eventsApi.list(),
  ])

  const lookup = new Map<string, CatalogEntry>()

  if (activities.status === 'fulfilled') {
    for (const activity of activities.value) {
      lookup.set(activity.id, {
        name: activity.name,
        type: 'ACTIVITY',
        providerId: activity.guideId ?? undefined,
      })
    }
  }

  if (services.status === 'fulfilled') {
    for (const service of services.value) {
      lookup.set(service.id, {
        name: service.name,
        type: 'SERVICE',
        providerId: service.providerId,
      })
    }
  }

  if (events.status === 'fulfilled') {
    for (const event of events.value) {
      lookup.set(event.id, { name: event.name, type: 'EVENT' })
    }
  }

  return lookup
}

/** Primera imagen disponible del ítem (hoy solo los servicios tienen fotos). */
export function itemLabel(type: ReservationItemType): string {
  switch (type) {
    case 'ACTIVITY':
      return 'Actividad'
    case 'SERVICE':
      return 'Servicio'
    default:
      return 'Evento'
  }
}
