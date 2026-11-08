import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
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
import { describeApiError } from '@/utils/errors'
import { formatCurrency } from '@/utils/format'
import type { ServiceResponse } from '@/types'
import styles from './provider.module.css'

export default function MyServicesPage() {
  const { user } = useAuth()

  const [services, setServices] = useState<ServiceResponse[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
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
  }, [providerId, reloadToken])

  function retry() {
    setIsLoading(true)
    setError(null)
    setReloadToken((token) => token + 1)
  }

  const columns: Column<ServiceResponse>[] = [
    {
      header: 'Servicio',
      render: (service) => (
        <div>
          <p className={styles.names}>{service.name}</p>
          <p className={styles.meta}>
            {serviceTypeLabel(service.type)} ·{' '}
            {formatCurrency(service.price)}
          </p>
        </div>
      ),
    },
    {
      header: 'Ubicación',
      render: (service) => `${service.latitude}, ${service.longitude}`,
    },
    {
      header: 'Fotos',
      render: (service) => service.photosUrls.length,
    },
    {
      header: 'Capacidad',
      render: (service) => service.maxCapacity,
    },
    {
      header: 'Estado',
      render: (service) => (
        <StatusBadge tone={CONTENT_STATUS_TONES[service.status]}>
          {CONTENT_STATUS_LABELS[service.status]}
        </StatusBadge>
      ),
    },
    {
      header: 'Acciones',
      align: 'right',
      render: (service) => (
        <Link to={`/app/mis-servicios/${service.id}`}>
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
        breadcrumb={[{ label: 'Mis servicios' }, { label: 'Listado' }]}
        title="Mis servicios"
        description="Alojamiento, transporte y alimentación que ofreces a los turistas."
        actions={
          <Link to="/app/mis-servicios/nuevo">
            <Button variant="accent">Nuevo servicio</Button>
          </Link>
        }
      />

      {error !== null ? (
        <StateMessage
          title="No se pudieron cargar tus servicios"
          description={error}
          tone="error"
          action={<Button onClick={retry}>Reintentar</Button>}
        />
      ) : (
        <DataTable
          columns={columns}
          rows={services}
          rowKey={(service) => service.id}
          isLoading={isLoading}
          loadingMessage="Cargando tus servicios…"
          emptyMessage="Todavía no tienes servicios. Crea el primero con “Nuevo servicio”."
          emptyAction={
            <Link to="/app/mis-servicios/nuevo">
              <Button variant="accent">Nuevo servicio</Button>
            </Link>
          }
        />
      )}

      <p className={styles.notice}>
        Las fotos se añaden desde el detalle del servicio pegando su URL.
      </p>
    </section>
  )
}
