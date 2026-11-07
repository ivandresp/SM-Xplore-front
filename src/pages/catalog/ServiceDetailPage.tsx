import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { Button } from '@/components/Button'
import { PageHeader } from '@/components/PageHeader/PageHeader'
import { StatusBadge } from '@/components/StatusBadge/StatusBadge'
import {
  CONTENT_STATUS_LABELS,
  CONTENT_STATUS_TONES,
  PAYMENT_METHOD_LABELS,
  serviceTypeLabel,
} from '@/config/roles'
import { useAuth } from '@/hooks/useAuth'
import { useItinerary } from '@/hooks/useItinerary'
import { reservationsApi } from '@/services/reservationsApi'
import { servicesApi } from '@/services/servicesApi'
import { combineDateAndTime, toDateInput } from '@/utils/datetime'
import { describeApiError } from '@/utils/errors'
import { formatCurrency, formatDate } from '@/utils/format'
import type {
  PaymentMethod,
  ReservationResponse,
  ServiceResponse,
} from '@/types'
import styles from './catalog.module.css'

/** Los servicios no tienen agenda: la reserva elige fecha y hora. */
function defaultBookingDate(): string {
  return toDateInput(new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString())
}

const PAYMENT_OPTIONS = Object.entries(PAYMENT_METHOD_LABELS).map(
  ([value, label]) => ({ value, label }),
)

export default function ServiceDetailPage() {
  const { serviceId } = useParams<{ serviceId: string }>()
  const { user, isAuthenticated } = useAuth()
  const { itinerary, addEntry, removeEntry } = useItinerary()
  const navigate = useNavigate()
  const location = useLocation()

  const [service, setService] = useState<ServiceResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [people, setPeople] = useState(2)
  const [date, setDate] = useState(defaultBookingDate)
  const [time, setTime] = useState('09:00')
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CARD')
  const [isBooking, setIsBooking] = useState(false)
  const [bookingError, setBookingError] = useState<string | null>(null)
  const [confirmation, setConfirmation] = useState<ReservationResponse | null>(
    null,
  )

  useEffect(() => {
    if (serviceId === undefined) {
      return
    }

    let cancelled = false

    async function load() {
      setIsLoading(true)
      setError(null)

      try {
        const found = await servicesApi.getById(serviceId as string)
        if (!cancelled) {
          setService(found)
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
  }, [serviceId])

  if (isLoading) {
    return <p className={styles.page}>Cargando servicio…</p>
  }

  if (service === null) {
    return (
      <div className={styles.page}>
        <Link to="/servicios" className={styles.state}>
          ← Volver al catálogo
        </Link>
        <p className={`${styles.banner} ${styles.error}`} role="alert">
          {error ?? 'No se encontró el servicio.'}
        </p>
      </div>
    )
  }

  const total = service.price * people
  const inItinerary = itinerary.entries.some(
    (entry) => entry.itemId === service.id,
  )

  function toggleItinerary() {
    if (service === null) {
      return
    }

    if (inItinerary) {
      removeEntry(service.id)
      return
    }

    addEntry({
      itemId: service.id,
      type: 'SERVICE',
      name: service.name,
      meta: `Servicio · ${serviceTypeLabel(service.type)}`,
      startsAt: combineDateAndTime(date, time),
      price: service.price,
      providerId: service.providerId,
    })
  }

  async function handleBook() {
    if (!isAuthenticated || user === null) {
      navigate('/login', {
        state: { from: { pathname: location.pathname } },
      })
      return
    }

    if (service === null) {
      return
    }

    if (date === '' || time === '') {
      setBookingError('Elige la fecha y la hora de la reserva.')
      return
    }

    setIsBooking(true)
    setBookingError(null)

    try {
      const reservation = await reservationsApi.create({
        touristId: user.id,
        numberOfPeople: people,
        paymentMethod,
        bookedFor: combineDateAndTime(date, time),
      })

      // El backend ignora el precio en los ítems de tipo SERVICE.
      await reservationsApi.addItem(reservation.id, {
        itemId: service.id,
        type: 'SERVICE',
      })

      setConfirmation(reservation)
    } catch (cause) {
      setBookingError(describeApiError(cause))
    } finally {
      setIsBooking(false)
    }
  }

  const heroPhoto = service.photosUrls[0]

  return (
    <div className={styles.page}>
      <PageHeader
        serif
        breadcrumb={[
          { label: 'Inicio', to: '/explorar' },
          { label: 'Servicios', to: '/servicios' },
          { label: service.name },
        ]}
        title={service.name}
        description={`${serviceTypeLabel(service.type)} · ${service.providerName}`}
        actions={
          <StatusBadge tone={CONTENT_STATUS_TONES[service.status]}>
            {CONTENT_STATUS_LABELS[service.status]}
          </StatusBadge>
        }
      />

      <div className={styles.detailLayout}>
        <div className={styles.column}>
          <div className={styles.hero}>
            {heroPhoto !== undefined ? (
              <img
                className={styles.photo}
                src={heroPhoto}
                alt={service.name}
              />
            ) : (
              'Sin fotos: la prestadora no cargó imágenes'
            )}
          </div>

          <section>
            <h2 className={styles.sectionTitle}>Descripción</h2>
            {service.description === '' ? (
              <p className={styles.paragraphMuted}>
                La prestadora no escribió una descripción.
              </p>
            ) : (
              <p className={styles.paragraph}>{service.description}</p>
            )}
          </section>

          <div className={styles.tiles}>
            <div className={styles.tile}>
              <span className={styles.tileLabel}>Tipo</span>
              <span className={styles.tileValue}>
                {serviceTypeLabel(service.type)}
              </span>
            </div>
            <div className={styles.tile}>
              <span className={styles.tileLabel}>Prestadora</span>
              <span className={styles.tileValue}>{service.providerName}</span>
            </div>
            <div className={styles.tile}>
              <span className={styles.tileLabel}>Capacidad</span>
              <span className={styles.tileValue}>
                {service.maxCapacity} personas
              </span>
            </div>
            <div className={styles.tile}>
              <span className={styles.tileLabel}>Publicado</span>
              <span className={styles.tileValue}>
                {formatDate(service.createdAt)}
              </span>
            </div>
          </div>

          <section>
            <h2 className={styles.sectionTitle}>Ubicación</h2>
            <div className={styles.map}>
              <strong>{service.providerName}</strong>
              <br />
              {service.latitude.toFixed(5)},{' '}
              {service.longitude.toFixed(5)}
            </div>
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
                      {formatCurrency(service.price)}
                    </span>
                    <span className={styles.priceUnit}>COP / persona</span>
                  </div>
                </div>

                <label className={styles.field}>
                  <span className={styles.fieldLabel}>Fecha</span>
                  <input
                    className={styles.control}
                    type="date"
                    value={date}
                    onChange={(event) => setDate(event.target.value)}
                  />
                </label>

                <label className={styles.field}>
                  <span className={styles.fieldLabel}>Hora</span>
                  <input
                    className={styles.control}
                    type="time"
                    value={time}
                    onChange={(event) => setTime(event.target.value)}
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
                      {people} × {formatCurrency(service.price)}
                    </span>
                    <span>{formatCurrency(total)}</span>
                  </div>
                  <div className={styles.totalRow}>
                    <span className={styles.totalTag}>Total</span>
                    <span>{formatCurrency(total)}</span>
                  </div>
                </div>

                {bookingError !== null && (
                  <p
                    className={styles.feedback + ' ' + styles.error}
                    role="alert"
                  >
                    {bookingError}
                  </p>
                )}

                <Button
                  variant="accent"
                  size="lg"
                  block
                  disabled={isBooking}
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
            <h2 className={styles.sectionTitle}>Prestadora</h2>
            <p className={styles.paragraph}>{service.providerName}</p>
            <Link to={`/prestadoras/${service.providerId}`}>
              <Button variant="outline" block>
                Ver perfil de la prestadora
              </Button>
            </Link>
          </article>

          <article className={styles.booking}>
            <h2 className={styles.sectionTitle}>Reseñas</h2>
            <p className={styles.paragraphMuted}>
              Todavía no hay reseñas: el backend aún no expone el módulo de
              reseñas.
            </p>
          </article>
        </div>
      </div>
    </div>
  )
}
