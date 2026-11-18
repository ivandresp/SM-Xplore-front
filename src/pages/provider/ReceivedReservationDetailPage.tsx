import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { ApiErrorAction } from '@/components/ApiErrorAction'
import { useApiErrorState } from '@/hooks/useApiErrorState'
import { BackButton } from '@/components/BackButton'
import { useMessageState } from '@/hooks/useMessageState'
import { getLocale, translate as t } from '@/i18n/language'
import { useLanguage } from '@/hooks/useLanguage'
import { Button } from '@/components/Button'
import { DefList } from '@/components/DefList/DefList'
import type { DefItem } from '@/components/DefList/DefList'
import { PageHeader } from '@/components/PageHeader/PageHeader'
import { Skeleton } from '@/components/Skeleton'
import { StateMessage } from '@/components/StateMessage'
import { StatusBadge } from '@/components/StatusBadge/StatusBadge'
import {
  PAYMENT_METHOD_LABELS,
  RESERVATION_STATUS_LABELS,
  RESERVATION_STATUS_TONES,
} from '@/config/roles'
import { itemLabel, loadCatalogLookup } from '@/services/catalogLookup'
import type { CatalogEntry } from '@/services/catalogLookup'
import { itemOf, reservationsApi } from '@/services/reservationsApi'
import { formatCurrency, formatDate } from '@/utils/format'
import type { ReservationItemResponse, ReservationResponse } from '@/types'
import styles from '@/pages/reservations/reservations.module.css'

function formatTime(value: string): string {
  return new Intl.DateTimeFormat(getLocale(), {
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value))
}

export default function ReceivedReservationDetailPage() {
  useLanguage()
  const { reservationId } = useParams<{ reservationId: string }>()

  const [reservation, setReservation] = useState<ReservationResponse | null>(
    null,
  )
  const [items, setItems] = useState<ReservationItemResponse[]>([])
  const [lookup, setLookup] = useState<Map<string, CatalogEntry>>(new Map())
  const [isLoading, setIsLoading] = useState(true)
  const [hasStarted, setHasStarted] = useState(false)
  const [isWorking, setIsWorking] = useState(false)
  const [error, setError, errorCause, setErrorFromApi] = useApiErrorState()
  const [feedback, setFeedback] = useMessageState<string | null>(null)
  const [reloadToken, setReloadToken] = useState(0)

  useEffect(() => {
    if (reservationId === undefined) {
      return
    }

    let cancelled = false

    async function run() {
      setIsLoading(true)
      setError(null)

      try {
        const [found, catalog] = await Promise.all([
          reservationsApi.getById(reservationId as string),
          loadCatalogLookup(),
        ])

        if (cancelled) return

        setReservation(found)
        setItems([itemOf(found)])
        setLookup(catalog)
        // El backend rechaza la asistencia antes de la fecha reservada.
        setHasStarted(new Date(found.bookedFor).getTime() <= Date.now())
        setError(null)
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
  }, [reservationId, reloadToken, setError, setErrorFromApi])

  function retry() {
    setIsLoading(true)
    setError(null)
    setReloadToken((token) => token + 1)
  }

  if (isLoading) {
    return <Skeleton variant="text" count={4} label={t("Cargando reserva…")} />
  }

  if (reservation === null) {
    return (
      <div>
        <BackButton to="/app/reservas-recibidas" />
        <StateMessage
          title={t("No se pudo cargar la reserva")}
          description={error ?? t("No se encontró la reserva.")}
          tone="error"
          action={<ApiErrorAction error={errorCause} onRetry={retry} />}
        />
      </div>
    )
  }

  const current = reservation
  const subtotal = items.reduce((sum, item) => sum + item.price, 0)
  const code = current.code

  const infoItems: DefItem[] = [
    {
      label: t("Fecha y hora"),
      value: `${formatDate(current.bookedFor)} · ${formatTime(current.bookedFor)}`,
    },
    { label: t("Personas"), value: String(current.numberOfPeople) },
    {
      label: t("Método de pago"),
      value: PAYMENT_METHOD_LABELS[current.paymentMethod],
    },
    { label: t("Notas"), value: current.notes ?? t('Sin notas') },
  ]

  async function runAction(
    action: (id: string) => Promise<ReservationResponse>,
    message: () => string,
  ) {
    setIsWorking(true)
    setError(null)
    setFeedback(null)

    try {
      const updated = await action(current.id)
      setReservation(updated)
      setFeedback(message)
    } catch (cause) {
      setErrorFromApi(cause)
    } finally {
      setIsWorking(false)
    }
  }

  const canAttendance = current.status === 'CONFIRMED' && hasStarted
  const canNoShow = current.status === 'CONFIRMED' && hasStarted
  const hasActions = current.status === 'CONFIRMED'

  return (
    <div>
      <BackButton to="/app/reservas-recibidas" />

      <PageHeader
        breadcrumb={[
          { label: t("Reservas"), to: '/app/reservas-recibidas' },
          { label: t("Recibidas"), to: '/app/reservas-recibidas' },
          { label: `#${code}` },
        ]}
        title={t("Reserva {0}", [code])}
        description={t("Creada el {0}", [formatDate(current.bookedAt)])}
        actions={
          <StatusBadge tone={RESERVATION_STATUS_TONES[current.status]}>
            {RESERVATION_STATUS_LABELS[current.status]}
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
            <h2 className={styles.cardTitle}>{t("Ítems de la reserva")}</h2>
            {items.map((item) => {
              const entry = lookup.get(item.itemId)
              return (
                <div key={item.itemId} className={styles.itemRow}>
                  <span className={styles.itemThumb} aria-hidden="true">
                    {t("Sin foto")}</span>
                  <div>
                    <h3 className={styles.itemName}>
                      {entry?.name ?? t("Ítem reservado")}
                    </h3>
                    <p className={styles.itemMeta}>
                      {itemLabel(item.type)} · {formatCurrency(item.price)}
                    </p>
                  </div>
                </div>
              )
            })}
          </article>

          <article className={styles.card}>
            <h2 className={styles.cardTitle}>{t("Información de la reserva")}</h2>
            <DefList items={infoItems} />
          </article>

          <article className={styles.card}>
            <h2 className={styles.cardTitle}>{t("Turista")}</h2>
            <p className={styles.contactMeta}>
              {t("Identificador del turista:")}{" "}{current.touristId}
            </p>
          </article>
        </div>

        <div className={styles.column}>
          <article className={styles.card}>
            <h2 className={styles.cardTitle}>{t("Pago y acciones")}</h2>

            <div className={styles.lines}>
              <div className={styles.line}>
                <span>Subtotal</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              <div className={styles.totalLine}>
                <span>Total</span>
                <span>{formatCurrency(current.total)}</span>
              </div>
            </div>

            <div className={styles.actions}>
              {canAttendance && (
                <Button
                  variant="primary"
                  disabled={isWorking}
                  onClick={() =>
                    void runAction(
                      reservationsApi.markAttendance,
                      () => t("Asistencia marcada."),
                    )
                  }
                >
                  {t("Marcar asistencia")}</Button>
              )}
              {canNoShow && (
                <Button
                  variant="outline"
                  disabled={isWorking}
                  onClick={() =>
                    void runAction(
                      reservationsApi.markNoShow,
                      () => t("Marcada como no asistió."),
                    )
                  }
                >
                  {t("No se presentó")}</Button>
              )}
              {current.status === 'CONFIRMED' && !hasStarted && (
                <p className={styles.actionsNote}>
                  {t("Podrás marcar asistencia o no-show cuando empiece la reserva (")}{formatDate(current.bookedFor)} ·{' '}
                  {formatTime(current.bookedFor)}).
                </p>
              )}
              {!hasActions && (
                <p className={styles.actionsNote}>
                  {t("Esta reserva ya está cerrada: no hay acciones disponibles.")}</p>
              )}
            </div>
          </article>
        </div>
      </div>
    </div>
  )
}