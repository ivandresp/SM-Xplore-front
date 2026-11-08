import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Avatar } from '@/components/Avatar/Avatar'
import { Button } from '@/components/Button'
import { DefList } from '@/components/DefList/DefList'
import type { DefItem } from '@/components/DefList/DefList'
import { PageHeader } from '@/components/PageHeader/PageHeader'
import { Skeleton } from '@/components/Skeleton'
import { StateMessage } from '@/components/StateMessage'
import { servicesApi } from '@/services/servicesApi'
import { usersApi } from '@/services/usersApi'
import { describeApiError } from '@/utils/errors'
import { formatCurrency, formatMonthYear } from '@/utils/format'
import type { PublicProfile, ServiceResponse } from '@/types'
import styles from './profile.module.css'

export default function ProviderProfilePage() {
  const { providerId } = useParams<{ providerId: string }>()

  const [provider, setProvider] = useState<PublicProfile | null>(null)
  const [services, setServices] = useState<ServiceResponse[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reloadToken, setReloadToken] = useState(0)

  useEffect(() => {
    if (providerId === undefined) {
      return
    }

    let cancelled = false

    async function load() {
      setIsLoading(true)
      setError(null)

      try {
        const found = await usersApi.getPublicProfile(providerId as string)
        if (cancelled) return
        if (found.role !== 'SERVICE_PROVIDER') {
          setError('Esa cuenta no es una prestadora de servicios.')
          return
        }
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
  }, [providerId, reloadToken])

  function retry() {
    setIsLoading(true)
    setError(null)
    setReloadToken((value) => value + 1)
  }

  if (isLoading) {
    return (
      <div className={styles.page}>
        <Skeleton variant="text" count={6} label="Cargando perfil…" />
      </div>
    )
  }

  if (provider === null) {
    return (
      <section className={styles.page}>
        <Link to="/explorar" className={styles.back}>
          ← Volver al catálogo
        </Link>
        <StateMessage
          title="No se pudo cargar el perfil"
          description={error ?? 'No se encontró la prestadora.'}
          tone="error"
          action={<Button onClick={retry}>Reintentar</Button>}
        />
      </section>
    )
  }

  const profile =
    provider.role === 'SERVICE_PROVIDER' ? provider.profile : null
  const details: DefItem[] = [
    { label: 'NIT', value: profile?.nit ?? '—' },
    { label: 'Tipo de negocio', value: profile?.businessType ?? '—' },
    { label: 'Sitio web', value: profile?.websiteUrl ?? '—' },
    {
      label: 'Ubicación',
      value:
        profile?.latitude != null && profile?.longitude != null
          ? `${profile.latitude}, ${profile.longitude}`
          : '—',
    },
    {
      label: 'Opera desde',
      value:
        profile?.startOperationDate != null
          ? formatMonthYear(profile.startOperationDate)
          : '—',
    },
  ]

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
                {profile?.businessType != null && (
                  <p className={styles.meta}>{profile.businessType}</p>
                )}
                {profile?.startOperationDate != null && (
                  <p className={styles.meta}>
                    Opera desde {formatMonthYear(profile.startOperationDate)}
                  </p>
                )}
              </div>
            </div>
          </article>

          <article className={styles.card}>
            <h2 className={styles.cardTitle}>Sobre la empresa</h2>
            <p className={styles.notice}>
              El backend no publica la descripción de la empresa ni sus
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
            <h2 className={styles.cardTitle}>Ficha de la prestadora</h2>
            <DefList items={details} columns={1} />
            <p className={styles.notice}>
              El backend no expone el teléfono ni el correo de la prestadora: el
              contacto se coordina al confirmar una reserva.
            </p>
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
