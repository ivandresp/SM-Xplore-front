import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { useMessageState } from '@/hooks/useMessageState'
import { getLocale, translate as t } from '@/i18n/language'
import { useLanguage } from '@/hooks/useLanguage'
import { Button } from '@/components/Button'
import { MapPreview } from '@/components/MapPreview'
import { PageHeader } from '@/components/PageHeader/PageHeader'
import { SelectField } from '@/components/SelectField'
import { Skeleton } from '@/components/Skeleton'
import { StateMessage } from '@/components/StateMessage'
import { StatusBadge } from '@/components/StatusBadge/StatusBadge'
import { ACTIVITY_STATUS_LABELS, PAYMENT_METHOD_LABELS } from '@/config/roles'
import { useAuth } from '@/hooks/useAuth'
import { useItinerary } from '@/hooks/useItinerary'
import { useTrackView } from '@/hooks/useTrackView'
import { activitiesApi } from '@/services/activitiesApi'
import { describeApiError } from '@/utils/errors'
import { isApiError } from '@/services/httpClient'
import { reservationsApi } from '@/services/reservationsApi'
import { sitesApi } from '@/services/sitesApi'
import { zonesApi } from '@/services/zonesApi'
import {
  formatCurrency,
  formatDate,
  formatDurationLong,
} from '@/utils/format'
import type {
  ActivityResponse,
  PaymentMethod,
  ReservationResponse,
  Site,
  Zone,
} from '@/types'
import styles from './catalog.module.css'

/** Hora local legible de una fecha ISO (p. ej. "8:00 a. m."). */
function formatTime(value: string): string {
  return new Intl.DateTimeFormat(getLocale(), {
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value))
}

export default function ActivityDetailPage() {
  useLanguage()
  const paymentOptions = Object.entries(PAYMENT_METHOD_LABELS).map(
    ([value, label]) => ({ value, label }),
  )
  const { activityId } = useParams<{ activityId: string }>()
  useTrackView('ACTIVITY', activityId)
  const { user, isAuthenticated } = useAuth()
  const { itinerary, addEntry, removeEntry } = useItinerary()
  const navigate = useNavigate()
  const location = useLocation()

  const [activity, setActivity] = useState<ActivityResponse | null>(null)
  const [site, setSite] = useState<Site | null>(null)
  const [zone, setZone] = useState<Zone | null>(null)
  /** Por qué no hay ubicación: el sitio ya no existe (404) o falló la consulta. */
  const [siteProblem, setSiteProblem] = useState<
    'missing' | 'unavailable' | null
  >(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useMessageState<string | null>(null)
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
    if (activityId === undefined) {
      return
    }

    let cancelled = false

    async function load() {
      setIsLoading(true)
      setError(null)

      try {
        const found = await activitiesApi.getById(activityId as string)
        if (!cancelled) {
          setActivity(found)
        }

        // Ubicación: sitio (atractivo) y su zona, si siguen publicados.
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
        if (!cancelled) {
          setError(() => describeApiError(cause))
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [activityId, reloadToken, setError])

  function retry() {
    setIsLoading(true)
    setError(null)
    setReloadToken((current) => current + 1)
  }

  if (isLoading) {
    return (
      <div className={styles.page}>
        <Skeleton variant="text" count={6} label={t("Cargando actividad…")} />
      </div>
    )
  }

  if (activity === null) {
    return (
      <div className={styles.page}>
        <Link to="/explorar" className={styles.state}>
          {t("← Volver al catálogo")}</Link>
        <StateMessage
          tone="error"
          title={t("No pudimos cargar la actividad")}
          description={error ?? t("No se encontró la actividad.")}
          action={
            <Button variant="accent" onClick={retry}>
              {t("Reintentar")}</Button>
          }
        />
      </div>
    )
  }

  const total = activity.price * people
  const isFull = activity.status === 'PAUSED' || activity.status === 'CANCELLED'
  const inItinerary = itinerary.entries.some(
    (entry) => entry.itemId === activity!.id,
  )

  function toggleItinerary() {
    if (activity === null) {
      return
    }

    if (inItinerary) {
      removeEntry(activity.id)
      return
    }

    addEntry({
      itemId: activity.id,
      type: 'ACTIVITY',
      name: activity.name,
      durationMinutes: activity.durationMinutes,
      startsAt: activity.startsAt,
      price: activity.price,
      providerId: activity.guideId ?? undefined,
    })
  }

  async function handleBook() {
    if (!isAuthenticated || user === null) {
      navigate('/login', {
        state: { from: { pathname: location.pathname } },
      })
      return
    }

    setIsBooking(true)
    setBookingError(null)

    try {
      const reservation = await reservationsApi.create({
        touristId: user.id,
        itemType: 'ACTIVITY',
        itemId: activity!.id,
        numberOfPeople: people,
        paymentMethod,
        bookedFor: activity!.startsAt,
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
      <PageHeader
        serif
        breadcrumb={[
          { label: t("Inicio"), to: '/explorar' },
          { label: t("Actividades"), to: '/actividades' },
          { label: activity.name },
        ]}
        title={activity.name}
        actions={
          <StatusBadge
            tone={activity.status === 'PUBLISHED' ? 'success' : 'neutral'}
          >
            {ACTIVITY_STATUS_LABELS[activity.status]}
          </StatusBadge>
        }
      />

      <div className={styles.detailLayout}>
        <div className={styles.column}>
          <div className={styles.hero}>{t("Sin fotos disponibles")}</div>

          <section className={styles.activityDescription}>
            <h2 className={styles.sectionTitle}>{t("Descripción")}</h2>
            {activity.description !== null && activity.description !== '' ? (
              <p className={styles.paragraph}>{activity.description}</p>
            ) : (
              <p className={styles.paragraphMuted}>
                {t("Esta actividad no tiene descripción registrada.")}</p>
            )}
          </section>

          <div className={`${styles.tiles} ${styles.activityProperties}`}>
            <div className={styles.tile}>
              <span className={styles.tileLabel}>{t("Duración")}</span>
              <span className={styles.tileValue}>
                {formatDurationLong(activity.durationMinutes)}
              </span>
            </div>
            <div className={styles.tile}>
              <span className={styles.tileLabel}>{t("Capacidad")}</span>
              <span className={styles.tileValue}>
                {activity.maxCapacity} {" "}{t("personas")}</span>
            </div>
            <div className={styles.tile}>
              <span className={styles.tileLabel}>{t("Categoría")}</span>
              <span className={styles.tileValue}>{activity.category}</span>
            </div>
            <div className={styles.tile}>
              <span className={styles.tileLabel}>{t("Fecha")}</span>
              <span className={styles.tileValue}>
                {formatDate(activity.startsAt)}
              </span>
            </div>
          </div>

          <section>
            <h2 className={styles.sectionTitle}>
              {t("Ubicación y punto de encuentro")}</h2>
            {site !== null ? (
              <>
                <p className={styles.paragraph}>
                  <strong>{site.name}</strong>
                  {zone !== null ? ` · ${zone.name}` : ''}
                </p>
                <MapPreview
                  label={site.name}
                  latitude={site.latitude}
                  longitude={site.longitude}
                />
              </>
            ) : (
              <p className={styles.paragraphMuted}>
                {siteProblem === 'unavailable'
                  ? t("No pudimos cargar la ubicación del atractivo. Vuelve a intentarlo en un momento.")
                  : t("Esta actividad no tiene un atractivo publicado asociado.")}
              </p>
            )}
          </section>
        </div>

        <div className={styles.column}>
          <article className={styles.booking}>
            {confirmation !== null ? (
              <>
                <p className={styles.feedback + ' ' + styles.success}>
                  {t("¡Reserva creada! Estado:")}{" "}{confirmation.status}.
                </p>
                <div className={styles.line}>
                  <span>{t("Reserva")}</span>
                  <span>{confirmation.code}</span>
                </div>
                <div className={styles.line}>
                  <span>{t("Personas")}</span>
                  <span>{confirmation.numberOfPeople}</span>
                </div>
                <div className={styles.totalRow}>
                  <span className={styles.totalTag}>Total</span>
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
                  <p className={styles.bookingLabel}>{t("Desde")}</p>
                  <div className={styles.priceRow}>
                    <span className={styles.priceBig}>
                      {formatCurrency(activity.price)}
                    </span>
                    <span className={styles.priceUnit}>{t("COP / persona")}</span>
                  </div>
                </div>

                <label className={styles.field}>
                  <span className={styles.fieldLabel}>{t("Fecha")}</span>
                  <input
                    className={styles.control}
                    type="date"
                    value={activity.startsAt.slice(0, 10)}
                    readOnly
                  />
                </label>

                <label className={styles.field}>
                  <span className={styles.fieldLabel}>{t("Hora")}</span>
                  <input
                    className={styles.control}
                    type="text"
                    value={formatTime(activity.startsAt)}
                    readOnly
                  />
                </label>

                <div className={styles.field}>
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
                      disabled={people >= activity.maxCapacity}
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
                  onChange={(event) =>
                    setPaymentMethod(event.target.value as PaymentMethod)
                  }
                />

                <div className={styles.lines}>
                  <div className={styles.line}>
                    <span>
                      {people} × {formatCurrency(activity.price)}
                    </span>
                    <span>{formatCurrency(total)}</span>
                  </div>
                  <div className={styles.totalRow}>
                    <span className={styles.totalTag}>Total</span>
                    <span>{formatCurrency(total)}</span>
                  </div>
                </div>

                {bookingError !== null && (
                  <p className={styles.feedback + ' ' + styles.error} role="alert">
                    {bookingError}
                  </p>
                )}

                <Button
                  variant="warm"
                  size="lg"
                  block
                  disabled={isBooking || isFull}
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

          <article className={styles.booking}>
            <h2 className={styles.sectionTitle}>{t("Reseñas")}</h2>
            <p className={styles.paragraphMuted}>
              {t("Todavía no hay reseñas de esta actividad.")}</p>
          </article>
        </div>
      </div>
    </div>
  )
}
