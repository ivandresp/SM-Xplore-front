import { translate as t } from '@/i18n/language'
import { formatDate, formatDurationLong } from '@/utils/format'
import { useLocalStorage } from './useLocalStorage'
import type { ReservationItemType } from '@/types'

export interface ItineraryEntry {
  /** Id del elemento del viaje (actividad, evento o atractivo). */
  itemId: string
  type: ReservationItemType | 'SITE'
  name: string
  /** Legacy stored presentation; retained for compatibility, never used for current labels. */
  meta?: string
  /** Locale-independent data for rendering the activity duration. */
  durationMinutes?: number
  startsAt: string
  price: number
  /** Responsable de la actividad o evento, cuando está disponible. */
  providerId?: string
  /** Se completa cuando el elemento ya se reservó. */
  reservationId?: string
}

/** Derive the subtitle at render time, including for itineraries saved in another language. */
export function itineraryEntryMeta(entry: ItineraryEntry): string {
  const detail = entry.type === 'ACTIVITY' && entry.durationMinutes !== undefined
    ? formatDurationLong(entry.durationMinutes)
    : formatDate(entry.startsAt)
  return t(entry.type === 'SITE' ? 'Atractivo · {0}' : entry.type === 'ACTIVITY' ? 'Actividad · {0}' : 'Evento · {0}', [detail])
}

export interface Itinerary {
  name: string
  from: string
  to: string
  entries: ItineraryEntry[]
}

export const EMPTY_ITINERARY: Itinerary = {
  name: '',
  from: '',
  to: '',
  entries: [],
}

const STORAGE_KEY = 'sm-xplore:itinerary'

/**
 * Itinerario del turista. El backend no almacena itinerarios, así que el plan
 * se guarda en `localStorage` y solo las reservas viajan al servidor.
 */
export function useItinerary() {
  const [itinerary, setItinerary] = useLocalStorage<Itinerary>(
    STORAGE_KEY,
    EMPTY_ITINERARY,
  )

  function updateTrip(patch: Partial<Pick<Itinerary, 'name' | 'from' | 'to'>>) {
    setItinerary((current) => ({ ...current, ...patch }))
  }

  function addEntry(entry: ItineraryEntry) {
    setItinerary((current) => ({
      ...current,
      entries: [
        ...current.entries.filter((item) => item.itemId !== entry.itemId),
        entry,
      ],
    }))
  }

  function removeEntry(itemId: string) {
    setItinerary((current) => ({
      ...current,
      entries: current.entries.filter((entry) => entry.itemId !== itemId),
    }))
  }

  function patchEntry(itemId: string, patch: Partial<ItineraryEntry>) {
    setItinerary((current) => ({
      ...current,
      entries: current.entries.map((entry) =>
        entry.itemId === itemId ? { ...entry, ...patch } : entry,
      ),
    }))
  }

  return {
    itinerary,
    setItinerary,
    updateTrip,
    addEntry,
    removeEntry,
    patchEntry,
  }
}

/** Solo estos elementos pueden enviarse al endpoint de reservas. */
export function isReservableEntry(entry: ItineraryEntry): entry is ItineraryEntry & { type: ReservationItemType } {
  return entry.type === 'ACTIVITY' || entry.type === 'EVENT'
}
