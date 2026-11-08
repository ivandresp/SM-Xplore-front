import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
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
import { activitiesApi } from '@/services/activitiesApi'
import { describeApiError } from '@/utils/errors'
import { formatCurrency, formatDurationLong } from '@/utils/format'
import type { ActivityResponse, ActivityStatus } from '@/types'
import styles from './guide.module.css'

export default function ActivityManagePage() {
  const { activityId } = useParams<{ activityId: string }>()
  const navigate = useNavigate()

  const [activity, setActivity] = useState<ActivityResponse | null>(null)
  const [name, setName] = useState('')
  const [category, setCategory] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('')
  const [status, setStatus] = useState<ActivityStatus>('DRAFT')
  const [isLoading, setIsLoading] = useState(true)
  const [isWorking, setIsWorking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [reloadToken, setReloadToken] = useState(0)

  useEffect(() => {
    if (activityId === undefined) {
      return
    }

    let cancelled = false

    async function run() {
      try {
        const found = await activitiesApi.getById(activityId as string)
        if (cancelled) return

        setActivity(found)
        setName(found.name)
        setCategory(found.category)
        setDescription(found.description ?? '')
        setPrice(String(found.price))
        setStatus(found.status)
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
  }, [activityId, reloadToken])

  function retry() {
    setIsLoading(true)
    setError(null)
    setReloadToken((value) => value + 1)
  }

  if (isLoading) {
    return (
      <section>
        <Skeleton variant="text" count={6} label="Cargando actividad…" />
      </section>
    )
  }

  if (activity === null) {
    return (
      <section>
        <Link to="/app/mis-actividades" className={styles.back}>
          ← Volver a mis actividades
        </Link>
        <StateMessage
          title="No se pudo cargar la actividad"
          description={error ?? 'No se encontró la actividad.'}
          tone="error"
          action={<Button onClick={retry}>Reintentar</Button>}
        />
      </section>
    )
  }

  const current = activity

  async function runAction(
    action: () => Promise<ActivityResponse>,
    message: string,
  ) {
    setIsWorking(true)
    setError(null)
    setFeedback(null)

    try {
      const updated = await action()
      setActivity(updated)
      setStatus(updated.status)
      setFeedback(message)
    } catch (cause) {
      setError(describeApiError(cause))
    } finally {
      setIsWorking(false)
    }
  }

  async function save() {
    setIsWorking(true)
    setError(null)
    setFeedback(null)

    try {
      const updated = await activitiesApi.update(current.id, {
        name: name.trim(),
        category: category.trim(),
        description: description.trim() === '' ? undefined : description.trim(),
        price: Number(price),
      })

      // El estado se cambia con un endpoint aparte.
      const withStatus =
        status === current.status
          ? updated
          : await activitiesApi.changeStatus(current.id, { status })

      setActivity(withStatus)
      setFeedback('Cambios guardados.')
    } catch (cause) {
      setError(describeApiError(cause))
    } finally {
      setIsWorking(false)
    }
  }

  return (
    <section>
      <Link to="/app/mis-actividades" className={styles.back}>
        ← Volver a mis actividades
      </Link>

      <PageHeader
        breadcrumb={[
          { label: 'Mis actividades', to: '/app/mis-actividades' },
          { label: current.name },
        ]}
        title="Editar actividad"
        actions={
          <StatusBadge tone={ACTIVITY_STATUS_TONES[current.status]}>
            {ACTIVITY_STATUS_LABELS[current.status]}
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

      <div className={styles.layout}>
        <form
          className={styles.card}
          onSubmit={(event) => {
            event.preventDefault()
            void save()
          }}
          noValidate
        >
          <h2 className={styles.cardTitle}>Información de la actividad</h2>

          <div className={`${styles.grid} ${styles.twoColumns}`}>
            <Field
              label="Nombre de la actividad"
              required
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
            <Field
              label="Categoría"
              required
              value={category}
              onChange={(event) => setCategory(event.target.value)}
            />

            <label className={styles.full}>
              <span className={styles.summaryValue}>Descripción</span>
              <textarea
                className={styles.textarea}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
              />
            </label>

            <Field
              label="Precio por persona (COP)"
              type="number"
              min={0}
              required
              value={price}
              onChange={(event) => setPrice(event.target.value)}
            />
            <Field
              label="Duración"
              value={formatDurationLong(current.durationMinutes)}
              readOnly
              disabled
            />
            <Field
              label="Capacidad máxima"
              value={`${current.maxCapacity} personas`}
              readOnly
              disabled
            />
            <Field
              label="Fechas"
              value={`${current.startsAt.slice(0, 10)} → ${current.endsAt.slice(0, 10)}`}
              readOnly
              disabled
            />
          </div>

          <div className={styles.actions}>
            <Button variant="accent" size="lg" type="submit" disabled={isWorking}>
              {isWorking ? 'Guardando…' : 'Guardar cambios'}
            </Button>
            <Button
              variant="outlineAccent"
              size="lg"
              disabled={isWorking || current.status === 'PAUSED'}
              onClick={() =>
                void runAction(
                  () => activitiesApi.changeStatus(current.id, { status: 'PAUSED' }),
                  'Actividad despublicada (pausada).',
                )
              }
            >
              Despublicar
            </Button>
            <Button
              variant="outline"
              size="lg"
              disabled={isWorking || current.status === 'CANCELLED'}
              onClick={() =>
                void runAction(
                  () => activitiesApi.cancel(current.id),
                  'Actividad cancelada.',
                )
              }
            >
              Eliminar actividad
            </Button>
          </div>

          <p className={styles.notice}>
            Duración, capacidad y fechas se editan en «Disponibilidad». Cancelar
            una actividad no la borra: deja de mostrarse en el catálogo.
          </p>
        </form>

        <div className={styles.column}>
          <article className={styles.card}>
            <h2 className={styles.cardTitle}>Estado de la publicación</h2>

            {(['PUBLISHED', 'PAUSED', 'DRAFT'] as ActivityStatus[]).map(
              (option) => (
                <label key={option} className={styles.radioRow}>
                  <input
                    type="radio"
                    name="status"
                    checked={status === option}
                    onChange={() => setStatus(option)}
                  />
                  {ACTIVITY_STATUS_LABELS[option]}
                </label>
              ),
            )}

            <p className={styles.muted}>
              Se aplica al guardar. Pasar de borrador a publicado también se
              puede dejar para después.
            </p>
          </article>

          <article className={styles.card}>
            <h2 className={styles.cardTitle}>Resumen</h2>
            <div className={styles.summaryLine}>
              <span>Precio actual</span>
              <span className={styles.summaryValue}>
                {formatCurrency(current.price)}
              </span>
            </div>
            <div className={styles.summaryLine}>
              <span>Capacidad</span>
              <span className={styles.summaryValue}>
                {current.maxCapacity} personas
              </span>
            </div>
            <Link to={`/app/disponibilidad?id=${current.id}`}>
              <Button variant="outlineAccent" block>
                Gestionar disponibilidad
              </Button>
            </Link>
          </article>
        </div>
      </div>

      <div className={styles.actions}>
        <Button
          variant="outline"
          onClick={() => navigate('/app/mis-actividades')}
        >
          Volver al listado
        </Button>
      </div>
    </section>
  )
}
