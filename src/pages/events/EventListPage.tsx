import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Button } from '@/components/Button'
import { FilterBar } from '@/components/FilterBar'
import type { ActiveFilter } from '@/components/FilterBar'
import { PageHeader } from '@/components/PageHeader/PageHeader'
import { Pagination } from '@/components/Pagination/Pagination'
import { SearchInput } from '@/components/SearchInput/SearchInput'
import { Skeleton } from '@/components/Skeleton'
import { StateMessage } from '@/components/StateMessage'
import { useAuth } from '@/hooks/useAuth'
import {
  useFilterParam,
  useSearchParamTerm,
  useSearchParamText,
} from '@/hooks/useFilterParam'
import { eventsApi } from '@/services/eventsApi'
import { sitesApi } from '@/services/sitesApi'
import { zonesApi } from '@/services/zonesApi'
import { describeApiError } from '@/utils/errors'
import { formatCurrency } from '@/utils/format'
import type {
  EventResponse,
  EventSort,
  PageResponse,
  Site,
  Zone,
} from '@/types'
import styles from './events.module.css'

const PAGE_SIZE = 10

const SORT_OPTIONS: Array<{ value: EventSort; label: string }> = [
  { value: 'dateAsc', label: 'Fecha: próximos primero' },
  { value: 'dateDesc', label: 'Fecha: últimos primero' },
  { value: 'priceAsc', label: 'Precio: menor a mayor' },
  { value: 'priceDesc', label: 'Precio: mayor a menor' },
  { value: 'name', label: 'Nombre (A–Z)' },
]

const MAX_PRICE_OPTIONS = [50000, 100000, 200000, 500000]

const FILTER_KEYS = [
  'search',
  'categoria',
  'sitio',
  'precioMax',
  'desde',
  'hasta',
] as const

function parseSort(value: string): EventSort {
  return SORT_OPTIONS.some((option) => option.value === value)
    ? (value as EventSort)
    : 'dateAsc'
}

function dateToIso(value: string, endOfDay = false): string | undefined {
  return value === ''
    ? undefined
    : new Date(`${value}T${endOfDay ? '23:59:59' : '00:00:00'}`).toISOString()
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('es-CO', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(`${value}T00:00:00`))
}

function dateParts(value: string) {
  const date = new Date(value)
  return {
    day: new Intl.DateTimeFormat('es-CO', { day: 'numeric' }).format(date),
    month: new Intl.DateTimeFormat('es-CO', { month: 'short' })
      .format(date)
      .replace('.', ''),
    time: new Intl.DateTimeFormat('es-CO', {
      hour: 'numeric',
      minute: '2-digit',
    }).format(date),
  }
}

export default function EventListPage() {
  const { user, isAuthenticated } = useAuth()
  const [params, setParams] = useSearchParams()
  const [term, setTerm] = useSearchParamTerm()
  const [category, setCategory] = useSearchParamText('categoria')
  const [siteId, setSiteId] = useFilterParam('sitio')
  const [maxPrice, setMaxPrice] = useFilterParam('precioMax')
  const [fromDate, setFromDate] = useFilterParam('desde')
  const [toDate, setToDate] = useFilterParam('hasta')
  const [sortParam, setSortParam] = useFilterParam('orden')

  const page = Math.max(1, Number(params.get('pagina') ?? '1') || 1)
  const sort = parseSort(sortParam)

  const [result, setResult] = useState<PageResponse<EventResponse> | null>(null)
  const [zones, setZones] = useState<Zone[]>([])
  const [sites, setSites] = useState<Site[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reloadToken, setReloadToken] = useState(0)
  const queryKey = params.toString()

  useEffect(() => {
    let cancelled = false

    Promise.allSettled([
      zonesApi.list(),
      sitesApi.list({ size: 100 }),
    ]).then(([zonesResult, sitesResult]) => {
      if (cancelled) return
      if (zonesResult.status === 'fulfilled') setZones(zonesResult.value)
      if (sitesResult.status === 'fulfilled') {
        setSites(sitesResult.value.content)
      }
    })

    return () => {
      cancelled = true
    }
  }, [reloadToken])

  useEffect(() => {
    let cancelled = false
    const current = new URLSearchParams(queryKey)

    setIsLoading(true)
    setError(null)

    eventsApi
      .list({
        search: current.get('search') ?? undefined,
        category: current.get('categoria') ?? undefined,
        siteId: current.get('sitio') ?? undefined,
        priceMax: Number(current.get('precioMax')) || undefined,
        startsAfter: dateToIso(current.get('desde') ?? ''),
        startsBefore: dateToIso(current.get('hasta') ?? '', true),
        sort: parseSort(current.get('orden') ?? ''),
        status: 'PUBLISHED',
        page: Math.max(1, Number(current.get('pagina') ?? '1') || 1) - 1,
        size: PAGE_SIZE,
      })
      .then((eventPage) => {
        if (!cancelled) setResult(eventPage)
      })
      .catch((cause: unknown) => {
        if (!cancelled) {
          setResult(null)
          setError(describeApiError(cause))
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [queryKey, reloadToken])

  const siteOptions = useMemo(
    () => [...sites].sort((a, b) => a.name.localeCompare(b.name, 'es')),
    [sites],
  )

  const sitesByZone = useMemo(() => {
    const grouped = new Map<string, Site[]>()
    for (const site of siteOptions) {
      const list = grouped.get(site.zoneId) ?? []
      list.push(site)
      grouped.set(site.zoneId, list)
    }
    return grouped
  }, [siteOptions])

  const zoneOptions = useMemo(
    () => [...zones].sort((a, b) => a.name.localeCompare(b.name, 'es')),
    [zones],
  )

  const siteNameById = useMemo(
    () => new Map(sites.map((site) => [site.id, site.name])),
    [sites],
  )

  const activeFilters: ActiveFilter[] = []
  if (term.trim() !== '') {
    activeFilters.push({ key: 'search', label: 'Buscar', value: term.trim() })
  }
  if (category.trim() !== '') {
    activeFilters.push({
      key: 'categoria',
      label: 'Categoría',
      value: category.trim(),
    })
  }
  if (siteId !== '') {
    activeFilters.push({
      key: 'sitio',
      label: 'Atractivo',
      value: siteNameById.get(siteId) ?? 'Seleccionado',
    })
  }
  if (maxPrice !== '') {
    activeFilters.push({
      key: 'precioMax',
      label: 'Precio',
      value: `Hasta ${formatCurrency(Number(maxPrice))}`,
    })
  }
  if (fromDate !== '') {
    activeFilters.push({
      key: 'desde',
      label: 'Desde',
      value: formatDate(fromDate),
    })
  }
  if (toDate !== '') {
    activeFilters.push({ key: 'hasta', label: 'Hasta', value: formatDate(toDate) })
  }

  function removeParam(key: string) {
    setParams(
      (current) => {
        const copy = new URLSearchParams(current)
        copy.delete(key)
        copy.delete('pagina')
        return copy
      },
      { replace: true },
    )
  }

  function clearFilters() {
    setParams(
      (current) => {
        const copy = new URLSearchParams(current)
        for (const key of FILTER_KEYS) copy.delete(key)
        copy.delete('pagina')
        return copy
      },
      { replace: true },
    )
  }

  function goToPage(next: number) {
    setParams((current) => {
      const copy = new URLSearchParams(current)
      if (next <= 1) {
        copy.delete('pagina')
      } else {
        copy.set('pagina', String(next))
      }
      return copy
    })
  }

  function retry() {
    setIsLoading(true)
    setError(null)
    setReloadToken((token) => token + 1)
  }

  const total = result?.total ?? 0
  const hasActiveFilters = activeFilters.length > 0
  const resultSummary = isLoading
    ? 'Buscando…'
    : `${total} ${total === 1 ? 'evento' : 'eventos'}`

  return (
    <div className={styles.page}>
      <PageHeader
        serif
        title="Eventos en Santa Marta"
        actions={
          <>
            <label className="visually-hidden" htmlFor="eventos-sort">
              Ordenar resultados
            </label>
            <select
              id="eventos-sort"
              className={styles.sort}
              value={sort}
              onChange={(event) => setSortParam(event.target.value)}
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  Ordenar: {option.label}
                </option>
              ))}
            </select>
            {isAuthenticated && user?.role === 'TOURIST' ? (
              <Link to="/eventos/planificados">
                <Button variant="outline">Mis eventos planificados</Button>
              </Link>
            ) : null}
          </>
        }
      />

      <FilterBar
        activeFilters={activeFilters}
        onRemoveFilter={removeParam}
        onClearFilters={clearFilters}
        resultSummary={resultSummary}
      >
        <label className={styles.field}>
          <span className={styles.fieldLabel}>Buscar</span>
          <SearchInput
            value={term}
            onChange={setTerm}
            label="Buscar eventos por nombre"
            placeholder="Nombre del evento…"
            className={styles.control}
          />
        </label>

        <label className={styles.field}>
          <span className={styles.fieldLabel}>Categoría</span>
          <input
            className={styles.control}
            type="search"
            value={category}
            placeholder="Música, cultura…"
            onChange={(event) => setCategory(event.target.value)}
          />
        </label>

        <label className={styles.field}>
          <span className={styles.fieldLabel}>Atractivo</span>
          <select
            className={styles.control}
            value={siteId}
            disabled={siteOptions.length === 0}
            onChange={(event) => setSiteId(event.target.value)}
          >
            <option value="">Todos los atractivos</option>
            {zoneOptions.map((zone) => {
              const zoneSites = sitesByZone.get(zone.id)
              if (zoneSites === undefined || zoneSites.length === 0) return null
              return (
                <optgroup key={zone.id} label={zone.name}>
                  {zoneSites.map((site) => (
                    <option key={site.id} value={site.id}>
                      {site.name}
                    </option>
                  ))}
                </optgroup>
              )
            })}
          </select>
        </label>

        <label className={styles.field}>
          <span className={styles.fieldLabel}>Desde</span>
          <input
            className={styles.control}
            type="date"
            value={fromDate}
            onChange={(event) => setFromDate(event.target.value)}
          />
        </label>

        <label className={styles.field}>
          <span className={styles.fieldLabel}>Hasta</span>
          <input
            className={styles.control}
            type="date"
            value={toDate}
            onChange={(event) => setToDate(event.target.value)}
          />
        </label>

        <label className={styles.field}>
          <span className={styles.fieldLabel}>Precio</span>
          <select
            className={styles.control}
            value={maxPrice}
            onChange={(event) => setMaxPrice(event.target.value)}
          >
            <option value="">Cualquier precio</option>
            {MAX_PRICE_OPTIONS.map((value) => (
              <option key={value} value={value}>
                Hasta {formatCurrency(value)}
              </option>
            ))}
          </select>
        </label>
      </FilterBar>

      <section className={styles.results}>
        {isLoading && (
          <Skeleton variant="table" count={5} label="Cargando eventos…" />
        )}

        {!isLoading && error !== null && (
          <StateMessage
            tone="error"
            title="No pudimos cargar los eventos"
            description={error}
            action={
              <Button variant="accent" onClick={retry}>
                Reintentar
              </Button>
            }
          />
        )}

        {!isLoading && error === null && result !== null && total === 0 && (
          <StateMessage
            title={
              hasActiveFilters
                ? 'No hay eventos publicados con esos filtros'
                : 'Todavía no hay eventos publicados'
            }
            description={
              hasActiveFilters
                ? 'Prueba con otra fecha, categoría o atractivo.'
                : 'Cuando las gestoras publiquen eventos aparecerán aquí.'
            }
            action={
              hasActiveFilters ? (
                <Button variant="outline" onClick={clearFilters}>
                  Limpiar filtros
                </Button>
              ) : undefined
            }
          />
        )}

        {!isLoading && result !== null && result.content.length > 0 && (
          <div className={styles.list}>
            {result.content.map((event) => {
              const { day, month, time } = dateParts(event.startsAt)
              return (
                <article key={event.id} className={styles.row}>
                  <div className={styles.dateBadge}>
                    <span className={styles.dateDay}>{day}</span>
                    <span className={styles.dateMonth}>{month}</span>
                  </div>

                  <span className={styles.thumb} aria-hidden="true">
                    Sin foto
                  </span>

                  <div className={styles.body}>
                    <h2 className={styles.title}>{event.name}</h2>
                    <p className={styles.meta}>
                      {event.category} · {time} ·{' '}
                      {event.siteName ||
                        siteNameById.get(event.siteId) ||
                        'Lugar por confirmar'}{' '}
                      · aforo {event.maxCapacity}
                    </p>
                  </div>

                  <div className={styles.side}>
                    <span className={styles.price}>
                      {event.price === 0
                        ? 'Gratis'
                        : formatCurrency(event.price)}
                    </span>
                    <Link to={`/eventos/${event.id}`}>
                      <Button variant="outline" size="sm">
                        Ver detalle
                      </Button>
                    </Link>
                  </div>
                </article>
              )
            })}
          </div>
        )}

        <Pagination
          page={page}
          totalPages={result?.totalPages ?? 0}
          onChange={goToPage}
        />
      </section>
    </div>
  )
}
