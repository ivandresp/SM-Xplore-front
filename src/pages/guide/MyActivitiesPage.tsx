import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/Button'
import { DataTable } from '@/components/DataTable/DataTable'
import type { Column } from '@/components/DataTable/DataTable'
import { PageHeader } from '@/components/PageHeader/PageHeader'
import { StateMessage } from '@/components/StateMessage'
import { StatusBadge } from '@/components/StatusBadge/StatusBadge'
import {
  ACTIVITY_STATUS_LABELS,
  ACTIVITY_STATUS_TONES,
} from '@/config/roles'
import { useAuth } from '@/hooks/useAuth'
import { activitiesApi } from '@/services/activitiesApi'
import { describeApiError } from '@/utils/errors'
import { formatCurrency, formatDate, formatDuration } from '@/utils/format'
import type { ActivityResponse } from '@/types'
import styles from './guide.module.css'

export default function MyActivitiesPage() {
  const { user } = useAuth()

  const [activities, setActivities] = useState<ActivityResponse[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reloadToken, setReloadToken] = useState(0)

  const guideId = user?.id

  useEffect(() => {
    if (guideId === undefined) {
      return
    }

    let cancelled = false

    async function run() {
      try {
        // El backend filtra por guía y devuelve también los borradores propios.
        const mine = (await activitiesApi.list({ guideId })).content
        if (!cancelled) {
          setActivities(
            [...mine].sort(
              (a, b) =>
                new Date(a.startsAt).getTime() -
                new Date(b.startsAt).getTime(),
            ),
          )
          setError(null)
        }
      } catch (cause) {
        if (!cancelled) {
          setActivities([])
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
  }, [guideId, reloadToken])

  function retry() {
    setIsLoading(true)
    setError(null)
    setReloadToken((value) => value + 1)
  }

  const columns: Column<ActivityResponse>[] = [
    {
      header: 'Actividad',
      render: (activity) => (
        <div>
          <p className={styles.summaryValue}>{activity.name}</p>
          <p className={styles.muted}>
            {activity.category} · {formatCurrency(activity.price)}
          </p>
        </div>
      ),
    },
    {
      header: 'Duración',
      render: (activity) => formatDuration(activity.durationMinutes),
    },
    {
      header: 'Capacidad',
      render: (activity) => `${activity.maxCapacity} personas`,
    },
    {
      header: 'Primera fecha',
      render: (activity) => formatDate(activity.startsAt),
    },
    {
      header: 'Estado',
      render: (activity) => (
        <StatusBadge tone={ACTIVITY_STATUS_TONES[activity.status]}>
          {ACTIVITY_STATUS_LABELS[activity.status]}
        </StatusBadge>
      ),
    },
    {
      header: 'Acciones',
      align: 'right',
      render: (activity) => (
        <div className={styles.actions}>
          <Link to={`/app/mis-actividades/${activity.id}`}>
            <Button variant="outline" size="sm">
              Editar
            </Button>
          </Link>
          <Link to={`/app/disponibilidad?id=${activity.id}`}>
            <Button variant="outline" size="sm">
              Disponibilidad
            </Button>
          </Link>
        </div>
      ),
    },
  ]

  return (
    <section>
      <PageHeader
        breadcrumb={[{ label: 'Mis actividades' }, { label: 'Listado' }]}
        title="Mis actividades"
        actions={
          <Link to="/app/mis-actividades/nueva">
            <Button variant="accent">Nueva actividad</Button>
          </Link>
        }
      />

      {error !== null && (
        <StateMessage
          title="No se pudieron cargar tus actividades"
          description={error}
          tone="error"
          action={<Button onClick={retry}>Reintentar</Button>}
        />
      )}

      {error === null && (
        <DataTable
          columns={columns}
          rows={activities}
          rowKey={(activity) => activity.id}
          isLoading={isLoading}
          loadingMessage="Cargando tus actividades…"
          emptyMessage="Todavía no tienes actividades. Crea la primera con “Nueva actividad”."
          emptyAction={
            <Link to="/app/mis-actividades/nueva">
              <Button variant="outline" size="sm">
                Nueva actividad
              </Button>
            </Link>
          }
        />
      )}

      <p className={styles.notice}>
        Aquí ves todas tus actividades, incluidas las que aún no están
        publicadas.
      </p>
    </section>
  )
}
