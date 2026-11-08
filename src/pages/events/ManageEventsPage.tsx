import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/Button'
import { DataTable } from '@/components/DataTable/DataTable'
import type { Column } from '@/components/DataTable/DataTable'
import { PageHeader } from '@/components/PageHeader/PageHeader'
import { StateMessage } from '@/components/StateMessage'
import { StatusBadge } from '@/components/StatusBadge/StatusBadge'
import { EVENT_STATUS_LABELS, EVENT_STATUS_TONES } from '@/config/roles'
import { eventsApi } from '@/services/eventsApi'
import { describeApiError } from '@/utils/errors'
import { formatCurrency, formatDateTime } from '@/utils/format'
import type { EventResponse } from '@/types'
import styles from './events.module.css'

export default function ManageEventsPage() {
  const [events, setEvents] = useState<EventResponse[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reloadToken, setReloadToken] = useState(0)

  useEffect(() => {
    let cancelled = false

    async function run() {
      setIsLoading(true)
      setError(null)

      try {
        const all = await eventsApi.list()
        if (!cancelled) {
          setEvents(
            [...all].sort(
              (a, b) =>
                new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
            ),
          )
          setError(null)
        }
      } catch (cause) {
        if (!cancelled) {
          setEvents([])
          setError(describeApiError(cause))
        }
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    void run()

    return () => {
      cancelled = true
    }
  }, [reloadToken])

  function retry() {
    setIsLoading(true)
    setError(null)
    setReloadToken((token) => token + 1)
  }

  const columns: Column<EventResponse>[] = [
    {
      header: 'Evento',
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
      header: 'Fecha',
      render: (event) => formatDateTime(event.startsAt),
    },
    {
      header: 'Aforo',
      render: (event) => `${event.maxCapacity} personas`,
    },
    {
      header: 'Afluencia',
      render: (event) => `${event.expectedAttendance} esperadas`,
    },
    {
      header: 'Estado',
      render: (event) => (
        <StatusBadge tone={EVENT_STATUS_TONES[event.status]}>
          {EVENT_STATUS_LABELS[event.status]}
        </StatusBadge>
      ),
    },
    {
      header: 'Acciones',
      align: 'right',
      render: (event) => (
        <Link to={`/app/eventos/${event.id}`}>
          <Button variant="outline" size="sm">
            Gestionar
          </Button>
        </Link>
      ),
    },
  ]

  return (
    <section>
      <PageHeader
        breadcrumb={[{ label: 'Eventos' }, { label: 'Gestión' }]}
        title="Gestión de eventos"
        description="Publica, pospone o cancela eventos y ajusta la afluencia esperada."
        actions={
          <Link to="/app/eventos/nuevo">
            <Button variant="accent">Nuevo evento</Button>
          </Link>
        }
      />

      {error !== null ? (
        <StateMessage
          title="No se pudieron cargar los eventos"
          description={error}
          tone="error"
          action={<Button onClick={retry}>Reintentar</Button>}
        />
      ) : (
        <DataTable
          columns={columns}
          rows={events}
          rowKey={(event) => event.id}
          isLoading={isLoading}
          loadingMessage="Cargando eventos…"
          emptyMessage="Todavía no hay eventos. Crea el primero con “Nuevo evento”."
          emptyAction={
            <Link to="/app/eventos/nuevo">
              <Button variant="accent">Nuevo evento</Button>
            </Link>
          }
        />
      )}

    </section>
  )
}
