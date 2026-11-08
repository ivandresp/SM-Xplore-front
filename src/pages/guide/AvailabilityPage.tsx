import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Button } from '@/components/Button'
import { Field } from '@/components/FormField'
import { PageHeader } from '@/components/PageHeader/PageHeader'
import { Skeleton } from '@/components/Skeleton'
import { StateMessage } from '@/components/StateMessage'
import { StatusBadge } from '@/components/StatusBadge/StatusBadge'
import {
  ACTIVITY_STATUS_LABELS,
  ACTIVITY_STATUS_TONES,
} from '@/config/roles'
import { useAuth } from '@/hooks/useAuth'
import { activitiesApi } from '@/services/activitiesApi'
import { reservationsApi } from '@/services/reservationsApi'
import {
  combineDateAndTime,
  toDateInput,
  toTimeInput,
} from '@/utils/datetime'
import { describeApiError } from '@/utils/errors'
import type { ActivityResponse, ReservationStatus } from '@/types'
import styles from './guide.module.css'

/** Estados finales: ya no cuentan como reserva activa. */
const FINAL_RESERVATION_STATUSES: ReservationStatus[] = [
  'CANCELLED',
  'NO_SHOW',
  'COMPLETED',
]

export default function AvailabilityPage() {
  const { user } = useAuth()
  const [searchParams] = useSearchParams()

  const [activities, setActivities] = useState<ActivityResponse[]>([])
  const [selectedId, setSelectedId] = useState('')
  const [date, setDate] = useState('')
  const [startTime, setStartTime] = useState('08:00')
  const [endTime, setEndTime] = useState('12:00')
  const [maxCapacity, setMaxCapacity] = useState('')
  const [activeReservations, setActiveReservations] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [isWorking, setIsWorking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [reloadToken, setReloadToken] = useState(0)

  const guideId = user?.id

  useEffect(() => {
    if (guideId === undefined) {
      return
    }

    let cancelled = false

    async function run() {
      try {
        const mine = (await activitiesApi.list({ guideId })).content
        if (cancelled) return

        setActivities(mine)

        const requested = searchParams.get('id')
        const initial =
          mine.find((activity) => activity.id === requested) ?? mine[0]

        if (initial !== undefined) {
          setSelectedId(initial.id)
          setDate(toDateInput(initial.startsAt))
          setStartTime(toTimeInput(initial.startsAt))
          setEndTime(toTimeInput(initial.endsAt))
          setMaxCapacity(String(initial.maxCapacity))
        }

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [guideId, reloadToken])

  function retry() {
    setIsLoading(true)
    setError(null)
    setReloadToken((value) => value + 1)
  }

  const selected = activities.find((activity) => activity.id === selectedId)

  // Reservas activas: las que aún no están cerradas (rechazada, cancelada,
  // no-show o completada). El backend las resuelve por ítem con `/by-item`.
  useEffect(() => {
    if (selectedId === '') {
      return
    }

    let cancelled = false

    async function run() {
      try {
        const reservations = await reservationsApi.listByItem({
          itemType: 'ACTIVITY',
          itemId: selectedId,
          limit: 200,
        })

        if (!cancelled) {
          setActiveReservations(
            reservations.filter(
              (reservation) => !FINAL_RESERVATION_STATUSES.includes(reservation.status),
            ).length,
          )
        }
      } catch {
        if (!cancelled) setActiveReservations(0)
      }
    }

    void run()

    return () => {
      cancelled = true
    }
  }, [selectedId])

  function selectActivity(id: string) {
    const found = activities.find((activity) => activity.id === id)
    setSelectedId(id)
    setFeedback(null)
    setError(null)

    if (found !== undefined) {
      setDate(toDateInput(found.startsAt))
      setStartTime(toTimeInput(found.startsAt))
      setEndTime(toTimeInput(found.endsAt))
      setMaxCapacity(String(found.maxCapacity))
    }
  }

  async function runAction(
    action: () => Promise<ActivityResponse>,
    message: string,
  ) {
    setIsWorking(true)
    setError(null)
    setFeedback(null)

    try {
      const updated = await action()
      setActivities((current) =>
        current.map((activity) =>
          activity.id === updated.id ? updated : activity,
        ),
      )
      setFeedback(message)
    } catch (cause) {
      setError(describeApiError(cause))
    } finally {
      setIsWorking(false)
    }
  }

  async function save() {
    if (selected === undefined) {
      return
    }

    const capacity = Number(maxCapacity)

    if (date === '' || startTime === '' || endTime === '' || capacity < 1) {
      setError(
        'Elige la fecha, la hora de inicio y de fin, y un cupo de al menos 1 persona.',
      )
      return
    }

    setIsWorking(true)
    setError(null)
    setFeedback(null)

    try {
      await activitiesApi.setAvailability(selected.id, {
        startsAt: combineDateAndTime(date, startTime),
        endsAt: combineDateAndTime(date, endTime),
      })

      const updated = await activitiesApi.setSlots(selected.id, {
        maxCapacity: capacity,
      })

      setActivities((current) =>
        current.map((activity) =>
          activity.id === updated.id ? updated : activity,
        ),
      )
      setFeedback('Fechas y cupos actualizados.')
    } catch (cause) {
      setError(describeApiError(cause))
    } finally {
      setIsWorking(false)
    }
  }

  if (isLoading) {
    return (
      <section>
        <Skeleton variant="text" count={5} label="Cargando actividades…" />
      </section>
    )
  }

  return (
    <section>
      <PageHeader
        breadcrumb={[{ label: 'Disponibilidad' }, { label: 'Fechas y cupos' }]}
        title="Disponibilidad y cupos"
        actions={
          selected !== undefined ? (
            <StatusBadge tone={ACTIVITY_STATUS_TONES[selected.status]}>
              {ACTIVITY_STATUS_LABELS[selected.status]}
            </StatusBadge>
          ) : undefined
        }
      />

      {error !== null && (
        <StateMessage
          title={
            activities.length === 0
              ? 'No se pudieron cargar tus actividades'
              : 'No se pudo aplicar el cambio'
          }
          description={error}
          tone="error"
          action={
            activities.length === 0 ? (
              <Button onClick={retry}>Reintentar</Button>
            ) : undefined
          }
        />
      )}
      {feedback !== null && (
        <p className={`${styles.feedback} ${styles.success}`}>{feedback}</p>
      )}

      {activities.length === 0 ? (
        error === null ? (
          <StateMessage
            title="No tienes actividades todavía"
            description="Crea la primera para gestionar su disponibilidad."
            action={
              <Link to="/app/mis-actividades/nueva">
                <Button variant="outline">Crear actividad</Button>
              </Link>
            }
          />
        ) : null
      ) : (
        <div className={styles.layout}>
          <div className={styles.card}>
            <h2 className={styles.cardTitle}>Fechas y cupos</h2>

            <div className={`${styles.grid} ${styles.twoColumns}`}>
              <label className={styles.full}>
                <span className={styles.fieldLabel}>Actividad</span>
                <select
                  className={styles.control}
                  value={selectedId}
                  onChange={(event) => selectActivity(event.target.value)}
                >
                  {activities.map((activity) => (
                    <option key={activity.id} value={activity.id}>
                      {activity.name}
                    </option>
                  ))}
                </select>
              </label>

              <Field
                label="Fecha"
                type="date"
                required
                value={date}
                onChange={(event) => setDate(event.target.value)}
              />
              <div className={`${styles.grid} ${styles.twoColumns}`}>
                <Field
                  label="Hora inicio"
                  type="time"
                  required
                  value={startTime}
                  onChange={(event) => setStartTime(event.target.value)}
                />
                <Field
                  label="Hora fin"
                  type="time"
                  required
                  value={endTime}
                  onChange={(event) => setEndTime(event.target.value)}
                />
              </div>

              <Field
                label="Capacidad máxima (cupos)"
                type="number"
                min={1}
                required
                value={maxCapacity}
                onChange={(event) => setMaxCapacity(event.target.value)}
              />
            </div>

            <div className={styles.actions}>
              <Button
                variant="accent"
                size="lg"
                disabled={isWorking}
                onClick={() => void save()}
              >
                {isWorking ? 'Guardando…' : 'Guardar cambios'}
              </Button>
              <Button
                variant="outline"
                size="lg"
                disabled={isWorking || selected?.status === 'PAUSED'}
                onClick={() =>
                  selected !== undefined &&
                  void runAction(
                    () =>
                      activitiesApi.changeStatus(selected.id, {
                        status: 'PAUSED',
                      }),
                    'Fechas cerradas temporalmente (actividad pausada).',
                  )
                }
              >
                Cerrar temporalmente
              </Button>
              <Button
                variant="outline"
                size="lg"
                disabled={isWorking || selected?.status === 'CANCELLED'}
                onClick={() =>
                  selected !== undefined &&
                  void runAction(
                    () => activitiesApi.cancel(selected.id),
                    'Actividad cancelada.',
                  )
                }
              >
                Cancelar actividad
              </Button>
            </div>

            <p className={styles.notice}>
              La actividad tiene una sola fecha de inicio y fin, sin turnos ni
              cierres por día. «Cerrar temporalmente» la pausa entera.
            </p>
          </div>

          <div className={styles.column}>
            <article className={styles.card}>
              <h2 className={styles.cardTitle}>Cupos</h2>
              <div className={styles.summaryLine}>
                <span>Capacidad máxima</span>
                <span className={styles.summaryValue}>
                  {selected?.maxCapacity ?? 0} personas
                </span>
              </div>
              <div className={styles.summaryLine}>
                <span>Cupos por turno</span>
                <span className={styles.summaryValue}>
                  {selected?.maxCapacity ?? 0} cupos
                </span>
              </div>
              <div className={styles.summaryLine}>
                <span>Reservas activas</span>
                <span className={styles.summaryValue}>
                  {activeReservations}
                </span>
              </div>
              <p className={styles.muted}>
                "Cupos por turno" es la misma capacidad de la actividad.
              </p>
            </article>

            <article className={styles.card}>
              <h2 className={styles.cardTitle}>Reservas</h2>
              <p className={styles.muted}>
                Las reservas de tus actividades se atienden en "Reservas
                recibidas".
              </p>
              <Link to="/app/reservas-recibidas">
                <Button variant="outline" block>
                  Ir a reservas recibidas
                </Button>
              </Link>
            </article>
          </div>
        </div>
      )}
    </section>
  )
}
