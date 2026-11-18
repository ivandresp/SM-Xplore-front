import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { ApiErrorAction } from '@/components/ApiErrorAction'
import { useApiErrorState } from '@/hooks/useApiErrorState'
import { BackButton } from '@/components/BackButton'
import { useMessageState } from '@/hooks/useMessageState'
import { translate as t } from '@/i18n/language'
import { useLanguage } from '@/hooks/useLanguage'
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
import { formatCurrency, formatDateTime } from '@/utils/format'
import type { EventResponse, EventStatus } from '@/types'
import styles from './events.module.css'

export default function EventManageDetailPage() {
  useLanguage()
  const { eventId } = useParams<{ eventId: string }>()

  const [event, setEvent] = useState<EventResponse | null>(null)
  const [expected, setExpected] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isWorking, setIsWorking] = useState(false)
  const [error, setError, errorCause, setErrorFromApi] = useApiErrorState()
  const [feedback, setFeedback] = useMessageState<string | null>(null)
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
    setReloadToken((token) => token + 1)
  }

  if (isLoading) {
    return <Skeleton variant="text" count={4} label={t("Cargando evento…")} />
  }

  if (event === null) {
    return (
      <section>
        <BackButton to="/app/eventos" />
        <StateMessage
          title={t("No se pudo cargar el evento")}
          description={error ?? t("No se encontró el evento.")}
          tone="error"
          action={<ApiErrorAction error={errorCause} onRetry={retry} />}
        />
      </section>
    )
  }

  const current = event

  const infoItems: DefItem[] = [
    { label: t("Inicio"), value: formatDateTime(current.startsAt) },
    { label: t("Fin"), value: formatDateTime(current.endsAt) },
    { label: t("Categoría"), value: current.category },
    { label: t("Aforo"), value: t('{0} personas', [current.maxCapacity]) },
    {
      label: t("Afluencia esperada"),
      value: `${current.expectedAttendance} personas`,
    },
    {
      label: t("Precio"),
      value:
        current.price === 0 ? t('Gratis') : formatCurrency(current.price),
    },
  ]

  async function runAction(
    action: () => Promise<EventResponse>,
    message: () => string,
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
      setErrorFromApi(cause)
    } finally {
      setIsWorking(false)
    }
  }

  const statusActions: Array<{ status: EventStatus; label: string }> = []
  if (current.status === 'DRAFT' || current.status === 'POSTPONED') {
    statusActions.push({ status: 'PUBLISHED', label: t("Publicar") })
  }
  if (current.status === 'PUBLISHED') {
    statusActions.push({ status: 'POSTPONED', label: t("Posponer") })
  }
  if (current.status !== 'CANCELLED') {
    statusActions.push({ status: 'CANCELLED', label: t("Cancelar evento") })
  }

  return (
    <section>
      <BackButton to="/app/eventos" />

      <PageHeader
        breadcrumb={[
          { label: t("Eventos"), to: '/app/eventos' },
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
            <h2 className={styles.cardTitle}>{t("Información del evento")}</h2>

            <DefList items={infoItems} />
            {current.description !== null && (
              <p className={styles.meta}>{current.description}</p>
            )}
            <p className={styles.helper}>
              {t("El nombre, las fechas y el aforo se definen al crear el evento.")}</p>
          </article>
        </div>

        <div className={styles.column}>
          <article className={styles.card}>
            <h2 className={styles.cardTitle}>{t("Afluencia esperada")}</h2>
            <Field
              label={t("Personas esperadas")}
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
                    () => t("Afluencia actualizada."),
                  )
                }
              >
                {t("Guardar afluencia")}</Button>
            </div>
          </article>

          <article className={styles.card}>
            <h2 className={styles.cardTitle}>{t("Estado")}</h2>
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
                      () => t("Evento en estado {0}.", [EVENT_STATUS_LABELS[action.status]]),
                    )
                  }
                >
                  {action.label}
                </Button>
              ))}
            </div>
            <p className={styles.helper}>
              {t("Transiciones válidas: borrador → publicado/cancelado; publicado → pospuesto/cancelado; pospuesto → publicado/cancelado.")}</p>
          </article>
        </div>
      </div>
    </section>
  )
}
