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
import {
  ACTIVITY_STATUS_LABELS,
  ACTIVITY_STATUS_TONES,
} from '@/config/roles'
import { useAuth } from '@/hooks/useAuth'
import { activitiesApi } from '@/services/activitiesApi'
import { formatCurrency, formatDate, formatDuration } from '@/utils/format'
import type { ActivityResponse } from '@/types'
import styles from './guide.module.css'

export default function MyActivitiesPage() {
  useLanguage()
  const { user } = useAuth()

  const [activities, setActivities] = useState<ActivityResponse[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError, errorCause, setErrorFromApi] = useApiErrorState()
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
  }, [guideId, reloadToken, setError, setErrorFromApi])

  function retry() {
    setIsLoading(true)
    setError(null)
    setReloadToken((value) => value + 1)
  }

  const columns: Column<ActivityResponse>[] = [
    {
      header: t("Actividad"),
      className: styles.activityTitleColumn,
      render: (activity) => (
        <p className={styles.activityTitle}>{activity.name}</p>
      ),
    },
    {
      header: t("Categoría"),
      className: styles.activityDataColumn,
      render: (activity) => activity.category,
    },
    {
      header: t("Precio"),
      className: styles.activityDataColumn,
      render: (activity) => formatCurrency(activity.price),
    },
    {
      header: t("Duración"),
      className: styles.activityDataColumn,
      render: (activity) => formatDuration(activity.durationMinutes),
    },
    {
      header: t("Capacidad"),
      className: styles.activityDataColumn,
      render: (activity) => t("{0} personas", [activity.maxCapacity]),
    },
    {
      header: t("Primera fecha"),
      className: styles.activityDataColumn,
      render: (activity) => formatDate(activity.startsAt),
    },
    {
      header: t("Estado"),
      className: styles.activityDataColumn,
      render: (activity) => (
        <StatusBadge tone={ACTIVITY_STATUS_TONES[activity.status]}>
          {ACTIVITY_STATUS_LABELS[activity.status]}
        </StatusBadge>
      ),
    },
    {
      header: t("Acciones"),
      className: styles.activityDataColumn,
      align: 'right',
      render: (activity) => (
        <div className={styles.activityActions}>
          <Link to={`/app/mis-actividades/${activity.id}`}>
            <Button variant="outline" size="sm">
              {t("Editar")}</Button>
          </Link>
          <Link to={`/app/disponibilidad?id=${activity.id}`}>
            <Button variant="outline" size="sm">
              {t("Disponibilidad")}</Button>
          </Link>
        </div>
      ),
    },
  ]

  return (
    <section>
      <PageHeader
        breadcrumb={[{ label: t("Mis actividades") }, { label: t("Listado") }]}
        title={t("Mis actividades")}
        actions={
          <Link to="/app/mis-actividades/nueva">
            <Button variant="accent">{t("Nueva actividad")}</Button>
          </Link>
        }
      />

      {error !== null && (
        <StateMessage
          title={t("No se pudieron cargar tus actividades")}
          description={error}
          tone="error"
          action={<ApiErrorAction error={errorCause} onRetry={retry} />}
        />
      )}

      {error === null && (
        <DataTable
          columns={columns}
          rows={activities}
          rowKey={(activity) => activity.id}
          isLoading={isLoading}
          loadingMessage={t("Cargando tus actividades…")}
          emptyMessage={t("Todavía no tienes actividades. Crea la primera con “Nueva actividad”.")}
          emptyAction={
            <Link to="/app/mis-actividades/nueva">
              <Button variant="outline" size="sm">
                {t("Nueva actividad")}</Button>
            </Link>
          }
        />
      )}

      <p className={styles.notice}>
        {t("Aquí ves todas tus actividades, incluidas las que aún no están publicadas.")}</p>
    </section>
  )
}
