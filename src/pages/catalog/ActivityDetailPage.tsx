import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { Button } from '@/components/Button'
import { MapPreview } from '@/components/MapPreview'
import { PageHeader } from '@/components/PageHeader/PageHeader'
import { Skeleton } from '@/components/Skeleton'
import { StateMessage } from '@/components/StateMessage'
import { StatusBadge } from '@/components/StatusBadge/StatusBadge'
import { ACTIVITY_STATUS_LABELS, PAYMENT_METHOD_LABELS } from '@/config/roles'
import { useAuth } from '@/hooks/useAuth'
import { useItinerary } from '@/hooks/useItinerary'
import { useTrackView } from '@/hooks/useTrackView'
import { activitiesApi } from '@/services/activitiesApi'
import { describeApiError } from '@/utils/errors'
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
  return new Intl.DateTimeFormat('es-CO', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value))
}

const PAYMENT_OPTIONS = Object.entries(PAYMENT_METHOD_LABELS).map(
  ([value, label]) => ({ value, label }),
)

export default function ActivityDetailPage() {
  const { activityId } = useParams<{ activityId: string }>()
  useTrackView('ACTIVITY', activityId)
  const { user, isAuthenticated } = useAuth()
  const { itinerary, addEntry, removeEntry } = useItinerary()
  const navigate = useNavigate()
  const location = useLocation()

  const [activity, setActivity] = useState<ActivityResponse | null>(null)
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

          if (zonesResult.status === 'fulfilled') {
            setZone(
              zonesResult.value.find(
                (item) => item.id === siteResult.value.zoneId,
              ) ?? null,
            )
          }
        }
      } catch (cause) {
        if (!cancelled) {
          setError(describeApiError(cause))
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
  }, [activityId, reloadToken])

  function retry() {
    setIsLoading(true)
    setError(null)
    setReloadToken((current) => current + 1)
  }

  if (isLoading) {
    return (
      <div className={styles.page}>
        <Skeleton variant="text" count={6} label="Cargando actividad…" />
      </div>
    )
  }

  if (activity === null) {
    return (
      <div className={styles.page}>
        <Link to="/explorar" className={styles.state}>
          ← Volver al catálogo
        </Link>
        <StateMessage
          tone="error"
          title="No pudimos cargar la actividad"
          description={error ?? 'No se encontró la actividad.'}
          action={
            <Button variant="accent" onClick={retry}>
              Reintentar
            </Button>
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
      meta: `Actividad · ${formatDurationLong(activity.durationMinutes)}`,
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
      setBookingError(describeApiError(cause))
    } finally {
      setIsBooking(false)
    }
  }

  return (
    <div className={styles.page}>
      <PageHeader
        serif
        breadcrumb={[
          { label: 'Inicio', to: '/explorar' },
          { label: 'Actividades', to: '/actividades' },
          { label: activity.name },
        ]}
        title={activity.name}
        description={`${activity.category} · ${formatDurationLong(activity.durationMinutes)} · hasta ${activity.maxCapacity} personas`}
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
          <div className={styles.hero}>Sin fotos disponibles</div>

          <section>
            <h2 className={styles.sectionTitle}>Descripción</h2>
            {activity.description !== null && activity.description !== '' ? (
              <p className={styles.paragraph}>{activity.description}</p>
            ) : (
              <p className={styles.paragraphMuted}>
                Esta actividad no tiene descripción registrada.
              </p>
            )}
          </section>

          <div className={styles.tiles}>
            <div className={styles.tile}>
              <span className={styles.tileLabel}>Duración</span>
              <span className={styles.tileValue}>
                {formatDurationLong(activity.durationMinutes)}
              </span>
            </div>
            <div className={styles.tile}>
              <span className={styles.tileLabel}>Capacidad</span>
              <span className={styles.tileValue}>
                {activity.maxCapacity} personas
              </span>
            </div>
            <div className={styles.tile}>
              <span className={styles.tileLabel}>Categoría</span>
              <span className={styles.tileValue}>{activity.category}</span>
            </div>
            <div className={styles.tile}>
              <span className={styles.tileLabel}>Fecha</span>
              <span className={styles.tileValue}>
                {formatDate(activity.startsAt)}
              </span>
            </div>
          </div>

          <section>
            <h2 className={styles.sectionTitle}>
              Ubicación y punto de encuentro
            </h2>
            {site !== null ? (
              <p className={styles.paragraph}>
                <strong>{site.name}</strong>
                {zone !== null ? ` · ${zone.name}` : ''}
              </p>
            ) : (
              <p className={styles.paragraphMuted}>
                Esta actividad no tiene un atractivo publicado asociado.
              </p>
            )}
            <MapPreview
              label={site?.name ?? activity.name}
              latitude={site?.latitude ?? null}
              longitude={site?.longitude ?? null}
            />
          </section>
        </div>

        <div className={styles.column}>
          <article className={styles.booking}>
            {confirmation !== null ? (
              <>
                <p className={styles.feedback + ' ' + styles.success}>
                  ¡Reserva creada! Estado: {confirmation.status}.
                </p>
                <div className={styles.line}>
                  <span>Reserva</span>
                  <span>{confirmation.code}</span>
                </div>
                <div className={styles.line}>
                  <span>Personas</span>
                  <span>{confirmation.numberOfPeople}</span>
                </div>
                <div className={styles.totalRow}>
                  <span className={styles.totalTag}>Total</span>
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
                  <p className={styles.bookingLabel}>Desde</p>
                  <div className={styles.priceRow}>
                    <span className={styles.priceBig}>
                      {formatCurrency(activity.price)}
                    </span>
                    <span className={styles.priceUnit}>COP / persona</span>
                  </div>
                </div>

                <label className={styles.field}>
                  <span className={styles.fieldLabel}>Fecha</span>
                  <input
                    className={styles.control}
                    type="date"
                    value={activity.startsAt.slice(0, 10)}
                    readOnly
                  />
                </label>

                <label className={styles.field}>
                  <span className={styles.fieldLabel}>Hora</span>
                  <input
                    className={styles.control}
                    type="text"
                    value={formatTime(activity.startsAt)}
                    readOnly
                  />
                </label>

                <div className={styles.field}>
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
                      disabled={people >= activity.maxCapacity}
                      aria-label="Agregar persona"
                    >
                      +
                    </button>
                  </div>
                </div>

                <label className={styles.field}>
                  <span className={styles.fieldLabel}>Método de pago</span>
                  <select
                    className={styles.control}
                    value={paymentMethod}
                    onChange={(event) =>
                      setPaymentMethod(event.target.value as PaymentMethod)
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
                  variant="accent"
                  size="lg"
                  block
                  disabled={isBooking || isFull}
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

          <article className={styles.booking}>
            <h2 className={styles.sectionTitle}>Reseñas</h2>
            <p className={styles.paragraphMuted}>
              Todavía no hay reseñas de esta actividad.
            </p>
          </article>
        </div>
      </div>
    </div>
  )
}
