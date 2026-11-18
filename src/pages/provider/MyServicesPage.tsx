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
  CONTENT_STATUS_LABELS,
  CONTENT_STATUS_TONES,
  serviceTypeLabel,
} from '@/config/roles'
import { useAuth } from '@/hooks/useAuth'
import { servicesApi } from '@/services/servicesApi'
import { formatCurrency } from '@/utils/format'
import type { ServiceResponse } from '@/types'
import styles from './provider.module.css'

export default function MyServicesPage() {
  useLanguage()
  const { user } = useAuth()

  const [services, setServices] = useState<ServiceResponse[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError, errorCause, setErrorFromApi] = useApiErrorState()
  const [reloadToken, setReloadToken] = useState(0)

  const providerId = user?.id

  useEffect(() => {
    if (providerId === undefined) {
      return
    }

    let cancelled = false

    async function run() {
      setIsLoading(true)
      setError(null)

      try {
        const mine = await servicesApi
          .list({ providerId: providerId as string })
          .then((page) => page.content)
        if (!cancelled) {
          setServices(mine)
          setError(null)
        }
      } catch (cause) {
        if (!cancelled) {
          setServices([])
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
  }, [providerId, reloadToken, setError, setErrorFromApi])

  function retry() {
    setIsLoading(true)
    setError(null)
    setReloadToken((token) => token + 1)
  }

  const columns: Column<ServiceResponse>[] = [
    {
      header: t("Servicio"),
      className: styles.serviceTitleColumn,
      render: (service) => (
        <p className={styles.serviceTitle}>{service.name}</p>
      ),
    },
    {
      header: t("Tipo de servicio"),
      className: styles.serviceDataColumn,
      render: (service) => serviceTypeLabel(service.type),
    },
    {
      header: t("Precio por persona"),
      className: styles.serviceDataColumn,
      render: (service) => formatCurrency(service.price),
    },
    {
      header: t("Ubicación"),
      className: styles.serviceDataColumn,
      render: (service) => `${service.latitude}, ${service.longitude}`,
    },
    {
      header: t("Fotos"),
      className: styles.serviceDataColumn,
      render: (service) => service.photosUrls.length,
    },
    {
      header: t("Capacidad"),
      className: styles.serviceDataColumn,
      render: (service) => service.maxCapacity,
    },
    {
      header: t("Estado"),
      className: styles.serviceDataColumn,
      render: (service) => (
        <StatusBadge tone={CONTENT_STATUS_TONES[service.status]}>
          {CONTENT_STATUS_LABELS[service.status]}
        </StatusBadge>
      ),
    },
    {
      header: t("Acciones"),
      className: styles.serviceDataColumn,
      align: 'right',
      render: (service) => (
        <Link to={`/app/mis-servicios/${service.id}`}>
          <Button variant="outline" size="sm">
            {t("Gestionar")}</Button>
        </Link>
      ),
    },
  ]

  return (
    <section>
      <PageHeader
        breadcrumb={[{ label: t("Mis servicios") }, { label: t("Listado") }]}
        title={t("Mis servicios")}
        description={t("Alojamiento, transporte y alimentación que ofreces a los turistas.")}
        actions={
          <Link to="/app/mis-servicios/nuevo">
            <Button variant="accent">{t("Nuevo servicio")}</Button>
          </Link>
        }
      />

      {error !== null ? (
        <StateMessage
          title={t("No se pudieron cargar tus servicios")}
          description={error}
          tone="error"
          action={<ApiErrorAction error={errorCause} onRetry={retry} />}
        />
      ) : (
        <DataTable
          columns={columns}
          rows={services}
          rowKey={(service) => service.id}
          isLoading={isLoading}
          loadingMessage={t("Cargando tus servicios…")}
          emptyMessage={t("Todavía no tienes servicios. Crea el primero con “Nuevo servicio”.")}
          emptyAction={
            <Link to="/app/mis-servicios/nuevo">
              <Button variant="accent">{t("Nuevo servicio")}</Button>
            </Link>
          }
        />
      )}

      <p className={styles.notice}>
        {t("Las fotos se añaden desde el detalle del servicio pegando su URL.")}</p>
    </section>
  )
}
