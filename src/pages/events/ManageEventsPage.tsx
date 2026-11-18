import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ApiErrorAction } from '@/components/ApiErrorAction'
import { useApiErrorState } from '@/hooks/useApiErrorState'
import { translate as t } from '@/i18n/language'
import { useLanguage } from '@/hooks/useLanguage'
import { Button } from '@/components/Button'
import { DataTable } from '@/components/DataTable/DataTable'
import type { Column } from '@/components/DataTable/DataTable'
import { PageHeader } from '@/components/PageHeader/PageHeader'
import { StateMessage } from '@/components/StateMessage'
import { StatusBadge } from '@/components/StatusBadge/StatusBadge'
import { EVENT_STATUS_LABELS, EVENT_STATUS_TONES } from '@/config/roles'
import { useAuth } from '@/hooks/useAuth'
import { eventsApi } from '@/services/eventsApi'
import { formatCurrency, formatDateTime } from '@/utils/format'
import type { EventResponse } from '@/types'
import styles from './events.module.css'

export default function ManageEventsPage() {
  useLanguage()
  const { user } = useAuth()
  const managerId = user?.role === 'DESTINATION_MANAGER' ? user.id : undefined
  const [events, setEvents] = useState<EventResponse[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError, errorCause, setErrorFromApi] = useApiErrorState()
  const [reloadToken, setReloadToken] = useState(0)

  useEffect(() => {
    let cancelled = false

    async function run() {
      setIsLoading(true)
      setError(null)

      try {
        // La gestora ve todos sus eventos, publicados o no; el admin, los publicados.
        const page = await eventsApi.list({ managerId })
        if (!cancelled) {
          setEvents(
            [...page.content].sort(
              (a, b) =>
                new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
            ),
          )
          setError(null)
        }
      } catch (cause) {
        if (!cancelled) {
          setEvents([])
          setErrorFromApi(cause)
        }
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    void run()

    return () => {
      cancelled = true
    }
  }, [reloadToken, managerId, setError, setErrorFromApi])

  function retry() {
    setIsLoading(true)
    setError(null)
    setReloadToken((token) => token + 1)
  }

  const columns: Column<EventResponse>[] = [
    {
      header: t("Evento"),
      render: (event) => (
        <div>
          <p className={styles.title}>{event.name}</p>
          <p className={styles.meta}>
            {event.category} · {formatCurrency(event.price)}
          </p>
        </div>
      ),
    },
    {
      header: t("Fecha"),
      render: (event) => formatDateTime(event.startsAt),
    },
    {
      header: t("Aforo"),
      render: (event) => t("{0} personas", [event.maxCapacity]),
    },
    {
      header: t("Afluencia"),
      render: (event) => t("{0} esperadas", [event.expectedAttendance]),
    },
    {
      header: t("Estado"),
      render: (event) => (
        <StatusBadge tone={EVENT_STATUS_TONES[event.status]}>
          {EVENT_STATUS_LABELS[event.status]}
        </StatusBadge>
      ),
    },
    {
      header: t("Acciones"),
      align: 'right',
      render: (event) => (
        <Link to={`/app/eventos/${event.id}`}>
          <Button variant="outline" size="sm">
            {t("Gestionar")}</Button>
        </Link>
      ),
    },
  ]

  return (
    <section>
      <PageHeader
        breadcrumb={[{ label: t("Eventos") }, { label: t("Gestión") }]}
        title={t("Gestión de eventos")}
        description={t("Publica, pospone o cancela eventos y ajusta la afluencia esperada.")}
        actions={
          <Link to="/app/eventos/nuevo">
            <Button variant="accent">{t("Nuevo evento")}</Button>
          </Link>
        }
      />

      {error !== null ? (
        <StateMessage
          title={t("No se pudieron cargar los eventos")}
          description={error}
          tone="error"
          action={<ApiErrorAction error={errorCause} onRetry={retry} />}
        />
      ) : (
        <DataTable
          columns={columns}
          rows={events}
          rowKey={(event) => event.id}
          isLoading={isLoading}
          loadingMessage={t("Cargando eventos…")}
          emptyMessage={t("Todavía no hay eventos. Crea el primero con “Nuevo evento”.")}
          emptyAction={
            <Link to="/app/eventos/nuevo">
              <Button variant="accent">{t("Nuevo evento")}</Button>
            </Link>
          }
        />
      )}

    </section>
  )
}
