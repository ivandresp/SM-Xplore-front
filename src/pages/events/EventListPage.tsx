import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useMessageState } from '@/hooks/useMessageState'
import { getLocale, translate as t } from '@/i18n/language'
import { useLanguage } from '@/hooks/useLanguage'
import { Button } from '@/components/Button'
import { FilterBar } from '@/components/FilterBar'
import type { ActiveFilter } from '@/components/FilterBar'
import { EventCard } from '@/components/EventCard'
import { PageHeader } from '@/components/PageHeader/PageHeader'
import { Pagination } from '@/components/Pagination/Pagination'
import { SearchInput } from '@/components/SearchInput/SearchInput'
import { SelectField } from '@/components/SelectField'
import { Skeleton } from '@/components/Skeleton'
import { StateMessage } from '@/components/StateMessage'
import { CATALOG_SKELETON_COUNT, MAX_PRICE_OPTIONS } from '@/config/catalog'
import { useAuth } from '@/hooks/useAuth'
import {
  useFilterParam,
  useSearchParamTerm,
  useSearchParamText,
} from '@/hooks/useFilterParam'
import { useDelayedLoading } from '@/hooks/useDelayedLoading'
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
  { value: 'dateAsc', get label() { return t("Fecha: próximos primero") } },
  { value: 'dateDesc', get label() { return t("Fecha: últimos primero") } },
  { value: 'priceAsc', get label() { return t("Precio: menor a mayor") } },
  { value: 'priceDesc', get label() { return t("Precio: mayor a menor") } },
  { value: 'name', get label() { return t("Nombre (A–Z)") } },
]

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
  return new Intl.DateTimeFormat(getLocale(), {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(`${value}T00:00:00`))
}

export default function EventListPage() {
  useLanguage()
  const { user, isAuthenticated } = useAuth()
  const [params, setParams] = useSearchParams()
  const [term, setTerm] = useSearchParamTerm()
  const [category, setCategory] = useSearchParamText('categoria')
  const [siteId, setSiteId] = useFilterParam(t("sitio"))
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
  const [error, setError] = useMessageState<string | null>(null)
  const [reloadToken, setReloadToken] = useState(0)
  const queryKey = params.toString()
  const isFirstLoad = result === null
  // El retardo y el minimo visible solo aplican a la primera carga. En recargas
  // la lista anterior se queda en pantalla y no se desmonta.
  const showSkeleton = useDelayedLoading(isLoading && isFirstLoad)
  const holdSkeleton = showSkeleton || (isLoading && isFirstLoad)
  const isBusy = isLoading || showSkeleton

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

    eventsApi
      .list({
        search: current.get('search') ?? undefined,
        category: current.get('categoria') ?? undefined,
        siteId: current.get(t("sitio")) ?? undefined,
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
        if (!cancelled) setError(null)
      })
      .catch((cause: unknown) => {
        if (!cancelled) {
          setResult(null)
          setError(() => describeApiError(cause))
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [queryKey, reloadToken, setError])

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
    activeFilters.push({ key: 'search', label: t("Buscar"), value: term.trim() })
  }
  if (category.trim() !== '') {
    activeFilters.push({
      key: 'categoria',
      label: t("Categoría"),
      value: category.trim(),
    })
  }
  if (siteId !== '') {
    activeFilters.push({
      key: 'sitio',
      label: t("Atractivo"),
      value: siteNameById.get(siteId) ?? t('Seleccionado'),
    })
  }
  if (maxPrice !== '') {
    activeFilters.push({
      key: 'precioMax',
      label: t("Precio"),
      value: t('Hasta {0}', [formatCurrency(Number(maxPrice))]),
    })
  }
  if (fromDate !== '') {
    activeFilters.push({
      key: 'desde',
      label: t("Desde"),
      value: formatDate(fromDate),
    })
  }
  if (toDate !== '') {
    activeFilters.push({ key: 'hasta', label: t("Hasta"), value: formatDate(toDate) })
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
    ? t("Buscando…")
    : error !== null
      ? t("Resultados no disponibles")
      : `${total} ${total === 1 ? 'evento' : 'eventos'}`

  return (
    <div className={styles.page}>
      <PageHeader
        serif
        title={t("Eventos en Santa Marta")}
        actions={
          <>
            <SelectField
              aria-label={t("Ordenar resultados")}
              className={styles.sort}
              options={SORT_OPTIONS.map((option) => ({
                value: option.value,
                label: t("Ordenar: {0}", [option.label]),
              }))}
              value={sort}
              onChange={(event) => setSortParam(event.target.value)}
            />
            {isAuthenticated && user?.role === 'TOURIST' ? (
              <Link to="/eventos/planificados">
                <Button variant="outline">{t("Mis eventos planificados")}</Button>
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
          <span className={styles.fieldLabel}>{t("Buscar")}</span>
          <SearchInput
            value={term}
            onChange={setTerm}
            label={t("Buscar eventos por nombre")}
            placeholder={t("Nombre del evento…")}
            className={styles.control}
          />
        </label>

        <label className={styles.field}>
          <span className={styles.fieldLabel}>{t("Categoría")}</span>
          <input
            className={styles.control}
            type="search"
            value={category}
            placeholder={t("Música, cultura…")}
            onChange={(event) => setCategory(event.target.value)}
          />
        </label>

        <SelectField
          label={t("Atractivo")}
          className={styles.control}
          placeholder={t("Todos los atractivos")}
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

        <label className={styles.field}>
          <span className={styles.fieldLabel}>{t("Desde")}</span>
          <input
            className={styles.control}
            type="date"
            value={fromDate}
            onChange={(event) => setFromDate(event.target.value)}
          />
        </label>

        <label className={styles.field}>
          <span className={styles.fieldLabel}>{t("Hasta")}</span>
          <input
            className={styles.control}
            type="date"
            value={toDate}
            onChange={(event) => setToDate(event.target.value)}
          />
        </label>

        <SelectField
          label={t("Precio")}
          className={styles.control}
          placeholder={t("Cualquier precio")}
          value={maxPrice}
          onChange={(event) => setMaxPrice(event.target.value)}
          options={MAX_PRICE_OPTIONS.map((value) => ({
            value: String(value),
            label: t("Hasta {0}", [formatCurrency(value)]),
          }))}
        />
      </FilterBar>

      <section className={styles.results} aria-busy={isBusy}>
        {holdSkeleton && (
          <Skeleton
            decorative
            visible={showSkeleton}
            variant="row"
            count={CATALOG_SKELETON_COUNT}
          />
        )}

        {error !== null && !showSkeleton && (isLoading || !holdSkeleton) && (
          <StateMessage
            tone="error"
            title={t("No pudimos cargar los eventos")}
            description={error}
            action={
              <Button variant="accent" onClick={retry} disabled={isLoading}>
                {t("Reintentar")}</Button>
            }
          />
        )}

        {!isLoading && error === null && result !== null && total === 0 && !holdSkeleton && (
          <StateMessage
            title={
              hasActiveFilters
                ? t("No hay eventos publicados con esos filtros")
                : t("Todavía no hay eventos publicados")
            }
            description={
              hasActiveFilters
                ? t("Prueba con otra fecha, categoría o atractivo.")
                : t("Cuando las gestoras publiquen eventos aparecerán aquí.")
            }
            action={
              hasActiveFilters ? (
                <Button variant="outline" onClick={clearFilters}>
                  {t("Limpiar filtros")}</Button>
              ) : undefined
            }
          />
        )}

        {result !== null && error === null && result.content.length > 0 && !holdSkeleton && (
          <div className={styles.eventCards}>
            {result.content.map((event) => <EventCard key={event.id} event={event} />)}
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