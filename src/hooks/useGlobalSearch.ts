import { useEffect, useRef, useState } from 'react'
import { serviceTypeLabel } from '@/config/roles'
import { activitiesApi } from '@/services/activitiesApi'
import { eventsApi } from '@/services/eventsApi'
import { servicesApi } from '@/services/servicesApi'
import { sitesApi } from '@/services/sitesApi'
import { describeApiError } from '@/utils/errors'
import { formatCurrency } from '@/utils/format'
import type {
  ActivityResponse,
  EventResponse,
  ServiceResponse,
  Site,
} from '@/types'

/** Grupos del panel de búsqueda. */
export type GlobalSearchGroup = 'activities' | 'events' | 'sites' | 'services'

export interface GlobalSearchItem {
  id: string
  name: string
  /** Texto corto bajo el nombre: zona, sitio, categoría o precio. */
  subtitle: string
  /** Ficha a la que navega el resultado. */
  to: string
}

export type GlobalSearchResults = Record<GlobalSearchGroup, GlobalSearchItem[]>

export const MIN_SEARCH_LENGTH = 2
export const MAX_GROUP_RESULTS = 5

const DEBOUNCE_MS = 300

const EMPTY_RESULTS: GlobalSearchResults = {
  activities: [],
  events: [],
  sites: [],
  services: [],
}

/** Minúsculas y sin tildes: «Bahía» y «bahia» deben coincidir. */
export function normalizeSearchTerm(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
}

/** Filtra por nombre comparando en minúsculas y sin tildes. */
export function filterByName<T extends { name: string }>(
  items: T[],
  needle: string,
): T[] {
  return items.filter((item) =>
    normalizeSearchTerm(item.name).includes(needle),
  )
}

function settledItems<T>(
  result: PromiseSettledResult<T[]>,
  group: GlobalSearchGroup,
  failed: GlobalSearchGroup[],
): T[] {
  if (result.status === 'fulfilled') {
    return result.value
  }

  failed.push(group)
  return []
}

function toActivityItem(activity: ActivityResponse): GlobalSearchItem {
  return {
    id: activity.id,
    name: activity.name,
    subtitle: `${activity.category} · ${formatCurrency(activity.price)}`,
    to: `/actividades/${activity.id}`,
  }
}

function toEventItem(event: EventResponse): GlobalSearchItem {
  return {
    id: event.id,
    name: event.name,
    subtitle: [event.siteName, formatCurrency(event.price)]
      .filter(Boolean)
      .join(' · '),
    to: `/eventos/${event.id}`,
  }
}

function toSiteItem(site: Site): GlobalSearchItem {
  return {
    id: site.id,
    name: site.name,
    subtitle:
      site.maxCapacity > 0
        ? `Hasta ${site.maxCapacity} visitantes`
        : 'Atractivo turístico',
    to: `/atractivos/${site.id}`,
  }
}

function toServiceItem(service: ServiceResponse): GlobalSearchItem {
  return {
    id: service.id,
    name: service.name,
    subtitle: `${serviceTypeLabel(service.type)} · ${formatCurrency(service.price)}`,
    to: `/servicios/${service.id}`,
  }
}

interface SearchOutcome {
  results: GlobalSearchResults
  failed: GlobalSearchGroup[]
  error: string | null
}

async function searchEverything(
  needle: string,
  raw: string,
): Promise<SearchOutcome> {
  // Eventos y servicios sí buscan en el servidor; actividades y atractivos no.
  const settled = await Promise.allSettled([
    activitiesApi.list(),
    eventsApi.search({ name: raw }),
    sitesApi.list(),
    servicesApi.list({ search: raw }),
  ])

  const [activities, events, sites, services] = settled
  const failed: GlobalSearchGroup[] = []

  // shortcut: filtra en cliente sobre la primera pagina de 100, paginar o buscar en servidor cuando el catalogo crezca
  const activityItems = filterByName(
    settledItems(activities, 'activities', failed).filter(
      (activity) => activity.status === 'PUBLISHED',
    ),
    needle,
  )
  const siteItems = filterByName(
    settledItems(sites, 'sites', failed).filter(
      (site) => site.status === 'PUBLISHED',
    ),
    needle,
  )
  const eventItems = settledItems(events, 'events', failed).filter(
    (event) => event.status === 'PUBLISHED',
  )
  const serviceItems = settledItems(services, 'services', failed).filter(
    (service) => service.status === 'PUBLISHED',
  )

  const firstFailure = settled.find(
    (result): result is PromiseRejectedResult => result.status === 'rejected',
  )

  return {
    results: {
      activities: activityItems.slice(0, MAX_GROUP_RESULTS).map(toActivityItem),
      events: eventItems.slice(0, MAX_GROUP_RESULTS).map(toEventItem),
      sites: siteItems.slice(0, MAX_GROUP_RESULTS).map(toSiteItem),
      services: serviceItems.slice(0, MAX_GROUP_RESULTS).map(toServiceItem),
    },
    failed,
    error:
      failed.length === settled.length && firstFailure !== undefined
        ? describeApiError(firstFailure.reason)
        : null,
  }
}

export interface UseGlobalSearchResult {
  term: string
  setTerm: (value: string) => void
  isLoading: boolean
  results: GlobalSearchResults
  /** Solo se llena si fallaron los cuatro servicios a la vez. */
  error: string | null
  /** Grupos que fallaron; el resto de resultados se muestra igual. */
  failed: GlobalSearchGroup[]
  retry: () => void
  clear: () => void
}

/**
 * Búsqueda global del catálogo: debounce, consultas en paralelo y descarte de
 * respuestas que llegan tarde.
 */
export function useGlobalSearch(): UseGlobalSearchResult {
  const [term, setTerm] = useState('')
  const [state, setState] = useState<(SearchOutcome & { term: string }) | null>(
    null,
  )
  /** Cambia con «Reintentar» para repetir la consulta del mismo término. */
  const [attempt, setAttempt] = useState(0)
  /** Identifica la última consulta lanzada. */
  const requestRef = useRef(0)

  const needle = normalizeSearchTerm(term)
  const isActive = needle.length >= MIN_SEARCH_LENGTH
  // El estado guarda el término al que pertenece: un resultado viejo no se
  // muestra bajo un término nuevo, y la carga se deriva sin tocar estado.
  const current = isActive && state?.term === needle ? state : null
  const isLoading = isActive && current === null

  useEffect(() => {
    const query = normalizeSearchTerm(term)

    if (query.length < MIN_SEARCH_LENGTH) {
      return
    }

    const requestId = ++requestRef.current
    let cancelled = false

    const timer = window.setTimeout(() => {
      void searchEverything(query, term.trim()).then((outcome) => {
        // Una respuesta vieja no debe pisar a la consulta más reciente.
        if (cancelled || requestRef.current !== requestId) {
          return
        }

        setState({ term: query, ...outcome })
      })
    }, DEBOUNCE_MS)

    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [term, attempt])

  return {
    term,
    setTerm,
    isLoading,
    results: current?.results ?? EMPTY_RESULTS,
    error: current?.error ?? null,
    failed: current?.failed ?? [],
    retry: () => {
      setState(null)
      setAttempt((currentAttempt) => currentAttempt + 1)
    },
    clear: () => setTerm(''),
  }
}
