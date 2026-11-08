import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '@/components/Button'
import { PageHeader } from '@/components/PageHeader/PageHeader'
import { StateMessage } from '@/components/StateMessage'
import { StatusBadge } from '@/components/StatusBadge/StatusBadge'
import { useAuth } from '@/hooks/useAuth'
import { useItinerary } from '@/hooks/useItinerary'
import type { ItineraryEntry } from '@/hooks/useItinerary'
import { reservationsApi } from '@/services/reservationsApi'
import { describeApiError } from '@/utils/errors'
import { formatCurrency } from '@/utils/format'
import styles from './itinerary.module.css'

function formatTime(value: string): string {
  return new Intl.DateTimeFormat('es-CO', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value))
}

function formatDay(value: string): string {
  return new Intl.DateTimeFormat('es-CO', {
    day: 'numeric',
    month: 'short',
  }).format(new Date(value))
}

export default function ItineraryPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { itinerary, updateTrip, removeEntry, patchEntry } = useItinerary()

  const [isReserving, setIsReserving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)

  const days = useMemo(() => {
    const map = new Map<string, ItineraryEntry[]>()

    for (const entry of [...itinerary.entries].sort(
      (a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
    )) {
      const key = entry.startsAt.slice(0, 10)
      const list = map.get(key)

      if (list === undefined) {
        map.set(key, [entry])
      } else {
        list.push(entry)
      }
    }

    return [...map.entries()]
  }, [itinerary.entries])

  const pending = itinerary.entries.filter(
    (entry) => entry.reservationId === undefined,
  )
  const reserved = itinerary.entries.length - pending.length
  const estimatedTotal = itinerary.entries.reduce(
    (sum, entry) => sum + entry.price,
    0,
  )
  const estimatedDays =
    itinerary.from !== '' && itinerary.to !== ''
      ? Math.max(
          1,
          Math.round(
            (new Date(itinerary.to).getTime() -
              new Date(itinerary.from).getTime()) /
              86400000,
          ) + 1,
        )
      : days.length

  async function reserveEntries(entries: ItineraryEntry[]) {
    if (user === null) {
      navigate('/login', { state: { from: { pathname: '/itinerario' } } })
      return
    }

    setIsReserving(true)
    setError(null)
    setFeedback(null)

    let created = 0

    try {
      // Una reserva por entrada: el backend guarda un solo ítem por reserva.
      for (const entry of entries) {
        const reservation = await reservationsApi.create({
          touristId: user.id,
          itemType: entry.type,
          itemId: entry.itemId,
          numberOfPeople: 1,
          paymentMethod: 'CARD',
          bookedFor: entry.startsAt,
        })

        patchEntry(entry.itemId, { reservationId: reservation.id })
        created += 1
      }

      setFeedback('Reservas creadas. Puedes verlas en "Mis reservas".')
    } catch (cause) {
      setError(
        created === 0
          ? describeApiError(cause)
          : `${created} de ${entries.length} reservas creadas. Las demás fallaron: ${describeApiError(cause)}`,
      )
    } finally {
      setIsReserving(false)
    }
  }

  return (
    <div className={styles.page}>
      <PageHeader
        breadcrumb={[
          { label: 'Inicio', to: '/explorar' },
          { label: 'Mis viajes', to: '/itinerario' },
          { label: 'Nuevo itinerario' },
        ]}
        title="Crear itinerario de viaje"
        description="Organiza por día los servicios, actividades y eventos que quieres reservar."
      />

      {error !== null && (
        <StateMessage
          tone="error"
          title="No se pudieron crear las reservas"
          description={error}
        />
      )}
      {feedback !== null && (
        <p className={`${styles.feedback} ${styles.success}`}>{feedback}</p>
      )}

      <div className={styles.layout}>
        <div className={styles.column}>
          <article className={styles.card}>
            <h2 className={styles.cardTitle}>Datos del viaje</h2>

            <div className={styles.grid}>
              <label>
                <span className={styles.fieldLabel}>Nombre del itinerario</span>
                <input
                  className={styles.control}
                  type="text"
                  placeholder="Ej: Fin de semana en Santa Marta"
                  value={itinerary.name}
                  onChange={(event) =>
                    updateTrip({ name: event.target.value })
                  }
                />
              </label>

              <div className={`${styles.grid} ${styles.gridTwo}`}>
                <label>
                  <span className={styles.fieldLabel}>Desde</span>
                  <input
                    className={styles.control}
                    type="date"
                    value={itinerary.from}
                    onChange={(event) =>
                      updateTrip({ from: event.target.value })
                    }
                  />
                </label>
                <label>
                  <span className={styles.fieldLabel}>Hasta</span>
                  <input
                    className={styles.control}
                    type="date"
                    value={itinerary.to}
                    onChange={(event) => updateTrip({ to: event.target.value })}
                  />
                </label>
              </div>
            </div>
          </article>

          <article className={styles.card}>
            <h2 className={styles.cardTitle}>Itinerario</h2>

            {days.length === 0 && (
              <StateMessage
                title="Todavía no has agregado nada"
                description='Busca actividades en el catálogo y pulsa "Agregar al itinerario".'
                action={
                  <Link to="/explorar">
                    <Button variant="outline">Explorar actividades</Button>
                  </Link>
                }
              />
            )}

            {days.map(([day, entries], index) => (
              <div key={day}>
                <h3 className={styles.dayTitle}>
                  Día {index + 1} · {formatDay(day)}
                </h3>

                {entries.map((entry) => (
                  <div key={entry.itemId} className={styles.entry}>
                    <span className={styles.entryTime}>
                      {formatTime(entry.startsAt)}
                    </span>

                    <div className={styles.entryBody}>
                      <p className={styles.entryName}>{entry.name}</p>
                      <p className={styles.entryMeta}>{entry.meta}</p>
                    </div>

                    <div className={styles.entrySide}>
                      {entry.reservationId === undefined ? (
                        <>
                          <StatusBadge tone="neutral">Sin reservar</StatusBadge>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={isReserving}
                            onClick={() => void reserveEntries([entry])}
                          >
                            Reservar
                          </Button>
                        </>
                      ) : (
                        <>
                          <StatusBadge tone="success">Reservado</StatusBadge>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => removeEntry(entry.itemId)}
                          >
                            Quitar
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ))}

            {days.length > 0 && (
              <Link to="/explorar" className={styles.addEntry}>
                + Agregar servicio, actividad o evento
              </Link>
            )}
          </article>
        </div>

        <div className={styles.column}>
          <article className={styles.card}>
            <h2 className={styles.cardTitle}>Resumen</h2>

            <div className={styles.summaryLines}>
              <div className={styles.summaryLine}>
                <span>Duración</span>
                <span>
                  {estimatedDays} {estimatedDays === 1 ? 'día' : 'días'}
                </span>
              </div>
              <div className={styles.summaryLine}>
                <span>Elementos</span>
                <span>{itinerary.entries.length}</span>
              </div>
              <div className={styles.summaryLine}>
                <span>Reservados</span>
                <span>
                  {reserved} de {itinerary.entries.length}
                </span>
              </div>
              <div className={styles.summaryTotal}>
                <span>Total estimado</span>
                <span>{formatCurrency(estimatedTotal)}</span>
              </div>
            </div>

            <div className={styles.actions}>
              <Button
                variant="primary"
                onClick={() => {
                  setError(null)
                  setFeedback('Itinerario guardado en este navegador.')
                }}
              >
                Guardar itinerario
              </Button>
              <Button
                variant="outline"
                disabled={pending.length === 0 || isReserving}
                onClick={() => void reserveEntries(pending)}
              >
                {isReserving ? 'Reservando…' : 'Reservar pendientes'}
              </Button>
              <p className={styles.note}>
                {pending.length === 0
                  ? 'Puedes reservar ahora o más tarde'
                  : 'Se reservan para 1 persona con pago con tarjeta.'}
              </p>
            </div>
          </article>
        </div>
      </div>
    </div>
  )
}
