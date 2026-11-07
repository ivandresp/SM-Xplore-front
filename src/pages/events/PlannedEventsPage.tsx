import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/Button'
import { PageHeader } from '@/components/PageHeader/PageHeader'
import { StatusBadge } from '@/components/StatusBadge/StatusBadge'
import {
  RESERVATION_STATUS_LABELS,
  RESERVATION_STATUS_TONES,
} from '@/config/roles'
import { useAuth } from '@/hooks/useAuth'
import { eventsApi } from '@/services/eventsApi'
import { reservationsApi } from '@/services/reservationsApi'
import { describeApiError } from '@/utils/errors'
import { formatDate } from '@/utils/format'
import type { EventResponse, ReservationSummaryResponse } from '@/types'
import styles from './events.module.css'

interface PlannedEvent {
  reservation: ReservationSummaryResponse
  event: EventResponse | undefined
  eventId: string
}

export default function PlannedEventsPage() {
  const { user } = useAuth()

  const [planned, setPlanned] = useState<PlannedEvent[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const touristId = user?.id

  useEffect(() => {
    if (touristId === undefined) {
      return
    }

    let cancelled = false

    async function run() {
      try {
        const [reservations, events] = await Promise.all([
          reservationsApi.listByTourist(touristId as string, 200),
          eventsApi.list(),
        ])

        if (cancelled) return

        const byId = new Map(events.map((event) => [event.id, event]))
        const list: PlannedEvent[] = []

        // La reserva guarda un solo ítem: se filtra por tipo, no se piden ítems aparte.
        for (const reservation of reservations) {
          if (reservation.itemType !== 'EVENT') continue

          list.push({
            reservation,
            event: byId.get(reservation.itemId),
            eventId: reservation.itemId,
          })
        }

        setPlanned(
          list.sort(
            (a, b) =>
              new Date(b.reservation.bookedFor).getTime() -
              new Date(a.reservation.bookedFor).getTime(),
          ),
        )
        setError(null)
      } catch (cause) {
        if (!cancelled) setError(describeApiError(cause))
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    void run()

    return () => {
      cancelled = true
    }
  }, [touristId])

  return (
    <div className={styles.page}>
      <PageHeader
        breadcrumb={[
          { label: 'Inicio', to: '/explorar' },
          { label: 'Eventos', to: '/eventos' },
          { label: 'Planificados' },
        ]}
        title="Mis eventos planificados"
        description="Eventos que ya reservaste, con el estado de la reserva."
      />

      {error !== null && (
        <p className={`${styles.feedback} ${styles.error}`} role="alert">
          {error}
        </p>
      )}

      {isLoading && <p className={styles.state}>Cargando eventos…</p>}

      {!isLoading && planned.length === 0 && error === null && (
        <p className={styles.state}>
          Todavía no tienes eventos reservados.{' '}
          <Link to="/eventos">Explora la agenda de eventos</Link>.
        </p>
      )}

      {planned.length > 0 && (
        <div className={styles.list}>
          {planned.map(({ reservation, event, eventId }) => (
            <article key={reservation.id} className={styles.row}>
              <div className={styles.body}>
                <h2 className={styles.title}>
                  {event?.name ?? 'Evento reservado'}
                </h2>
                <p className={styles.meta}>
                  {formatDate(reservation.bookedFor)} ·{' '}
                  {reservation.numberOfPeople}{' '}
                  {reservation.numberOfPeople === 1 ? 'persona' : 'personas'} ·{' '}
                  #{reservation.code}
                </p>
              </div>

              <div className={styles.side}>
                <StatusBadge
                  tone={RESERVATION_STATUS_TONES[reservation.status]}
                >
                  {RESERVATION_STATUS_LABELS[reservation.status]}
                </StatusBadge>
                <Link to={`/eventos/${eventId}`}>
                  <Button variant="outline" size="sm">
                    Ver evento
                  </Button>
                </Link>
                <Link to={`/mis-reservas/${reservation.id}`}>
                  <Button variant="outline" size="sm">
                    Ver reserva
                  </Button>
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
