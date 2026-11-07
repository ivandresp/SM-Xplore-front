import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Button } from '@/components/Button'
import { DefList } from '@/components/DefList/DefList'
import type { DefItem } from '@/components/DefList/DefList'
import { PageHeader } from '@/components/PageHeader/PageHeader'
import { StatusBadge } from '@/components/StatusBadge/StatusBadge'
import {
  PAYMENT_METHOD_LABELS,
  RESERVATION_STATUS_LABELS,
  RESERVATION_STATUS_TONES,
} from '@/config/roles'
import { itemLabel, loadCatalogLookup } from '@/services/catalogLookup'
import type { CatalogEntry } from '@/services/catalogLookup'
import { itemOf, reservationsApi } from '@/services/reservationsApi'
import { describeApiError } from '@/utils/errors'
import { formatCurrency, formatDate } from '@/utils/format'
import type { ReservationItemResponse, ReservationResponse } from '@/types'
import styles from './reservations.module.css'

function formatTime(value: string): string {
  return new Intl.DateTimeFormat('es-CO', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value))
}

export default function ReservationDetailPage() {
  const { reservationId } = useParams<{ reservationId: string }>()

  const [reservation, setReservation] = useState<ReservationResponse | null>(
    null,
  )
  const [items, setItems] = useState<ReservationItemResponse[]>([])
  const [lookup, setLookup] = useState<Map<string, CatalogEntry>>(new Map())
  const [isLoading, setIsLoading] = useState(true)
  const [isWorking, setIsWorking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)

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
          setError(describeApiError(cause))
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
  }, [reservationId])

  if (isLoading) {
    return <p className={styles.page}>Cargando reserva…</p>
  }

  if (reservation === null) {
    return (
      <div className={styles.page}>
        <Link to="/mis-reservas" className={styles.back}>
          ← Volver a mis reservas
        </Link>
        <p className={`${styles.feedback} ${styles.error}`} role="alert">
          {error ?? 'No se encontró la reserva.'}
        </p>
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
      label: 'Fecha y hora',
      value: `${formatDate(reservation.bookedFor)} · ${formatTime(reservation.bookedFor)}`,
    },
    { label: 'Personas', value: String(reservation.numberOfPeople) },
    { label: 'Método de pago', value: PAYMENT_METHOD_LABELS[reservation.paymentMethod] },
    { label: 'Punto de encuentro', value: '—' },
    { label: 'Itinerario', value: '—' },
    { label: 'Notas', value: reservation.notes ?? 'Sin notas' },
  ]

  async function handleRequestCancellation() {
    setIsWorking(true)
    setError(null)
    setFeedback(null)

    try {
      const updated = await reservationsApi.cancel(reservation!.id)
      setReservation(updated)
      setFeedback('Reserva cancelada.')
    } catch (cause) {
      setError(describeApiError(cause))
    } finally {
      setIsWorking(false)
    }
  }

  return (
    <div className={styles.page}>
      <Link to="/mis-reservas" className={styles.back}>
        ← Volver a mis reservas
      </Link>

      <PageHeader
        breadcrumb={[
          { label: 'Inicio', to: '/explorar' },
          { label: 'Mis reservas', to: '/mis-reservas' },
          { label: `#${code}` },
        ]}
        title={`Reserva ${code}`}
        description={`Creada el ${formatDate(reservation.bookedAt)}`}
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
                Sin foto
              </span>
              <div>
                <h2 className={styles.itemName}>
                  {entry?.name ?? 'Ítem reservado'}
                </h2>
                <p className={styles.itemMeta}>
                  {itemLabel(entry?.type ?? first?.type ?? 'ACTIVITY')}
                </p>
              </div>
            </div>
          </article>

          <article className={styles.card}>
            <h2 className={styles.cardTitle}>Información de la reserva</h2>
            <DefList items={infoItems} />
            <p className={styles.notice}>
              "Punto de encuentro" e "Itinerario" aparecen vacíos porque el
              backend todavía no los almacena.
            </p>
          </article>
        </div>

        <div className={styles.column}>
          <article className={styles.card}>
            <h2 className={styles.cardTitle}>Pago y acciones</h2>

            <div className={styles.lines}>
              <div className={styles.line}>
                <span>Subtotal</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              <div className={styles.line}>
                <span>Cargo de servicio</span>
                <span>—</span>
              </div>
              <div className={styles.totalLine}>
                <span>Total</span>
                <span>{formatCurrency(reservation.total)}</span>
              </div>
            </div>

            <div className={styles.actions}>
              <Button variant="primary" disabled>
                Modificar reserva
              </Button>
              <Button
                variant="outline"
                disabled={!canRequestCancellation || isWorking}
                onClick={() => void handleRequestCancellation()}
              >
                {isWorking ? 'Enviando…' : 'Cancelar reserva'}
              </Button>
              <p className={styles.actionsNote}>
                {canRequestCancellation
                  ? 'La prestadora o el guía confirman o rechazan desde su panel.'
                  : 'Con el estado actual ya no se puede cancelar.'}
              </p>
              <p className={styles.actionsNote}>
                "Modificar reserva" estará disponible cuando el backend exponga
                el cambio de ítems y fechas.
              </p>
            </div>
          </article>
        </div>
      </div>
    </div>
  )
}
