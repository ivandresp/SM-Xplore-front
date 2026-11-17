import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useMessageState } from '@/hooks/useMessageState'
import { translate as t } from '@/i18n/language'
import { useLanguage } from '@/hooks/useLanguage'
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
import { isSearchReady } from '@/config/search'
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
  useLanguage()
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

    if (!isSearchReady(current.get('search'))) {
      setIsLoading(false)
      setError(null)
      return
    }

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

  const zoneOptions = useMemo(
    () => [...zones].sort((a, b) => a.name.localeCompare(b.name, 'es')),
    [zones],
  )

  const zoneNameById = useMemo(
    () => new Map(zones.map((zone) => [zone.id, zone.name])),
    [zones],
  )

  const appliedSearch = params.get('search')?.trim() ?? ''
  const activeFilters: ActiveFilter[] = []
  if (appliedSearch !== '') {
    activeFilters.push({ key: 'search', label: t("Buscar"), value: appliedSearch })
  }
  if (type !== '') {
    activeFilters.push({
      key: 'tipo',
      label: t("Tipo"),
      value: serviceTypeLabel(type),
    })
  }
  if (zoneId !== '') {
    activeFilters.push({
      key: 'zona',
      label: t("Zona"),
      value: zoneNameById.get(zoneId) ?? t('Seleccionada'),
    })
  }
  if (maxPrice !== '') {
    activeFilters.push({
      key: 'precioMax',
      label: t("Precio"),
      value: t('Hasta {0}', [formatCurrency(Number(maxPrice))]),
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
  const resultSummary = !isSearchReady(term)
    ? t("Escribe al menos 3 caracteres para buscar.")
    : isBusy
    ? t("Buscando…")
    : `${total} ${total === 1 ? t("resultado") : t("resultados")}`

  return (
    <div className={styles.page}>
      <PageHeader serif title={t("Servicios turísticos en Santa Marta")} />

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
            label={t("Buscar servicios por nombre")}
            placeholder={t("Nombre del servicio…")}
            className={styles.control}
          />
        </label>

        <SelectField
          label={t("Tipo de servicio")}
          className={styles.control}
          placeholder={t("Todos los tipos")}
          value={type}
          onChange={(event) => setType(event.target.value)}
          options={SERVICE_TYPES.map((serviceType) => ({
            value: serviceType,
            label: serviceTypeLabel(serviceType),
          }))}
        />

        <SelectField
          label={t("Zona")}
          className={styles.control}
          placeholder={t("Todas las zonas")}
          value={zoneId}
          disabled={zoneOptions.length === 0}
          onChange={(event) => setZoneId(event.target.value)}
          options={zoneOptions.map((zone) => ({
            value: zone.id,
            label: zone.name,
          }))}
        />

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
            variant="card"
            count={CATALOG_SKELETON_COUNT}
          />
        )}

        {error !== null && !showSkeleton && (isLoading || !holdSkeleton) && (
          <StateMessage
            tone="error"
            title={t("No pudimos cargar los servicios")}
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
                ? t("No encontramos servicios con esos filtros")
                : t("Todavía no hay servicios publicados")
            }
            description={
              hasActiveFilters
                ? t("Prueba con otro tipo, zona o un precio mayor.")
                : t("Cuando las prestadoras publiquen sus servicios aparecerán aquí.")
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