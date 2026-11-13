import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Button } from '@/components/Button'
import { FilterBar } from '@/components/FilterBar'
import type { ActiveFilter } from '@/components/FilterBar'
import { PageHeader } from '@/components/PageHeader/PageHeader'
import { Pagination } from '@/components/Pagination/Pagination'
import { SearchInput } from '@/components/SearchInput/SearchInput'
import { SelectField } from '@/components/SelectField'
import { ServiceCard } from '@/components/ServiceCard/ServiceCard'
import { Skeleton } from '@/components/Skeleton'
import { StateMessage } from '@/components/StateMessage'
import { CATALOG_SKELETON_COUNT, MAX_PRICE_OPTIONS } from '@/config/catalog'
import { serviceTypeLabel } from '@/config/roles'
import {
  useFilterParam,
  useSearchParamTerm,
} from '@/hooks/useFilterParam'
import { useDelayedLoading } from '@/hooks/useDelayedLoading'
import { servicesApi } from '@/services/servicesApi'
import { zonesApi } from '@/services/zonesApi'
import { describeApiError } from '@/utils/errors'
import { formatCurrency } from '@/utils/format'
import type { PageResponse, ServiceResponse, Zone } from '@/types'
import styles from './catalog.module.css'

const PAGE_SIZE = 12


// El backend filtra por `type` como texto libre; estos son los que ofrece la UI.
const SERVICE_TYPES = ['LODGING', 'TRANSPORT', 'FEEDING']

const FILTER_KEYS = ['search', 'tipo', 'zona', 'precioMax'] as const

/** Catálogo público de servicios. */
export default function ServiceListPage() {
  const [params, setParams] = useSearchParams()
  const [term, setTerm] = useSearchParamTerm()
  const [type, setType] = useFilterParam('tipo')
  const [zoneId, setZoneId] = useFilterParam('zona')
  const [maxPrice, setMaxPrice] = useFilterParam('precioMax')

  const page = Math.max(1, Number(params.get('pagina') ?? '1') || 1)

  const [result, setResult] = useState<PageResponse<ServiceResponse> | null>(
    null,
  )
  const [zones, setZones] = useState<Zone[]>([])
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

    zonesApi
      .list()
      .then((zoneList) => {
        if (!cancelled) setZones(zoneList)
      })
      .catch(() => {
        if (!cancelled) setZones([])
      })

    return () => {
      cancelled = true
    }
  }, [reloadToken])

  useEffect(() => {
    let cancelled = false
    const current = new URLSearchParams(queryKey)

    setIsLoading(true)

    servicesApi
      .list({
        search: current.get('search') ?? undefined,
        type: current.get('tipo') ?? undefined,
        zoneId: current.get('zona') ?? undefined,
        priceMax: Number(current.get('precioMax')) || undefined,
        status: 'PUBLISHED',
        page: Math.max(1, Number(current.get('pagina') ?? '1') || 1) - 1,
        size: PAGE_SIZE,
      })
      .then((servicePage) => {
        if (!cancelled) setResult(servicePage)
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
  if (type !== '') {
    activeFilters.push({
      key: 'tipo',
      label: 'Tipo',
      value: serviceTypeLabel(type),
    })
  }
  if (zoneId !== '') {
    activeFilters.push({
      key: 'zona',
      label: 'Zona',
      value: zoneNameById.get(zoneId) ?? 'Seleccionada',
    })
  }
  if (maxPrice !== '') {
    activeFilters.push({
      key: 'precioMax',
      label: 'Precio',
      value: `Hasta ${formatCurrency(Number(maxPrice))}`,
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
    : `${total} ${total === 1 ? 'resultado' : 'resultados'}`

  return (
    <div className={styles.page}>
      <PageHeader serif title="Servicios turísticos en Santa Marta" />

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
            label="Buscar servicios por nombre"
            placeholder="Nombre del servicio…"
            className={styles.control}
          />
        </label>

        <SelectField
          label="Tipo de servicio"
          className={styles.control}
          placeholder="Todos los tipos"
          value={type}
          onChange={(event) => setType(event.target.value)}
          options={SERVICE_TYPES.map((serviceType) => ({
            value: serviceType,
            label: serviceTypeLabel(serviceType),
          }))}
        />

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
      </FilterBar>

      <section className={styles.results} aria-busy={isBusy}>
        {holdSkeleton && (
          <Skeleton
            decorative
            visible={showSkeleton}
            variant="card"
            count={CATALOG_SKELETON_COUNT}
          />
        )}

        {error !== null && !showSkeleton && (isLoading || !holdSkeleton) && (
          <StateMessage
            tone="error"
            title="No pudimos cargar los servicios"
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
                ? 'No encontramos servicios con esos filtros'
                : 'Todavía no hay servicios publicados'
            }
            description={
              hasActiveFilters
                ? 'Prueba con otro tipo, zona o un precio mayor.'
                : 'Cuando las prestadoras publiquen sus servicios aparecerán aquí.'
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
            {result.content.map((service) => (
              <ServiceCard key={service.id} service={service} />
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