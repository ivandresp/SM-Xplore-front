import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/Button'
import { Chip } from '@/components/Chip'
import { PageHeader } from '@/components/PageHeader/PageHeader'
import { Pagination } from '@/components/Pagination/Pagination'
import { ServiceCard } from '@/components/ServiceCard/ServiceCard'
import { Skeleton } from '@/components/Skeleton'
import { StateMessage } from '@/components/StateMessage'
import { serviceTypeLabel } from '@/config/roles'
import { isApiError } from '@/services/httpClient'
import { servicesApi } from '@/services/servicesApi'
import { describeApiError } from '@/utils/errors'
import type { ServiceResponse } from '@/types'
import styles from './catalog.module.css'

const PAGE_SIZE = 12
const PRICE_STEP = 10000

// El backend filtra por `type` como texto libre; estos son los que ofrece la UI.
const SERVICE_TYPES = ['LODGING', 'TRANSPORT', 'FEEDING']

type SortOrder = 'relevance' | 'priceAsc' | 'priceDesc'

/** Catálogo público de servicios (sin mockup en Figma: sigue el patrón de Explorar). */
export default function ServiceListPage() {
  const [services, setServices] = useState<ServiceResponse[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [needsLogin, setNeedsLogin] = useState(false)

  // Filtros aplicados
  const [types, setTypes] = useState<string[]>([])
  const [maxPrice, setMaxPrice] = useState<number | null>(null)

  // Borrador: se confirma con "Aplicar"
  const [draftTypes, setDraftTypes] = useState<string[]>([])
  const [draftMaxPrice, setDraftMaxPrice] = useState<number | null>(null)

  const [sort, setSort] = useState<SortOrder>('relevance')
  const [page, setPage] = useState(1)
  /** Cambia de valor para forzar una recarga (botón "Reintentar"). */
  const [reloadToken, setReloadToken] = useState(0)

  useEffect(() => {
    let cancelled = false

    async function run() {
      try {
        // El catálogo público solo muestra servicios disponibles.
        const found = await servicesApi.list({ status: 'PUBLISHED' })

        if (!cancelled) {
          setServices(found)
          setError(null)
          setNeedsLogin(false)
        }
      } catch (cause) {
        if (!cancelled) {
          setServices([])
          setError(describeApiError(cause))
          setNeedsLogin(isApiError(cause) && cause.status === 401)
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    void run()

    return () => {
      cancelled = true
    }
  }, [reloadToken])

  function retry() {
    setIsLoading(true)
    setError(null)
    setReloadToken((current) => current + 1)
  }

  const priceCeiling = useMemo(
    () =>
      Math.max(PRICE_STEP, ...services.map((service) => service.price)),
    [services],
  )

  const filtered = useMemo(() => {
    const list = services.filter((service) => {
      if (types.length > 0 && !types.includes(service.type)) {
        return false
      }

      if (maxPrice !== null && service.price > maxPrice) {
        return false
      }

      return true
    })

    switch (sort) {
      case 'priceAsc':
        return [...list].sort((a, b) => a.price - b.price)
      case 'priceDesc':
        return [...list].sort((a, b) => b.price - a.price)
      default:
        return list
    }
  }, [services, types, maxPrice, sort])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const visible = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  function toggleDraftType(type: string) {
    setDraftTypes((current) =>
      current.includes(type)
        ? current.filter((item) => item !== type)
        : [...current, type],
    )
  }

  function applyFilters() {
    setTypes(draftTypes)
    setMaxPrice(draftMaxPrice)
    setPage(1)
  }

  function clearFilters() {
    setDraftTypes([])
    setDraftMaxPrice(null)
    setTypes([])
    setMaxPrice(null)
    setPage(1)
  }

  const hasActiveFilters = types.length > 0 || maxPrice !== null

  return (
    <div className={styles.page}>
      <PageHeader
        serif
        title="Servicios turísticos en Santa Marta"
        meta={
          error !== null
            ? undefined
            : `${filtered.length} ${filtered.length === 1 ? 'resultado' : 'resultados'}`
        }
        actions={
          <select
            className={styles.sort}
            value={sort}
            onChange={(event) => {
              setSort(event.target.value as SortOrder)
              setPage(1)
            }}
            aria-label="Ordenar resultados"
          >
            <option value="relevance">Ordenar: por relevancia</option>
            <option value="priceAsc">Ordenar: precio (menor a mayor)</option>
            <option value="priceDesc">Ordenar: precio (mayor a menor)</option>
          </select>
        }
      />

      <div className={styles.layout}>
        <aside className={styles.filters}>
          <h2 className={styles.filtersTitle}>Filtros</h2>

          <div className={styles.field}>
            <span className={styles.fieldLabel}>Tipo de servicio</span>
            <div className={styles.chips}>
              {SERVICE_TYPES.map((type) => (
                <Chip
                  key={type}
                  accent
                  selected={draftTypes.includes(type)}
                  onClick={() => toggleDraftType(type)}
                >
                  {serviceTypeLabel(type)}
                </Chip>
              ))}
            </div>
          </div>

          <label className={styles.field}>
            <span className={styles.fieldLabel}>
              Precio hasta{' '}
              {draftMaxPrice === null
                ? 'cualquiera'
                : `$${draftMaxPrice.toLocaleString('es-CO')}`}
            </span>
            <input
              className={styles.range}
              type="range"
              min={0}
              max={priceCeiling}
              step={PRICE_STEP}
              value={draftMaxPrice ?? priceCeiling}
              onChange={(event) => setDraftMaxPrice(Number(event.target.value))}
            />
          </label>

          <div className={styles.filterActions}>
            <Button variant="accent" onClick={applyFilters}>
              Aplicar
            </Button>
            <Button variant="outline" onClick={clearFilters}>
              Limpiar
            </Button>
          </div>
        </aside>

        <section>
          {isLoading && (
            <Skeleton variant="card" count={6} label="Cargando servicios…" />
          )}

          {!isLoading && error !== null && (
            <StateMessage
              tone="error"
              title="No pudimos cargar los servicios"
              description={error}
              action={
                needsLogin ? (
                  <Link to="/login" className={styles.retryLink}>
                    Iniciar sesión
                  </Link>
                ) : (
                  <Button variant="accent" onClick={retry}>
                    Reintentar
                  </Button>
                )
              }
            />
          )}

          {!isLoading && !error && filtered.length === 0 && (
            <StateMessage
              title={
                hasActiveFilters
                  ? 'No encontramos servicios con esos filtros'
                  : 'Todavía no hay servicios publicados'
              }
              description={
                hasActiveFilters
                  ? 'Prueba con otro tipo de servicio o un precio mayor.'
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

          {visible.length > 0 && (
            <div className={styles.cards}>
              {visible.map((service) => (
                <ServiceCard key={service.id} service={service} />
              ))}
            </div>
          )}

          <Pagination page={page} totalPages={totalPages} onChange={setPage} />
        </section>
      </div>
    </div>
  )
}
