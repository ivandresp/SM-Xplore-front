import { useEffect, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { Avatar } from '@/components/Avatar/Avatar'
import { Button } from '@/components/Button'
import { DefList } from '@/components/DefList/DefList'
import type { DefItem } from '@/components/DefList/DefList'
import { PageHeader } from '@/components/PageHeader/PageHeader'
import { StatusBadge } from '@/components/StatusBadge/StatusBadge'
import { serviceTypeLabel } from '@/config/roles'
import { useAuth } from '@/hooks/useAuth'
import { servicesApi } from '@/services/servicesApi'
import { usersApi } from '@/services/usersApi'
import { describeApiError } from '@/utils/errors'
import { formatCurrency, formatMonthYear } from '@/utils/format'
import type { ServiceProviderProfileResponse, ServiceResponse } from '@/types'
import styles from './profile.module.css'

export default function ProviderProfilePage() {
  const { providerId } = useParams<{ providerId: string }>()
  const { isAuthenticated } = useAuth()
  const { pathname } = useLocation()

  const [provider, setProvider] =
    useState<ServiceProviderProfileResponse | null>(null)
  const [services, setServices] = useState<ServiceResponse[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (providerId === undefined) {
      return
    }

    let cancelled = false

    async function load() {
      setIsLoading(true)
      setError(null)

      try {
        const found = await usersApi.getProviderProfile(providerId as string)
        if (cancelled) return
        setProvider(found)

        try {
          const offered = await servicesApi.list({ providerId: providerId as string })
          if (!cancelled) setServices(offered)
        } catch {
          if (!cancelled) setServices([])
        }
      } catch (cause) {
        if (!cancelled) setError(describeApiError(cause))
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [providerId])

  if (isLoading) {
    return <p className={styles.page}>Cargando perfil…</p>
  }

  if (provider === null) {
    return (
      <section className={styles.page}>
        <Link to="/explorar" className={styles.back}>
          ← Volver al catálogo
        </Link>
        <p className={`${styles.feedback} ${styles.error}`} role="alert">
          {error ?? 'No se encontró la prestadora.'}
        </p>
      </section>
    )
  }

  const location =
    provider.latitude !== null && provider.longitude !== null
      ? `${provider.latitude}, ${provider.longitude}`
      : '—'

  const contactItems: DefItem[] = [
    { label: 'Teléfono', value: provider.phone ?? '—' },
    { label: 'Correo', value: provider.email ?? '—' },
    { label: 'Horario', value: '—' },
    { label: 'Ubicación', value: location },
  ]

  // El backend oculta el contacto a las peticiones anónimas.
  const contactReserved = provider.phone === null && provider.email === null

  return (
    <section className={styles.page}>
      <PageHeader
        breadcrumb={[
          { label: 'Inicio', to: '/explorar' },
          { label: 'Prestadoras' },
          { label: provider.fullName },
        ]}
        title={provider.fullName}
      />

      <div className={styles.layout}>
        <div className={styles.column}>
          <article className={styles.card}>
            <div className={styles.headerCard}>
              <Avatar name={provider.fullName} size="lg" shape="square" />
              <div className={styles.identity}>
                <h2 className={styles.name}>{provider.fullName}</h2>
                {provider.serviceType !== null && (
                  <p className={styles.meta}>
                    {serviceTypeLabel(provider.serviceType)}
                  </p>
                )}
                {provider.startOperationDate !== null && (
                  <p className={styles.meta}>
                    Opera desde {formatMonthYear(provider.startOperationDate)}
                  </p>
                )}
                <div className={styles.chips}>
                  {provider.nit !== null && (
                    <StatusBadge tone="neutral">NIT {provider.nit}</StatusBadge>
                  )}
                  {provider.registrationStatus === 'APPROVED' ? (
                    <StatusBadge tone="success">
                      Prestadora verificada
                    </StatusBadge>
                  ) : (
                    <StatusBadge tone="warning">
                      Registro pendiente de aprobación
                    </StatusBadge>
                  )}
                </div>
              </div>
            </div>
          </article>

          <article className={styles.card}>
            <h2 className={styles.cardTitle}>Sobre la empresa</h2>
            <p className={styles.notice}>
              El backend todavía no almacena la descripción de la empresa ni sus
              especialidades.
            </p>
          </article>

          <article className={styles.card}>
            <h2 className={styles.cardTitle}>Servicios que ofrece</h2>

            {services.length === 0 ? (
              <p className={styles.empty}>
                Esta prestadora todavía no tiene servicios publicados.
              </p>
            ) : (
              services.map((service) => (
                <div key={service.id} className={styles.listRow}>
                  <span>
                    <span className={styles.listName}>{service.name}</span>
                    <span className={styles.listMeta}>
                      {serviceTypeLabel(service.type)} ·{' '}
                      {formatCurrency(service.price)}
                    </span>
                  </span>
                  <Link to={`/servicios/${service.id}`}>
                    <Button variant="outline" size="sm">
                      Ver detalle
                    </Button>
                  </Link>
                </div>
              ))
            )}
          </article>
        </div>

        <div className={styles.column}>
          <article className={styles.card}>
            <h2 className={styles.cardTitle}>Información de contacto</h2>
            <DefList items={contactItems} columns={1} />
            {contactReserved && !isAuthenticated && (
              <p className={styles.notice}>
                El teléfono y el correo solo se entregan con sesión iniciada.{' '}
                <Link to="/login" state={{ from: { pathname } }}>
                  Inicia sesión
                </Link>{' '}
                para verlos.
              </p>
            )}
          </article>

          <article className={styles.card}>
            <h2 className={styles.cardTitle}>Reseñas recientes</h2>
            <p className={styles.empty}>
              Todavía no hay reseñas que mostrar: el backend aún no expone el
              módulo de reseñas.
            </p>
          </article>
        </div>
      </div>
    </section>
  )
}
