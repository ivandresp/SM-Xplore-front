import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ActivityCard } from '@/components/ActivityCard/ActivityCard'
import { Button } from '@/components/Button'
import { FilterBar } from '@/components/FilterBar'
import type { ActiveFilter } from '@/components/FilterBar'
import { PageHeader } from '@/components/PageHeader/PageHeader'
import { Pagination } from '@/components/Pagination/Pagination'
import { SearchInput } from '@/components/SearchInput/SearchInput'
import { SelectField } from '@/components/SelectField'
import { Skeleton } from '@/components/Skeleton'
import { StateMessage } from '@/components/StateMessage'
import { CATALOG_SKELETON_COUNT, MAX_PRICE_OPTIONS } from '@/config/catalog'
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
  const isFirstLoad = result === null
  // El retardo y el minimo visible solo aplican a la primera carga. En recargas
  // la lista anterior se queda en pantalla y no se desmonta.
  const showSkeleton = useDelayedLoading(isLoading && isFirstLoad)
  const holdSkeleton = showSkeleton || (isLoading && isFirstLoad)
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
        if (!cancelled) setError(null)
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
    setReloadToken((token) => token + 1)
  }

  const total = result?.total ?? 0
  const hasActiveFilters = activeFilters.length > 0
  const resultSummary = isBusy
    ? 'Buscando…'
    : error !== null
      ? 'Resultados no disponibles'
      : `${total} ${total === 1 ? 'resultado' : 'resultados'}`

  return (
    <div className={styles.page}>
      <PageHeader
        serif
        title="Actividades turísticas en Santa Marta"
        actions={
          <SelectField
            aria-label="Ordenar resultados"
            className={styles.sort}
            options={SORT_OPTIONS.map((option) => ({
              value: option.value,
              label: `Ordenar: ${option.label}`,
            }))}
            value={sort}
            onChange={(event) => setSortParam(event.target.value)}
          />
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

        <SelectField
          label="Atractivo"
          className={styles.control}
          placeholder="Todos los atractivos"
          value={siteId}
          disabled={siteOptions.length === 0}
          onChange={(event) => setSiteId(event.target.value)}
          groups={zoneOptions
            .map((zone) => ({
              label: zone.name,
              options: (sitesByZone.get(zone.id) ?? []).map((site) => ({
                value: site.id,
                label: site.name,
              })),
            }))
            .filter((group) => group.options.length > 0)}
        />

        <SelectField
          label="Precio"
          className={styles.control}
          placeholder="Cualquier precio"
          value={maxPrice}
          onChange={(event) => setMaxPrice(event.target.value)}
          options={MAX_PRICE_OPTIONS.map((value) => ({
            value: String(value),
            label: `Hasta ${formatCurrency(value)}`,
          }))}
        />

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
            count={CATALOG_SKELETON_COUNT}
          />
        )}

        {error !== null && !showSkeleton && (isLoading || !holdSkeleton) && (
          <StateMessage
            tone="error"
            title="No pudimos cargar las actividades"
            description={error}
            action={
              <Button variant="accent" onClick={retry} disabled={isLoading}>
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

        {!holdSkeleton && (
          <Pagination
            page={page}
            totalPages={result?.totalPages ?? 0}
            onChange={goToPage}
          />
        )}
      </section>
    </div>
  )
}