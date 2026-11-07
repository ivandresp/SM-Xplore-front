import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/Button'
import { Chip } from '@/components/Chip'
import { PageHeader } from '@/components/PageHeader/PageHeader'
import { Pagination } from '@/components/Pagination/Pagination'
import { StatusBadge } from '@/components/StatusBadge/StatusBadge'
import {
  RESERVATION_STATUS_LABELS,
  RESERVATION_STATUS_TONES,
} from '@/config/roles'
import { useAuth } from '@/hooks/useAuth'
import { itemLabel, loadCatalogLookup } from '@/services/catalogLookup'
import type { CatalogEntry } from '@/services/catalogLookup'
import { itemOf, reservationsApi } from '@/services/reservationsApi'
import { describeApiError } from '@/utils/errors'
import { formatCurrency } from '@/utils/format'
import type { ReservationStatus, ReservationSummaryResponse } from '@/types'
import styles from './reservations.module.css'

const PAGE_SIZE = 12

const FILTERS: Array<{ label: string; statuses?: ReservationStatus[] }> = [
  { label: 'Todas' },
  { label: 'Confirmadas', statuses: ['CONFIRMED'] },
  { label: 'Canceladas', statuses: ['CANCELLED'] },
  { label: 'No asistió', statuses: ['NO_SHOW'] },
]

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

export default function MyReservationsPage() {
  const { user } = useAuth()

  const [reservations, setReservations] = useState<
    ReservationSummaryResponse[]
  >([])
  const [lookup, setLookup] = useState<Map<string, CatalogEntry>>(new Map())
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filterIndex, setFilterIndex] = useState(0)
  const [page, setPage] = useState(1)

  const touristId = user?.id

  useEffect(() => {
    if (touristId === undefined) {
      return
    }

    let cancelled = false

    async function run() {
      try {
        const [list, catalog] = await Promise.all([
          reservationsApi.listByTourist(touristId as string, 200),
          loadCatalogLookup(),
        ])

        if (!cancelled) {
          setLookup(catalog)
          setReservations(
            [...list].sort(
              (a, b) =>
                new Date(b.bookedAt).getTime() - new Date(a.bookedAt).getTime(),
            ),
          )
          setError(null)
        }
      } catch (cause) {
        if (!cancelled) {
          setReservations([])
          setError(describeApiError(cause))
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
  }, [touristId])

  const filtered = useMemo(() => {
    const statuses = FILTERS[filterIndex]?.statuses

    if (statuses === undefined) {
      return reservations
    }

    return reservations.filter((reservation) =>
      statuses.includes(reservation.status),
    )
  }, [reservations, filterIndex])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const visible = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const hasAny = reservations.length > 0

  return (
    <div className={styles.page}>
      <PageHeader title="Mis reservas" />

      {error !== null && (
        <p className={`${styles.feedback} ${styles.error}`} role="alert">
          {error}
        </p>
      )}

      {hasAny && (
        <div className={styles.filters}>
          {FILTERS.map((filter, index) => (
            <Chip
              key={filter.label}
              selected={filterIndex === index}
              onClick={() => {
                setFilterIndex(index)
                setPage(1)
              }}
            >
              {filter.label}
            </Chip>
          ))}
        </div>
      )}

      {isLoading && <p className={styles.state}>Cargando reservas…</p>}

      {!isLoading && !hasAny && error === null && (
        <div className={styles.empty}>
          <div className={styles.emptyRow}>
            <span className={styles.emptyIcon}>?</span>
            <div className={styles.rowBody}>
              <h2 className={styles.rowTitle}>Caso: aún no tienes reservas</h2>
              <p className={styles.rowMeta}>
                Explora actividades, servicios y eventos para empezar.
              </p>
            </div>
            <Link to="/explorar">
              <Button variant="outline">Explorar</Button>
            </Link>
          </div>
        </div>
      )}

      {!isLoading && hasAny && filtered.length === 0 && (
        <p className={styles.state}>
          No tienes reservas en este estado.{' '}
          <Link to="#" onClick={() => setFilterIndex(0)}>
            Ver todas
          </Link>
        </p>
      )}

      {visible.length > 0 && (
        <div className={styles.list}>
          {visible.map((reservation) => {
            const item = itemOf(reservation)
            const entry = lookup.get(item.itemId)
            const { day, month, time } = dateParts(reservation.bookedFor)
            const type = item.type

            return (
              <article key={reservation.id} className={styles.row}>
                <div className={styles.dateBadge}>
                  <span className={styles.dateDay}>{day}</span>
                  <span className={styles.dateMonth}>{month}</span>
                </div>

                <div className={styles.rowBody}>
                  <h2 className={styles.rowTitle}>
                    {entry?.name ?? 'Ítem reservado'}
                  </h2>
                  <p className={styles.rowMeta}>
                    {itemLabel(type)} · {time} ·{' '}
                    {reservation.numberOfPeople}{' '}
                    {reservation.numberOfPeople === 1
                      ? 'persona'
                      : 'personas'}{' '}
                    · {formatCurrency(reservation.total)}
                  </p>
                </div>

                <div className={styles.rowSide}>
                  <StatusBadge
                    tone={RESERVATION_STATUS_TONES[reservation.status]}
                  >
                    {RESERVATION_STATUS_LABELS[reservation.status]}
                  </StatusBadge>
                  <Link to={`/mis-reservas/${reservation.id}`}>
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
    </div>
  )
}
