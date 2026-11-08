import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/Button'
import { PageHeader } from '@/components/PageHeader/PageHeader'
import { Pagination } from '@/components/Pagination/Pagination'
import { Skeleton } from '@/components/Skeleton'
import { StateMessage } from '@/components/StateMessage'
import { useAuth } from '@/hooks/useAuth'
import { eventsApi } from '@/services/eventsApi'
import { sitesApi } from '@/services/sitesApi'
import { zonesApi } from '@/services/zonesApi'
import { describeApiError } from '@/utils/errors'
import { formatCurrency } from '@/utils/format'
import type { EventResponse, Site, Zone } from '@/types'
import styles from './events.module.css'

const PAGE_SIZE = 6

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

  const [events, setEvents] = useState<EventResponse[]>([])
  const [zones, setZones] = useState<Zone[]>([])
  const [sites, setSites] = useState<Site[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  /** Cambia de valor para forzar una recarga (botón "Reintentar"). */
  const [reloadToken, setReloadToken] = useState(0)

  // Filtros aplicados y su borrador (se confirman con "Filtrar")
  const [term, setTerm] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [category, setCategory] = useState('')
  const [zoneId, setZoneId] = useState('')
  const [draftTerm, setDraftTerm] = useState('')
  const [draftFrom, setDraftFrom] = useState('')
  const [draftTo, setDraftTo] = useState('')
  const [draftCategory, setDraftCategory] = useState('')
  const [draftZoneId, setDraftZoneId] = useState('')

  useEffect(() => {
    let cancelled = false

    async function run() {
      try {
        const [eventsResult, zonesResult, sitesResult] =
          await Promise.allSettled([
            eventsApi.list(),
            zonesApi.list(),
            sitesApi.list(),
          ])

        if (eventsResult.status === 'rejected') {
          throw eventsResult.reason
        }

        if (!cancelled) {
          setEvents(
            eventsResult.value.filter((event) => event.status === 'PUBLISHED'),
          )
          setZones(zonesResult.status === 'fulfilled' ? zonesResult.value : [])
          setSites(sitesResult.status === 'fulfilled' ? sitesResult.value : [])
          setError(null)
        }
      } catch (cause) {
        if (!cancelled) {
          setEvents([])
          setError(describeApiError(cause))
        }
      } finally {
        if (!cancelled) setIsLoading(false)
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

  const categories = useMemo(
    () => [...new Set(events.map((event) => event.category))].sort(),
    [events],
  )

  const zoneOptions = useMemo(
    () => [...zones].sort((a, b) => a.name.localeCompare(b.name, 'es')),
    [zones],
  )

  const zoneSiteIds = useMemo(() => {
    const map = new Map<string, Set<string>>()
    for (const site of sites) {
      const current = map.get(site.zoneId) ?? new Set<string>()
      current.add(site.id)
      map.set(site.zoneId, current)
    }
    return map
  }, [sites])

  const siteNameById = useMemo(() => {
    const map = new Map<string, string>()
    for (const site of sites) {
      map.set(site.id, site.name)
    }
    return map
  }, [sites])

  const filtered = useMemo(() => {
    const needle = term.trim().toLowerCase()

    return events
      .filter((event) => {
        if (needle !== '' && !event.name.toLowerCase().includes(needle)) {
          return false
        }
        if (category !== '' && event.category !== category) {
          return false
        }
        if (zoneId !== '' && !zoneSiteIds.get(zoneId)?.has(event.siteId)) {
          return false
        }
        if (from !== '' && new Date(event.startsAt) < new Date(`${from}T00:00:00`)) {
          return false
        }
        if (to !== '' && new Date(event.startsAt) > new Date(`${to}T23:59:59`)) {
          return false
        }
        return true
      })
      .sort(
        (a, b) =>
          new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
      )
  }, [events, term, category, zoneId, zoneSiteIds, from, to])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const visible = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  function applyFilters() {
    setTerm(draftTerm)
    setFrom(draftFrom)
    setTo(draftTo)
    setCategory(draftCategory)
    setZoneId(draftZoneId)
    setPage(1)
  }

  function clearFilters() {
    setTerm('')
    setFrom('')
    setTo('')
    setCategory('')
    setZoneId('')
    setDraftTerm('')
    setDraftFrom('')
    setDraftTo('')
    setDraftCategory('')
    setDraftZoneId('')
    setPage(1)
  }

  const hasActiveFilters =
    term !== '' || from !== '' || to !== '' || category !== '' || zoneId !== ''

  return (
    <div className={styles.page}>
      <PageHeader
        serif
        title="Eventos en Santa Marta"
        meta={
          error !== null
            ? undefined
            : `${filtered.length} ${filtered.length === 1 ? 'evento' : 'eventos'}`
        }
        actions={
          isAuthenticated && user?.role === 'TOURIST' ? (
            <Link to="/eventos/planificados">
              <Button variant="outline">Mis eventos planificados</Button>
            </Link>
          ) : undefined
        }
      />

      {error !== null && (
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

      <div className={styles.filters}>
        <label className={styles.full}>
          <span className={styles.fieldLabel}>Buscar evento</span>
          <input
            className={styles.control}
            type="search"
            placeholder="Nombre del evento…"
            value={draftTerm}
            onChange={(event) => setDraftTerm(event.target.value)}
          />
        </label>

        <label>
          <span className={styles.fieldLabel}>Zona</span>
          <select
            className={styles.control}
            value={draftZoneId}
            disabled={zoneOptions.length === 0}
            onChange={(event) => setDraftZoneId(event.target.value)}
          >
            <option value="">Todas las zonas</option>
            {zoneOptions.map((zone) => (
              <option key={zone.id} value={zone.id}>
                {zone.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className={styles.fieldLabel}>Desde</span>
          <input
            className={styles.control}
            type="date"
            value={draftFrom}
            onChange={(event) => setDraftFrom(event.target.value)}
          />
        </label>
        <label>
          <span className={styles.fieldLabel}>Hasta</span>
          <input
            className={styles.control}
            type="date"
            value={draftTo}
            onChange={(event) => setDraftTo(event.target.value)}
          />
        </label>
        <label>
          <span className={styles.fieldLabel}>Categoría</span>
          <select
            className={styles.control}
            value={draftCategory}
            onChange={(event) => setDraftCategory(event.target.value)}
          >
            <option value="">Todas</option>
            {categories.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>

        <Button variant="accent" size="lg" onClick={applyFilters}>
          Filtrar
        </Button>
      </div>

      {isLoading && (
        <Skeleton variant="table" count={6} label="Cargando eventos…" />
      )}

      {!isLoading && error === null && filtered.length === 0 && (
        <StateMessage
          title="No hay eventos publicados con estos filtros"
          description="Prueba con otra fecha, categoría o zona."
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
        <div className={styles.list}>
          {visible.map((event) => {
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
                    {event.siteName || siteNameById.get(event.siteId) || 'Lugar por confirmar'} ·
                    aforo {event.maxCapacity}
                  </p>
                </div>

                <div className={styles.side}>
                  <span className={styles.price}>
                    {event.price === 0 ? 'Gratis' : formatCurrency(event.price)}
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

      <Pagination page={page} totalPages={totalPages} onChange={setPage} />

      <p className={styles.notice}>
        Del diseño faltan: la miniatura (los eventos no guardan fotos) y el
        toggle lista/calendario.
      </p>
    </div>
  )
}
