import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Button } from '@/components/Button'
import { FilterBar } from '@/components/FilterBar'
import type { ActiveFilter } from '@/components/FilterBar'
import { PageHeader } from '@/components/PageHeader/PageHeader'
import { Pagination } from '@/components/Pagination/Pagination'
import { SearchInput } from '@/components/SearchInput/SearchInput'
import { SelectField } from '@/components/SelectField'
import { SiteCard } from '@/components/SiteCard/SiteCard'
import { Skeleton } from '@/components/Skeleton'
import { StateMessage } from '@/components/StateMessage'
import { CATALOG_SKELETON_COUNT } from '@/config/catalog'
import { useFilterParam, useSearchParamTerm } from '@/hooks/useFilterParam'
import { useDelayedLoading } from '@/hooks/useDelayedLoading'
import { categoriesApi } from '@/services/categoriesApi'
import { sitesApi } from '@/services/sitesApi'
import { zonesApi } from '@/services/zonesApi'
import { describeApiError } from '@/utils/errors'
import type {
  CategoryResponse,
  PageResponse,
  Site,
  Zone,
} from '@/types'
import styles from './catalog.module.css'

const PAGE_SIZE = 12


const FILTER_KEYS = ['search', 'zona', 'categoria'] as const

/** Catálogo público de atractivos (sitios). */
export default function SiteListPage() {
  const [params, setParams] = useSearchParams()
  const [term, setTerm] = useSearchParamTerm()
  const [zoneId, setZoneId] = useFilterParam('zona')
  const [categoryId, setCategoryId] = useFilterParam('categoria')

  const page = Math.max(1, Number(params.get('pagina') ?? '1') || 1)

  const [result, setResult] = useState<PageResponse<Site> | null>(null)
  const [zones, setZones] = useState<Zone[]>([])
  const [categories, setCategories] = useState<CategoryResponse[]>([])
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

  useEffect(() => {
    let cancelled = false

    Promise.allSettled([
      zonesApi.list(),
      categoriesApi.list('SITE'),
    ]).then(([zonesResult, categoriesResult]) => {
      if (cancelled) return
      if (zonesResult.status === 'fulfilled') setZones(zonesResult.value)
      if (categoriesResult.status === 'fulfilled') {
        setCategories(categoriesResult.value)
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

    sitesApi
      .list({
        search: current.get('search') ?? undefined,
        zoneId: current.get('zona') ?? undefined,
        categoryId: current.get('categoria') ?? undefined,
        status: 'PUBLISHED',
        page: Math.max(1, Number(current.get('pagina') ?? '1') || 1) - 1,
        size: PAGE_SIZE,
      })
      .then((sitePage) => {
        if (!cancelled) setResult(sitePage)
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

  const zoneOptions = useMemo(
    () => [...zones].sort((a, b) => a.name.localeCompare(b.name, 'es')),
    [zones],
  )

  const zoneNameById = useMemo(
    () => new Map(zones.map((zone) => [zone.id, zone.name])),
    [zones],
  )

  const activeFilters: ActiveFilter[] = []
  if (term.trim() !== '') {
    activeFilters.push({ key: 'search', label: 'Buscar', value: term.trim() })
  }
  if (zoneId !== '') {
    activeFilters.push({
      key: 'zona',
      label: 'Zona',
      value: zoneNameById.get(zoneId) ?? 'Seleccionada',
    })
  }
  if (categoryId !== '') {
    activeFilters.push({
      key: 'categoria',
      label: 'Categoría',
      value:
        categories.find((category) => category.id === categoryId)?.name ??
        'Seleccionada',
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
    : `${total} ${total === 1 ? 'atractivo' : 'atractivos'}`

  return (
    <div className={styles.page}>
      <PageHeader serif title="Atractivos turísticos de Santa Marta" />

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
            label="Buscar atractivos por nombre"
            placeholder="Nombre del atractivo…"
            className={styles.control}
          />
        </label>

        <SelectField
          label="Zona"
          className={styles.control}
          placeholder="Todas las zonas"
          value={zoneId}
          disabled={zoneOptions.length === 0}
          onChange={(event) => setZoneId(event.target.value)}
          options={zoneOptions.map((zone) => ({
            value: zone.id,
            label: zone.name,
          }))}
        />

        <SelectField
          label="Categoría"
          className={styles.control}
          placeholder="Todas las categorías"
          value={categoryId}
          disabled={categories.length === 0}
          onChange={(event) => setCategoryId(event.target.value)}
          options={categories.map((category) => ({
            value: category.id,
            label: category.name,
          }))}
        />
      </FilterBar>

      <section className={styles.results} aria-busy={isBusy}>
        {holdSkeleton && (
          <Skeleton
            decorative
            visible={showSkeleton}
            variant="card"
            showPrice={false}
            count={CATALOG_SKELETON_COUNT}
          />
        )}

        {error !== null && !showSkeleton && (isLoading || !holdSkeleton) && (
          <StateMessage
            tone="error"
            title="No pudimos cargar los atractivos"
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
                ? 'No encontramos atractivos con esos filtros'
                : 'Todavía no hay atractivos publicados'
            }
            description={
              hasActiveFilters
                ? 'Prueba con otro nombre, zona o categoría.'
                : 'Cuando las gestoras registren sitios en sus zonas aparecerán aquí.'
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
            {result.content.map((site) => (
              <SiteCard
                key={site.id}
                site={site}
                zoneName={zoneNameById.get(site.zoneId)}
              />
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