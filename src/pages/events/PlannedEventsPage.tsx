import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ApiErrorAction } from '@/components/ApiErrorAction'
import { useApiErrorState } from '@/hooks/useApiErrorState'
import { translate as t } from '@/i18n/language'
import { useLanguage } from '@/hooks/useLanguage'
import { Button } from '@/components/Button'
import { PageHeader } from '@/components/PageHeader/PageHeader'
import { Skeleton } from '@/components/Skeleton'
import { StateMessage } from '@/components/StateMessage'
import { StatusBadge } from '@/components/StatusBadge/StatusBadge'
import {
  RESERVATION_STATUS_LABELS,
  RESERVATION_STATUS_TONES,
} from '@/config/roles'
import { useAuth } from '@/hooks/useAuth'
import { eventsApi } from '@/services/eventsApi'
import { reservationsApi } from '@/services/reservationsApi'
import { formatDate } from '@/utils/format'
import type { EventResponse, ReservationSummaryResponse } from '@/types'
import styles from './events.module.css'

interface PlannedEvent {
  reservation: ReservationSummaryResponse
  event: EventResponse | undefined
  eventId: string
}

export default function PlannedEventsPage() {
  useLanguage()
  const { user } = useAuth()

  const [planned, setPlanned] = useState<PlannedEvent[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError, errorCause, setErrorFromApi] = useApiErrorState()
  /** Cambia de valor para forzar una recarga (botón "Reintentar"). */
  const [reloadToken, setReloadToken] = useState(0)

  const touristId = user?.id

  useEffect(() => {
    if (touristId === undefined) {
      return
    }

    let cancelled = false

    async function run() {
      try {
        const [reservations, eventsPage] = await Promise.all([
          reservationsApi.listByTourist(touristId as string, 200),
          eventsApi.list(),
        ])

        if (cancelled) return

        const byId = new Map(eventsPage.content.map((event) => [event.id, event]))
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
        if (!cancelled) setErrorFromApi(cause)
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    void run()

    return () => {
      cancelled = true
    }
  }, [touristId, reloadToken, setError, setErrorFromApi])

  function retry() {
    setIsLoading(true)
    setError(null)
    setReloadToken((current) => current + 1)
  }

  return (
    <div className={styles.page}>
      <PageHeader
        breadcrumb={[
          { label: t("Inicio"), to: '/explorar' },
          { label: t("Eventos"), to: '/eventos' },
          { label: t("Planificados") },
        ]}
        title={t("Mis eventos planificados")}
        description={t("Eventos que ya reservaste, con el estado de la reserva.")}
      />

      {error !== null && (
        <StateMessage
          tone="error"
          title={t("No pudimos cargar tus eventos")}
          description={error}
          action={
            <ApiErrorAction error={errorCause} variant="accent" onRetry={retry} />
          }
        />
      )}

      {isLoading && (
        <Skeleton variant="table" count={4} label={t("Cargando eventos…")} />
      )}

      {!isLoading && planned.length === 0 && error === null && (
        <StateMessage
          title={t("Todavía no tienes eventos reservados")}
          description={t("Cuando reserves un evento aparecerá aquí con el estado de la reserva.")}
          action={
            <Link to="/eventos">
              <Button variant="outline">{t("Explorar la agenda de eventos")}</Button>
            </Link>
          }
        />
      )}

      {planned.length > 0 && (
        <div className={styles.list}>
          {planned.map(({ reservation, event, eventId }) => (
            <article key={reservation.id} className={styles.row}>
              <div className={styles.body}>
                <h2 className={styles.title}>
                  {event?.name ?? t("Evento reservado")}
                </h2>
                <p className={styles.meta}>
                  {formatDate(reservation.bookedFor)} ·{' '}
                  {reservation.numberOfPeople}{' '}
                  {reservation.numberOfPeople === 1 ? t("persona") : t("personas")} ·{' '}
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
                    {t("Ver evento")}</Button>
                </Link>
                <Link to={`/mis-reservas/${reservation.id}`}>
                  <Button variant="outline" size="sm">
                    {t("Ver reserva")}</Button>
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
