import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Button } from '@/components/Button'
import { DefList } from '@/components/DefList/DefList'
import type { DefItem } from '@/components/DefList/DefList'
import { Field } from '@/components/FormField'
import { PageHeader } from '@/components/PageHeader/PageHeader'
import { Skeleton } from '@/components/Skeleton'
import { StateMessage } from '@/components/StateMessage'
import { StatusBadge } from '@/components/StatusBadge/StatusBadge'
import { EVENT_STATUS_LABELS, EVENT_STATUS_TONES } from '@/config/roles'
import { eventsApi } from '@/services/eventsApi'
import { describeApiError } from '@/utils/errors'
import { formatCurrency, formatDateTime } from '@/utils/format'
import type { EventResponse, EventStatus } from '@/types'
import styles from './events.module.css'

export default function EventManageDetailPage() {
  const { eventId } = useParams<{ eventId: string }>()

  const [event, setEvent] = useState<EventResponse | null>(null)
  const [expected, setExpected] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isWorking, setIsWorking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [reloadToken, setReloadToken] = useState(0)

  useEffect(() => {
    if (eventId === undefined) {
      return
    }

    let cancelled = false

    async function run() {
      setIsLoading(true)
      setError(null)

      try {
        const found = await eventsApi.getById(eventId as string)
        if (!cancelled) {
          setEvent(found)
          setExpected(String(found.expectedAttendance))
          setError(null)
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
    setReloadToken((token) => token + 1)
  }

  if (isLoading) {
    return <Skeleton variant="text" count={4} label="Cargando evento…" />
  }

  if (event === null) {
    return (
      <section>
        <Link to="/app/eventos" className={styles.back}>
          ← Volver a gestión de eventos
        </Link>
        <StateMessage
          title="No se pudo cargar el evento"
          description={error ?? 'No se encontró el evento.'}
          tone="error"
          action={<Button onClick={retry}>Reintentar</Button>}
        />
      </section>
    )
  }

  const current = event

  const infoItems: DefItem[] = [
    { label: 'Inicio', value: formatDateTime(current.startsAt) },
    { label: 'Fin', value: formatDateTime(current.endsAt) },
    { label: 'Categoría', value: current.category },
    { label: 'Aforo', value: `${current.maxCapacity} personas` },
    {
      label: 'Afluencia esperada',
      value: `${current.expectedAttendance} personas`,
    },
    {
      label: 'Precio',
      value:
        current.price === 0 ? 'Gratis' : formatCurrency(current.price),
    },
  ]

  async function runAction(
    action: () => Promise<EventResponse>,
    message: string,
  ) {
    setIsWorking(true)
    setError(null)
    setFeedback(null)

    try {
      const updated = await action()
      setEvent(updated)
      setExpected(String(updated.expectedAttendance))
      setFeedback(message)
    } catch (cause) {
      setError(describeApiError(cause))
    } finally {
      setIsWorking(false)
    }
  }

  const statusActions: Array<{ status: EventStatus; label: string }> = []
  if (current.status === 'DRAFT' || current.status === 'POSTPONED') {
    statusActions.push({ status: 'PUBLISHED', label: 'Publicar' })
  }
  if (current.status === 'PUBLISHED') {
    statusActions.push({ status: 'POSTPONED', label: 'Posponer' })
  }
  if (current.status !== 'CANCELLED') {
    statusActions.push({ status: 'CANCELLED', label: 'Cancelar evento' })
  }

  return (
    <section>
      <Link to="/app/eventos" className={styles.back}>
        ← Volver a gestión de eventos
      </Link>

      <PageHeader
        breadcrumb={[
          { label: 'Eventos', to: '/app/eventos' },
          { label: current.name },
        ]}
        title={current.name}
        description={`${current.category} · ${formatDateTime(current.startsAt)}`}
        actions={
          <StatusBadge tone={EVENT_STATUS_TONES[current.status]}>
            {EVENT_STATUS_LABELS[current.status]}
          </StatusBadge>
        }
      />

      {error !== null && (
        <p className={`${styles.feedback} ${styles.error}`} role="alert">
          {error}
        </p>
      )}
      {feedback !== null && (
        <p className={`${styles.feedback} ${styles.success}`}>{feedback}</p>
      )}

      <div className={styles.detailLayout}>
        <div className={styles.column}>
          <article className={styles.card}>
            <h2 className={styles.cardTitle}>Información del evento</h2>

            <DefList items={infoItems} />
            {current.description !== null && (
              <p className={styles.meta}>{current.description}</p>
            )}
            <p className={styles.helper}>
              El nombre, las fechas y el aforo se definen al crear el evento.
            </p>
          </article>
        </div>

        <div className={styles.column}>
          <article className={styles.card}>
            <h2 className={styles.cardTitle}>Afluencia esperada</h2>
            <Field
              label="Personas esperadas"
              type="number"
              min={0}
              value={expected}
              onChange={(changeEvent) => setExpected(changeEvent.target.value)}
            />
            <div className={styles.actions}>
              <Button
                variant="accent"
                disabled={isWorking || expected.trim() === ''}
                onClick={() =>
                  void runAction(
                    () =>
                      eventsApi.estimateAttendance(current.id, {
                        expectedAttendance: Number(expected),
                      }),
                    'Afluencia actualizada.',
                  )
                }
              >
                Guardar afluencia
              </Button>
            </div>
          </article>

          <article className={styles.card}>
            <h2 className={styles.cardTitle}>Estado</h2>
            <div className={styles.actions}>
              {statusActions.map((action) => (
                <Button
                  key={action.status}
                  variant={
                    action.status === 'CANCELLED' ? 'outline' : 'primary'
                  }
                  disabled={isWorking}
                  onClick={() =>
                    void runAction(
                      () =>
                        eventsApi.changeStatus(current.id, {
                          status: action.status,
                        }),
                      `Evento en estado ${EVENT_STATUS_LABELS[action.status]}.`,
                    )
                  }
                >
                  {action.label}
                </Button>
              ))}
            </div>
            <p className={styles.helper}>
              Transiciones válidas: borrador → publicado/cancelado; publicado →
              pospuesto/cancelado; pospuesto → publicado/cancelado.
            </p>
          </article>
        </div>
      </div>
    </section>
  )
}
