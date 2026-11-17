import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMessageState } from '@/hooks/useMessageState'
import { getLocale, translate as t } from '@/i18n/language'
import { useLanguage } from '@/hooks/useLanguage'
import { Button } from '@/components/Button'
import { PageHeader } from '@/components/PageHeader/PageHeader'
import { StateMessage } from '@/components/StateMessage'
import { StatusBadge } from '@/components/StatusBadge/StatusBadge'
import { useAuth } from '@/hooks/useAuth'
import { itineraryEntryMeta, useItinerary } from '@/hooks/useItinerary'
import type { ItineraryEntry } from '@/hooks/useItinerary'
import { reservationsApi } from '@/services/reservationsApi'
import { describeApiError } from '@/utils/errors'
import { formatCurrency } from '@/utils/format'
import styles from './itinerary.module.css'

function formatTime(value: string): string {
  return new Intl.DateTimeFormat(getLocale(), {
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value))
}

function formatDay(value: string): string {
  return new Intl.DateTimeFormat(getLocale(), {
    day: 'numeric',
    month: 'short',
  }).format(new Date(value))
}

export default function ItineraryPage() {
  useLanguage()
  const { user } = useAuth()
  const navigate = useNavigate()
  const { itinerary, updateTrip, removeEntry, patchEntry } = useItinerary()

  const [isReserving, setIsReserving] = useState(false)
  const [error, setError] = useMessageState<string | null>(null)
  const [feedback, setFeedback] = useMessageState<string | null>(null)

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

      setFeedback(() => t("Reservas creadas. Puedes verlas en \"Mis reservas\"."))
    } catch (cause) {
      setError(
        () => created === 0
          ? describeApiError(cause)
          : t("{0} de {1} reservas creadas. Las demás fallaron: {2}", [created, entries.length, describeApiError(cause)]),
      )
    } finally {
      setIsReserving(false)
    }
  }

  return (
    <div className={styles.page}>
      <PageHeader
        breadcrumb={[
          { label: t("Inicio"), to: '/explorar' },
          { label: t("Mis viajes"), to: '/itinerario' },
          { label: t("Nuevo itinerario") },
        ]}
        title={t("Crear itinerario de viaje")}
        description={t("Organiza por día los servicios, actividades y eventos que quieres reservar.")}
      />

      {error !== null && (
        <StateMessage
          tone="error"
          title={t("No se pudieron crear las reservas")}
          description={error}
        />
      )}
      {feedback !== null && (
        <p className={`${styles.feedback} ${styles.success}`}>{feedback}</p>
      )}

      <div className={styles.layout}>
        <div className={styles.column}>
          <article className={styles.card}>
            <h2 className={styles.cardTitle}>{t("Datos del viaje")}</h2>

            <div className={styles.grid}>
              <label>
                <span className={styles.fieldLabel}>{t("Nombre del itinerario")}</span>
                <input
                  className={styles.control}
                  type="text"
                  placeholder={t("Ej: Fin de semana en Santa Marta")}
                  value={itinerary.name}
                  onChange={(event) =>
                    updateTrip({ name: event.target.value })
                  }
                />
              </label>

              <div className={`${styles.grid} ${styles.gridTwo}`}>
                <label>
                  <span className={styles.fieldLabel}>{t("Desde")}</span>
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
                  <span className={styles.fieldLabel}>{t("Hasta")}</span>
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
            <h2 className={styles.cardTitle}>{t("Itinerario")}</h2>

            {days.length === 0 && (
              <StateMessage
                title={t("Todavía no has agregado nada")}
                description={t("Busca actividades en el catálogo y pulsa \"Agregar al itinerario\".")}
                action={
                  <Link to="/explorar">
                    <Button variant="outline">{t("Explorar actividades")}</Button>
                  </Link>
                }
              />
            )}

            {days.map(([day, entries], index) => (
              <div key={day}>
                <h3 className={styles.dayTitle}>
                  {t("Día")}{" "}{index + 1} · {formatDay(day)}
                </h3>

                {entries.map((entry) => (
                  <div key={entry.itemId} className={styles.entry}>
                    <span className={styles.entryTime}>
                      {formatTime(entry.startsAt)}
                    </span>

                    <div className={styles.entryBody}>
                      <p className={styles.entryName}>{entry.name}</p>
                      <p className={styles.entryMeta}>{itineraryEntryMeta(entry)}</p>
                    </div>

                    <div className={styles.entrySide}>
                      {entry.reservationId === undefined ? (
                        <>
                          <StatusBadge tone="neutral">{t("Sin reservar")}</StatusBadge>
                          <Button
                            variant="warm"
                            size="sm"
                            disabled={isReserving}
                            onClick={() => void reserveEntries([entry])}
                          >
                            {t("Reservar")}</Button>
                        </>
                      ) : (
                        <>
                          <StatusBadge tone="success">{t("Reservado")}</StatusBadge>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => removeEntry(entry.itemId)}
                          >
                            {t("Quitar")}</Button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ))}

            {days.length > 0 && (
              <Link to="/explorar" className={styles.addEntry}>
                {t("+ Agregar servicio, actividad o evento")}</Link>
            )}
          </article>
        </div>

        <div className={styles.column}>
          <article className={styles.card}>
            <h2 className={styles.cardTitle}>{t("Resumen")}</h2>

            <div className={styles.summaryLines}>
              <div className={styles.summaryLine}>
                <span>{t("Duración")}</span>
                <span>
                  {estimatedDays} {estimatedDays === 1 ? t("día") : t("días")}
                </span>
              </div>
              <div className={styles.summaryLine}>
                <span>{t("Elementos")}</span>
                <span>{itinerary.entries.length}</span>
              </div>
              <div className={styles.summaryLine}>
                <span>{t("Reservados")}</span>
                <span>
                  {reserved} {" "}{t("de")}{" "}{itinerary.entries.length}
                </span>
              </div>
              <div className={styles.summaryTotal}>
                <span>{t("Total estimado")}</span>
                <span>{formatCurrency(estimatedTotal)}</span>
              </div>
            </div>

            <div className={styles.actions}>
              <Button
                variant="primary"
                onClick={() => {
                  setError(null)
                  setFeedback(() => t("Itinerario guardado en este navegador."))
                }}
              >
                {t("Guardar itinerario")}</Button>
              <Button
                variant="warm"
                disabled={pending.length === 0 || isReserving}
                onClick={() => void reserveEntries(pending)}
              >
                {isReserving ? t("Reservando…") : t("Reservar pendientes")}
              </Button>
              <p className={styles.note}>
                {pending.length === 0
                  ? t("Puedes reservar ahora o más tarde")
                  : t("Se reservan para 1 persona con pago con tarjeta.")}
              </p>
            </div>
          </article>
        </div>
      </div>
    </div>
  )
}
