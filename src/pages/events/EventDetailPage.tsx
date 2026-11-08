import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { Button } from '@/components/Button'
import { DefList } from '@/components/DefList/DefList'
import type { DefItem } from '@/components/DefList/DefList'
import { PageHeader } from '@/components/PageHeader/PageHeader'
import { Skeleton } from '@/components/Skeleton'
import { StateMessage } from '@/components/StateMessage'
import { StatusBadge } from '@/components/StatusBadge/StatusBadge'
import { EVENT_STATUS_LABELS, EVENT_STATUS_TONES, PAYMENT_METHOD_LABELS } from '@/config/roles'
import { useAuth } from '@/hooks/useAuth'
import { useItinerary } from '@/hooks/useItinerary'
import { useTrackView } from '@/hooks/useTrackView'
import { eventsApi } from '@/services/eventsApi'
import { reservationsApi } from '@/services/reservationsApi'
import { sitesApi } from '@/services/sitesApi'
import { zonesApi } from '@/services/zonesApi'
import { describeApiError } from '@/utils/errors'
import { formatCurrency, formatDate, formatDateTime } from '@/utils/format'
import type {
  EventResponse,
  PaymentMethod,
  ReservationResponse,
  Site,
  Zone,
} from '@/types'
import styles from './events.module.css'

function formatTime(value: string): string {
  return new Intl.DateTimeFormat('es-CO', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value))
}

const PAYMENT_OPTIONS = Object.entries(PAYMENT_METHOD_LABELS).map(
  ([value, label]) => ({ value, label }),
)

export default function EventDetailPage() {
  const { eventId } = useParams<{ eventId: string }>()
  useTrackView('EVENT', eventId)
  const { user, isAuthenticated } = useAuth()
  const { itinerary, addEntry, removeEntry } = useItinerary()
  const navigate = useNavigate()
  const location = useLocation()

  const [event, setEvent] = useState<EventResponse | null>(null)
  const [site, setSite] = useState<Site | null>(null)
  const [zone, setZone] = useState<Zone | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  /** Cambia de valor para forzar una recarga (botón "Reintentar"). */
  const [reloadToken, setReloadToken] = useState(0)

  const [people, setPeople] = useState(2)
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CARD')
  const [isBooking, setIsBooking] = useState(false)
  const [bookingError, setBookingError] = useState<string | null>(null)
  const [confirmation, setConfirmation] = useState<ReservationResponse | null>(
    null,
  )

  useEffect(() => {
    if (eventId === undefined) {
      return
    }

    let cancelled = false

    async function run() {
      try {
        const found = await eventsApi.getById(eventId as string)
        if (cancelled) return

        setEvent(found)
        setError(null)

        // Lugar y zona del evento (si el sitio sigue publicado).
        const [siteResult, zonesResult] = await Promise.allSettled([
          sitesApi.getById(found.siteId),
          zonesApi.list(),
        ])

        if (cancelled) return

        if (siteResult.status === 'fulfilled') {
          setSite(siteResult.value)

          if (zonesResult.status === 'fulfilled') {
            setZone(
              zonesResult.value.find(
                (item) => item.id === siteResult.value.zoneId,
              ) ?? null,
            )
          }
        }
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
  }, [eventId, reloadToken])

  function retry() {
    setIsLoading(true)
    setError(null)
    setReloadToken((current) => current + 1)
  }

  if (isLoading) {
    return (
      <div className={styles.page}>
        <Skeleton variant="text" count={6} label="Cargando evento…" />
      </div>
    )
  }

  if (event === null) {
    return (
      <div className={styles.page}>
        <Link to="/eventos" className={styles.back}>
          ← Volver a eventos
        </Link>
        <StateMessage
          tone="error"
          title="No pudimos cargar el evento"
          description={error ?? 'No se encontró el evento.'}
          action={
            <Button variant="accent" onClick={retry}>
              Reintentar
            </Button>
          }
        />
      </div>
    )
  }

  const total = event.price * people
  const closed = event.status === 'CANCELLED'
  const inItinerary = itinerary.entries.some(
    (entry) => entry.itemId === event!.id,
  )

  const infoItems: DefItem[] = [
    { label: 'Fecha', value: formatDateTime(event.startsAt) },
    { label: 'Finaliza', value: formatDateTime(event.endsAt) },
    { label: 'Categoría', value: event.category },
    ...(site !== null ? [{ label: 'Lugar', value: site.name }] : []),
    ...(zone !== null ? [{ label: 'Zona', value: zone.name }] : []),
    { label: 'Aforo', value: `${event.maxCapacity} personas` },
    {
      label: 'Afluencia esperada',
      value: `${event.expectedAttendance} personas`,
    },
    { label: 'Precio', value: event.price === 0 ? 'Gratis' : formatCurrency(event.price) },
  ]

  function toggleItinerary() {
    if (event === null) {
      return
    }

    if (inItinerary) {
      removeEntry(event.id)
      return
    }

    addEntry({
      itemId: event.id,
      type: 'EVENT',
      name: event.name,
      meta: `Evento · ${formatDate(event.startsAt)}`,
      startsAt: event.startsAt,
      price: event.price,
    })
  }

  async function handleBook() {
    if (!isAuthenticated || user === null) {
      navigate('/login', { state: { from: { pathname: location.pathname } } })
      return
    }

    setIsBooking(true)
    setBookingError(null)

    try {
      const reservation = await reservationsApi.create({
        touristId: user.id,
        itemType: 'EVENT',
        itemId: event!.id,
        numberOfPeople: people,
        paymentMethod,
        bookedFor: event!.startsAt,
      })

      setConfirmation(reservation)
    } catch (cause) {
      setBookingError(describeApiError(cause))
    } finally {
      setIsBooking(false)
    }
  }

  return (
    <div className={styles.page}>
      <Link to="/eventos" className={styles.back}>
        ← Volver a eventos
      </Link>

      <PageHeader
        serif
        breadcrumb={[
          { label: 'Inicio', to: '/explorar' },
          { label: 'Eventos', to: '/eventos' },
          { label: event.name },
        ]}
        title={event.name}
        description={`${event.category} · ${formatDate(event.startsAt)} · ${formatTime(event.startsAt)}`}
        actions={
          <StatusBadge tone={EVENT_STATUS_TONES[event.status]}>
            {EVENT_STATUS_LABELS[event.status]}
          </StatusBadge>
        }
      />

      <div className={styles.detailLayout}>
        <div className={styles.column}>
          <div className={styles.thumb} style={{ width: '100%', aspectRatio: '16 / 9' }}>
            Sin fotos: el backend no almacena imágenes de eventos
          </div>

          <article className={styles.card}>
            <h2 className={styles.cardTitle}>Descripción</h2>
            {event.description !== null && event.description !== '' ? (
              <p className={styles.meta}>{event.description}</p>
            ) : (
              <p className={styles.meta}>Este evento no tiene descripción.</p>
            )}
          </article>

          <article className={styles.card}>
            <h2 className={styles.cardTitle}>Información del evento</h2>
            <DefList items={infoItems} />
          </article>
        </div>

        <div className={styles.column}>
          <article className={styles.booking}>
            {confirmation !== null ? (
              <>
                <p className={`${styles.feedback} ${styles.success}`}>
                  ¡Reserva creada! Estado: {confirmation.status}.
                </p>
                <div className={styles.line}>
                  <span>Personas</span>
                  <span>{confirmation.numberOfPeople}</span>
                </div>
                <div className={styles.totalLine}>
                  <span>Total</span>
                  <span>{formatCurrency(total)}</span>
                </div>
                <Link to="/mis-reservas">
                  <Button variant="outline" block>
                    Ir a mis reservas
                  </Button>
                </Link>
              </>
            ) : (
              <>
                <div>
                  <span className={styles.fieldLabel}>Precio por persona</span>
                  <p className={styles.priceBig}>
                    {event.price === 0 ? 'Gratis' : formatCurrency(event.price)}
                  </p>
                </div>

                <div>
                  <span className={styles.fieldLabel}>Fecha y hora</span>
                  <p className={styles.meta}>
                    {formatDate(event.startsAt)} · {formatTime(event.startsAt)}
                  </p>
                </div>

                <div>
                  <span className={styles.fieldLabel}>Personas</span>
                  <div className={styles.stepper}>
                    <button
                      type="button"
                      className={styles.stepperButton}
                      onClick={() => setPeople((current) => current - 1)}
                      disabled={people <= 1}
                      aria-label="Quitar persona"
                    >
                      −
                    </button>
                    <span className={styles.stepperValue}>{people}</span>
                    <button
                      type="button"
                      className={styles.stepperButton}
                      onClick={() => setPeople((current) => current + 1)}
                      disabled={people >= event.maxCapacity}
                      aria-label="Agregar persona"
                    >
                      +
                    </button>
                  </div>
                </div>

                <label>
                  <span className={styles.fieldLabel}>Método de pago</span>
                  <select
                    className={styles.control}
                    value={paymentMethod}
                    onChange={(changeEvent) =>
                      setPaymentMethod(
                        changeEvent.target.value as PaymentMethod,
                      )
                    }
                  >
                    {PAYMENT_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <div className={styles.lines}>
                  <div className={styles.line}>
                    <span>
                      {people} ×{' '}
                      {event.price === 0 ? 'Gratis' : formatCurrency(event.price)}
                    </span>
                    <span>{formatCurrency(total)}</span>
                  </div>
                  <div className={styles.totalLine}>
                    <span>Total</span>
                    <span>{formatCurrency(total)}</span>
                  </div>
                </div>

                {bookingError !== null && (
                  <p
                    className={`${styles.feedback} ${styles.error}`}
                    role="alert"
                  >
                    {bookingError}
                  </p>
                )}

                <Button
                  variant="accent"
                  size="lg"
                  block
                  disabled={isBooking || closed}
                  onClick={() => void handleBook()}
                >
                  {isBooking
                    ? 'Reservando…'
                    : isAuthenticated
                      ? 'Reservar'
                      : 'Inicia sesión para reservar'}
                </Button>

                <Button variant="outline" block onClick={toggleItinerary}>
                  {inItinerary
                    ? 'Quitar del itinerario'
                    : 'Agregar al itinerario'}
                </Button>
              </>
            )}
          </article>
        </div>
      </div>
    </div>
  )
}
