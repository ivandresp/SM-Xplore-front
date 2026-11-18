import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { ApiErrorAction } from '@/components/ApiErrorAction'
import { useApiErrorState } from '@/hooks/useApiErrorState'
import { BackButton } from '@/components/BackButton'
import { useMessageState } from '@/hooks/useMessageState'
import { getLocale, translate as t } from '@/i18n/language'
import { useLanguage } from '@/hooks/useLanguage'
import { Button } from '@/components/Button'
import { DefList } from '@/components/DefList/DefList'
import type { DefItem } from '@/components/DefList/DefList'
import { MapPreview } from '@/components/MapPreview'
import { PageHeader } from '@/components/PageHeader/PageHeader'
import { SelectField } from '@/components/SelectField'
import { Skeleton } from '@/components/Skeleton'
import { StateMessage } from '@/components/StateMessage'
import { StatusBadge } from '@/components/StatusBadge/StatusBadge'
import { EVENT_STATUS_LABELS, EVENT_STATUS_TONES, PAYMENT_METHOD_LABELS } from '@/config/roles'
import { useAuth } from '@/hooks/useAuth'
import { useItinerary } from '@/hooks/useItinerary'
import { useTrackView } from '@/hooks/useTrackView'
import { eventsApi } from '@/services/eventsApi'
import { isApiError } from '@/services/httpClient'
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
  return new Intl.DateTimeFormat(getLocale(), {
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value))
}

/** Mapa de portada con dimensiones reales, sin estirar los tiles. */
function EventLocationMap({ site }: { site: Site }) {
  const container = useRef<HTMLDivElement>(null)
  const [dimensions, setDimensions] = useState({ width: 256, height: 220 })

  useEffect(() => {
    const element = container.current
    if (element === null) return
    const measure = () => {
      const available = Math.floor(element.getBoundingClientRect().width)
      if (available <= 0) return
      const width = Math.min(1024, available)
      const height = Math.max(220, Math.min(512, Math.round(width * 9 / 16)))
      setDimensions((previous) => previous.width === width && previous.height === height ? previous : { width, height })
    }
    measure()
    if (typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  return (
    <div ref={container} className={styles.eventMap}>
      <MapPreview label={site.name} latitude={site.latitude} longitude={site.longitude} width={dimensions.width} height={dimensions.height} />
    </div>
  )
}

export default function EventDetailPage() {
  useLanguage()
  const paymentOptions = Object.entries(PAYMENT_METHOD_LABELS).map(
    ([value, label]) => ({ value, label }),
  )
  const { eventId } = useParams<{ eventId: string }>()
  useTrackView('EVENT', eventId)
  const { user, isAuthenticated } = useAuth()
  const { itinerary, addEntry, removeEntry } = useItinerary()
  const navigate = useNavigate()
  const location = useLocation()

  const [event, setEvent] = useState<EventResponse | null>(null)
  const [site, setSite] = useState<Site | null>(null)
  const [zone, setZone] = useState<Zone | null>(null)
  /** Por qué no hay ubicación: el sitio ya no existe (404) o falló la consulta. */
  const [siteProblem, setSiteProblem] = useState<
    'missing' | 'unavailable' | null
  >(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError, errorCause, setErrorFromApi] = useApiErrorState()
  /** Cambia de valor para forzar una recarga (botón "Reintentar"). */
  const [reloadToken, setReloadToken] = useState(0)

  const [people, setPeople] = useState(2)
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CARD')
  const [isBooking, setIsBooking] = useState(false)
  const [bookingError, setBookingError] = useMessageState<string | null>(null)
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
          setSiteProblem(null)

          if (zonesResult.status === 'fulfilled') {
            setZone(
              zonesResult.value.find(
                (item) => item.id === siteResult.value.zoneId,
              ) ?? null,
            )
          }
        } else {
          setSite(null)
          setSiteProblem(
            isApiError(siteResult.reason) && siteResult.reason.status === 404
              ? 'missing'
              : 'unavailable',
          )
        }
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
  }, [eventId, reloadToken, setError, setErrorFromApi])

  function retry() {
    setIsLoading(true)
    setError(null)
    setReloadToken((current) => current + 1)
  }

  if (isLoading) {
    return (
      <div className={styles.page}>
        <Skeleton variant="text" count={6} label={t("Cargando evento…")} />
      </div>
    )
  }

  if (event === null) {
    return (
      <div className={styles.page}>
        <BackButton to="/eventos" />
        <StateMessage
          tone="error"
          title={t("No pudimos cargar el evento")}
          description={error ?? t("No se encontró el evento.")}
          action={
            <ApiErrorAction error={errorCause} variant="accent" onRetry={retry} />
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
    { label: t("Fecha"), value: formatDateTime(event.startsAt) },
    { label: t("Finaliza"), value: formatDateTime(event.endsAt) },
    { label: t("Categoría"), value: event.category },
    ...(site !== null ? [{ label: t("Lugar"), value: site.name }] : []),
    ...(zone !== null ? [{ label: t("Zona"), value: zone.name }] : []),
    { label: t("Aforo"), value: t('{0} personas', [event.maxCapacity]) },
    {
      label: t("Afluencia esperada"),
      value: t('{0} personas', [event.expectedAttendance]),
    },
    { label: t("Precio"), value: event.price === 0 ? t('Gratis') : formatCurrency(event.price) },
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
      setBookingError(() => describeApiError(cause))
    } finally {
      setIsBooking(false)
    }
  }

  return (
    <div className={styles.page}>
      <BackButton to="/eventos" />

      <PageHeader
        serif
        breadcrumb={[
          { label: t("Inicio"), to: '/explorar' },
          { label: t("Eventos"), to: '/eventos' },
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

      <div className={`${styles.detailLayout} ${styles.publicDetailLayout}`}>
        <div className={`${styles.column} ${styles.eventDetailColumn}`}>
          <section className={styles.eventMap} aria-label={t("Ubicación")}>
            <h2 className={styles.cardTitle}>{t("Ubicación")}</h2>
            {site === null ? (
              <p className={styles.meta}>
                {siteProblem === 'unavailable'
                  ? t("No pudimos cargar la ubicación del evento. Vuelve a intentarlo en un momento.")
                  : t("Este evento no tiene un lugar publicado asociado.")}
              </p>
            ) : (
              <EventLocationMap site={site} />
            )}
          </section>

          <article className={`${styles.card} ${styles.eventInformation}`}>
            <h2 className={styles.cardTitle}>{t("Descripción")}</h2>
            {event.description !== null && event.description !== '' ? (
              <p className={styles.meta}>{event.description}</p>
            ) : (
              <p className={styles.meta}>{t("Este evento no tiene descripción.")}</p>
            )}
          </article>

          <article className={`${styles.card} ${styles.eventInformation}`}>
            <h2 className={styles.cardTitle}>{t("Información del evento")}</h2>
            <DefList items={infoItems} />
          </article>
        </div>

        <div className={`${styles.column} ${styles.eventDetailColumn}`}>
          <article className={styles.booking}>
            {confirmation !== null ? (
              <>
                <p className={`${styles.feedback} ${styles.success}`}>
                  {t("¡Reserva creada! Estado:")}{" "}{confirmation.status}.
                </p>
                <div className={styles.line}>
                  <span>{t("Personas")}</span>
                  <span>{confirmation.numberOfPeople}</span>
                </div>
                <div className={styles.totalLine}>
                  <span>Total</span>
                  <span>{formatCurrency(total)}</span>
                </div>
                <Link to="/mis-reservas">
                  <Button variant="outline" block>
                    {t("Ir a mis reservas")}</Button>
                </Link>
              </>
            ) : (
              <>
                <div>
                  <span className={styles.fieldLabel}>{t("Precio por persona")}</span>
                  <p className={styles.priceBig}>
                    {event.price === 0 ? t("Gratis") : formatCurrency(event.price)}
                  </p>
                </div>

                <div>
                  <span className={styles.fieldLabel}>{t("Fecha y hora")}</span>
                  <p className={styles.meta}>
                    {formatDate(event.startsAt)} · {formatTime(event.startsAt)}
                  </p>
                </div>

                <div>
                  <span className={styles.fieldLabel}>{t("Personas")}</span>
                  <div className={styles.stepper}>
                    <button
                      type="button"
                      className={styles.stepperButton}
                      onClick={() => setPeople((current) => current - 1)}
                      disabled={people <= 1}
                      aria-label={t("Quitar persona")}
                    >
                      −
                    </button>
                    <span className={styles.stepperValue}>{people}</span>
                    <button
                      type="button"
                      className={styles.stepperButton}
                      onClick={() => setPeople((current) => current + 1)}
                      disabled={people >= event.maxCapacity}
                      aria-label={t("Agregar persona")}
                    >
                      +
                    </button>
                  </div>
                </div>

                <SelectField
                  label={t("Método de pago")}
                  className={styles.control}
                  options={paymentOptions}
                  value={paymentMethod}
                  onChange={(changeEvent) =>
                    setPaymentMethod(changeEvent.target.value as PaymentMethod)
                  }
                />

                <div className={styles.lines}>
                  <div className={styles.line}>
                    <span>
                      {people} ×{' '}
                      {event.price === 0 ? t("Gratis") : formatCurrency(event.price)}
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
                  variant="warm"
                  size="lg"
                  block
                  disabled={isBooking || closed}
                  onClick={() => void handleBook()}
                >
                  {isBooking
                    ? t("Reservando…")
                    : isAuthenticated
                      ? t("Reservar")
                      : t("Inicia sesión para reservar")}
                </Button>

                <Button variant="outline" block onClick={toggleItinerary}>
                  {inItinerary
                    ? t("Quitar del itinerario")
                    : t("Agregar al itinerario")}
                </Button>
              </>
            )}
          </article>
        </div>
      </div>
    </div>
  )
}
