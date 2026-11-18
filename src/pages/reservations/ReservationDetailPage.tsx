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
import styles from './reservations.module.css'

function formatTime(value: string): string {
  return new Intl.DateTimeFormat(getLocale(), {
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value))
}

export default function ReservationDetailPage() {
  useLanguage()
  const { reservationId } = useParams<{ reservationId: string }>()

  const [reservation, setReservation] = useState<ReservationResponse | null>(
    null,
  )
  const [items, setItems] = useState<ReservationItemResponse[]>([])
  const [lookup, setLookup] = useState<Map<string, CatalogEntry>>(new Map())
  const [isLoading, setIsLoading] = useState(true)
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
      try {
        const [found, catalog] = await Promise.all([
          reservationsApi.getById(reservationId as string),
          loadCatalogLookup(),
        ])

        if (cancelled) return

        const item = itemOf(found)

        setReservation(found)
        setItems([item])
        setLookup(catalog)
        setError(null)
      } catch (cause) {
        if (!cancelled) {
          setErrorFromApi(cause)
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
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
    setReloadToken((value) => value + 1)
  }

  if (isLoading) {
    return (
      <div className={styles.page}>
        <Skeleton variant="text" count={6} label={t("Cargando reserva…")} />
      </div>
    )
  }

  if (reservation === null) {
    return (
      <div className={styles.page}>
        <BackButton to="/mis-reservas" />
        <StateMessage
          title={t("No se pudo cargar la reserva")}
          description={error ?? t("No se encontró la reserva.")}
          tone="error"
          action={<ApiErrorAction error={errorCause} onRetry={retry} />}
        />
      </div>
    )
  }

  const first = items[0]
  const entry = first !== undefined ? lookup.get(first.itemId) : undefined
  const subtotal = items.reduce((sum, item) => sum + item.price, 0)
  const code = reservation.code
  const canRequestCancellation = reservation.status === 'CONFIRMED'

  const infoItems: DefItem[] = [
    {
      label: t("Fecha y hora"),
      value: `${formatDate(reservation.bookedFor)} · ${formatTime(reservation.bookedFor)}`,
    },
    { label: t("Personas"), value: String(reservation.numberOfPeople) },
    { label: t("Método de pago"), value: PAYMENT_METHOD_LABELS[reservation.paymentMethod] },
    { label: t("Punto de encuentro"), value: '—' },
    { label: t("Itinerario"), value: '—' },
    { label: t("Notas"), value: reservation.notes ?? t('Sin notas') },
  ]

  async function handleRequestCancellation() {
    setIsWorking(true)
    setError(null)
    setFeedback(null)

    try {
      const updated = await reservationsApi.cancel(reservation!.id)
      setReservation(updated)
      setFeedback(() => t("Reserva cancelada."))
    } catch (cause) {
      setErrorFromApi(cause)
    } finally {
      setIsWorking(false)
    }
  }

  return (
    <div className={styles.page}>
      <BackButton to="/mis-reservas" />

      <PageHeader
        breadcrumb={[
          { label: t("Inicio"), to: '/explorar' },
          { label: t("Mis reservas"), to: '/mis-reservas' },
          { label: `#${code}` },
        ]}
        title={t("Reserva {0}", [code])}
        description={t("Creada el {0}", [formatDate(reservation.bookedAt)])}
        actions={
          <StatusBadge tone={RESERVATION_STATUS_TONES[reservation.status]}>
            {RESERVATION_STATUS_LABELS[reservation.status]}
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
            <div className={styles.itemRow}>
              <span className={styles.itemThumb} aria-hidden="true">
                {t("Sin foto")}</span>
              <div>
                <h2 className={styles.itemName}>
                  {entry?.name ?? t("Ítem reservado")}
                </h2>
                <p className={styles.itemMeta}>
                  {itemLabel(entry?.type ?? first?.type ?? 'ACTIVITY')}
                </p>
              </div>
            </div>
          </article>

          <article className={styles.card}>
            <h2 className={styles.cardTitle}>{t("Información de la reserva")}</h2>
            <DefList items={infoItems} />
            <p className={styles.notice}>
              {t("El punto de encuentro y el itinerario se confirman con el guía o la prestadora.")}</p>
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
              <div className={styles.line}>
                <span>{t("Cargo de servicio")}</span>
                <span>—</span>
              </div>
              <div className={styles.totalLine}>
                <span>Total</span>
                <span>{formatCurrency(reservation.total)}</span>
              </div>
            </div>

            <div className={styles.actions}>
              <Button variant="primary" disabled>
                {t("Modificar reserva")}</Button>
              <Button
                variant="outline"
                disabled={!canRequestCancellation || isWorking}
                onClick={() => void handleRequestCancellation()}
              >
                {isWorking ? t("Enviando…") : t("Cancelar reserva")}
              </Button>
              <p className={styles.actionsNote}>
                {canRequestCancellation
                  ? t("La reserva nace confirmada: solo puedes cancelarla, y el guía o la prestadora ven el cambio en su panel.")
                  : t("Con el estado actual ya no se puede cancelar.")}
              </p>
            </div>
          </article>
        </div>
      </div>
    </div>
  )
}
