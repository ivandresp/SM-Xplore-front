import { activitiesApi } from './activitiesApi'
import { eventsApi } from './eventsApi'
import type { ReservationItemType } from '@/types'

export interface CatalogEntry {
  name: string
  type: ReservationItemType
  /** Guía de la actividad. */
  providerId?: string
}

/**
 * Índice `itemId → nombre` para resolver los ítems de una reserva.
 * El backend guarda solo `itemId` y solo se reservan actividades y eventos,
 * así que se cruzan esos dos catálogos.
 */
export async function loadCatalogLookup(): Promise<Map<string, CatalogEntry>> {
  const [activities, events] = await Promise.allSettled([
    activitiesApi.list(),
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

  if (events.status === 'fulfilled') {
    for (const event of events.value) {
      lookup.set(event.id, { name: event.name, type: 'EVENT' })
    }
  }

  return lookup
}

export function itemLabel(type: ReservationItemType): string {
  return type === 'ACTIVITY' ? 'Actividad' : 'Evento'
}
