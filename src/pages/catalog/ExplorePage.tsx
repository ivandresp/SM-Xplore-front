import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ActivityCard } from '@/components/ActivityCard/ActivityCard'
import { Button } from '@/components/Button'
import { FilterBar } from '@/components/FilterBar'
import type { ActiveFilter } from '@/components/FilterBar'
import { PageHeader } from '@/components/PageHeader/PageHeader'
import { Pagination } from '@/components/Pagination/Pagination'
import { SearchInput } from '@/components/SearchInput/SearchInput'
import { Skeleton } from '@/components/Skeleton'
import { StateMessage } from '@/components/StateMessage'
import { MAX_PRICE_OPTIONS } from '@/config/catalog'
import {
  useFilterParam,
  useSearchParamTerm,
  useSearchParamText,
} from '@/hooks/useFilterParam'
import { useDelayedLoading } from '@/hooks/useDelayedLoading'
import { activitiesApi } from '@/services/activitiesApi'
import { sitesApi } from '@/services/sitesApi'
import { zonesApi } from '@/services/zonesApi'
import { describeApiError } from '@/utils/errors'
import { formatCurrency } from '@/utils/format'
import type {
  ActivityResponse,
  ActivitySort,
  PageResponse,
  Site,
  Zone,
} from '@/types'
import styles from './catalog.module.css'

const PAGE_SIZE = 12

/**
 * Una fila de tarjetas en 1280 px. El total real no se conoce hasta que responde
 * el servidor: con 0-4 resultados el esqueleto casi no salta, con 12 se acepta un
 * salto residual en la primera carga (documentado en el PR).
 */
const SKELETON_COUNT = 4

const SORT_OPTIONS: Array<{ value: ActivitySort; label: string }> = [
  { value: 'name', label: 'Nombre (A–Z)' },
  { value: 'priceAsc', label: 'Precio: menor a mayor' },
  { value: 'priceDesc', label: 'Precio: mayor a menor' },
  { value: 'durationAsc', label: 'Duración: menor a mayor' },
  { value: 'dateAsc', label: 'Fecha: próximas primero' },
]

const FILTER_KEYS = [
  'search',
  'categoria',
  'sitio',
  'precioMax',
  'desde',
] as const

function parseSort(value: string): ActivitySort {
  return SORT_OPTIONS.some((option) => option.value === value)
    ? (value as ActivitySort)
    : 'name'
}

/** Fecha local a ISO; el backend filtra sobre `startsAt` en UTC. */
function dateToIsoStart(value: string): string | undefined {
  return value === '' ? undefined : new Date(`${value}T00:00:00`).toISOString()
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('es-CO', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(`${value}T00:00:00`))
}

export default function ExplorePage() {
  const [params, setParams] = useSearchParams()
  const [term, setTerm] = useSearchParamTerm()
  const [category, setCategory] = useSearchParamText('categoria')
  const [siteId, setSiteId] = useFilterParam('sitio')
  const [maxPrice, setMaxPrice] = useFilterParam('precioMax')
  const [fromDate, setFromDate] = useFilterParam('desde')
  const [sortParam, setSortParam] = useFilterParam('orden')

  const page = Math.max(1, Number(params.get('pagina') ?? '1') || 1)
  const sort = parseSort(sortParam)

  const [result, setResult] = useState<PageResponse<ActivityResponse> | null>(
    null,
  )
  const [zones, setZones] = useState<Zone[]>([])
  const [sites, setSites] = useState<Site[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reloadToken, setReloadToken] = useState(0)
  const queryKey = params.toString()
  const isFirstLoad = result === null && error === null
  // El retardo y el minimo visible solo aplican a la primera carga. En recargas
  // la lista anterior se queda en pantalla y no se desmonta.
  const showSkeleton = useDelayedLoading(isLoading && isFirstLoad)
  const holdSkeleton = isFirstLoad && (isLoading || showSkeleton)
  const isBusy = isLoading || showSkeleton

  // Opciones de los desplegables: catálogo pequeño y estable.
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

    activitiesApi
      .list({
        search: current.get('search') ?? undefined,
        category: current.get('categoria') ?? undefined,
        siteId: current.get('sitio') ?? undefined,
        priceMax: Number(current.get('precioMax')) || undefined,
        startsAfter: dateToIsoStart(current.get('desde') ?? ''),
        sort: parseSort(current.get('orden') ?? ''),
        status: 'PUBLISHED',
        page: Math.max(1, Number(current.get('pagina') ?? '1') || 1) - 1,
        size: PAGE_SIZE,
      })
      .then((page) => {
        if (!cancelled) setResult(page)
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
    () =>
      [...sites].sort((a, b) => a.name.localeCompare(b.name, 'es')),
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
  const resultSummary = isBusy
    ? 'Buscando…'
    : `${total} ${total === 1 ? 'resultado' : 'resultados'}`

  return (
    <div className={styles.page}>
      <PageHeader
        serif
        title="Actividades turísticas en Santa Marta"
        actions={
          <>
            <label className="visually-hidden" htmlFor="explorar-sort">
              Ordenar resultados
            </label>
            <select
              id="explorar-sort"
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
            label="Buscar actividades por nombre"
            placeholder="Nombre de la actividad…"
            className={styles.control}
          />
        </label>

        <label className={styles.field}>
          <span className={styles.fieldLabel}>Categoría</span>
          <input
            className={styles.control}
            type="search"
            value={category}
            placeholder="Aventura, cultural…"
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

        <label className={styles.field}>
          <span className={styles.fieldLabel}>Desde</span>
          <input
            className={styles.control}
            type="date"
            value={fromDate}
            onChange={(event) => setFromDate(event.target.value)}
          />
        </label>
      </FilterBar>

      <section className={styles.results} aria-busy={isBusy}>
        {holdSkeleton && (
          <Skeleton
            decorative
            visible={showSkeleton}
            variant="card"
            metaLines={2}
            count={SKELETON_COUNT}
          />
        )}

        {!isLoading && error !== null && !holdSkeleton && (
          <StateMessage
            tone="error"
            title="No pudimos cargar las actividades"
            description={error}
            action={
              <Button variant="accent" onClick={retry}>
                Reintentar
              </Button>
            }
          />
        )}

        {!isLoading && error === null && result !== null && total === 0 && !holdSkeleton && (
          <StateMessage
            title={
              hasActiveFilters
                ? 'No encontramos actividades con esos filtros'
                : 'Todavía no hay actividades publicadas'
            }
            description={
              hasActiveFilters
                ? 'Prueba con otra categoría, atractivo o fecha, o sube el precio máximo.'
                : 'Cuando las gestoras publiquen actividades aparecerán aquí.'
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

        {result !== null && error === null && result.content.length > 0 && !holdSkeleton && (
          <div className={styles.cards}>
            {result.content.map((activity) => (
              <ActivityCard key={activity.id} activity={activity} />
            ))}
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