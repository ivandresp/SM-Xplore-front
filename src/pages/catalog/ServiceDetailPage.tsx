import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Button } from '@/components/Button'
import { PageHeader } from '@/components/PageHeader/PageHeader'
import { StatusBadge } from '@/components/StatusBadge/StatusBadge'
import {
  CONTENT_STATUS_LABELS,
  CONTENT_STATUS_TONES,
  serviceTypeLabel,
} from '@/config/roles'
import { servicesApi } from '@/services/servicesApi'
import { useTrackView } from '@/hooks/useTrackView'
import { describeApiError } from '@/utils/errors'
import { formatCurrency, formatDate } from '@/utils/format'
import type { ServiceResponse } from '@/types'
import styles from './catalog.module.css'

export default function ServiceDetailPage() {
  const { serviceId } = useParams<{ serviceId: string }>()
  useTrackView('SERVICE', serviceId)

  const [service, setService] = useState<ServiceResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (serviceId === undefined) {
      return
    }

    let cancelled = false

    async function load() {
      setIsLoading(true)
      setError(null)

      try {
        const found = await servicesApi.getById(serviceId as string)
        if (!cancelled) {
          setService(found)
        }
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

    void load()

    return () => {
      cancelled = true
    }
  }, [serviceId])

  if (isLoading) {
    return <p className={styles.page}>Cargando servicio…</p>
  }

  if (service === null) {
    return (
      <div className={styles.page}>
        <Link to="/servicios" className={styles.state}>
          ← Volver al catálogo
        </Link>
        <p className={`${styles.banner} ${styles.error}`} role="alert">
          {error ?? 'No se encontró el servicio.'}
        </p>
      </div>
    )
  }

  const heroPhoto = service.photosUrls[0]

  return (
    <div className={styles.page}>
      <PageHeader
        serif
        breadcrumb={[
          { label: 'Inicio', to: '/explorar' },
          { label: 'Servicios', to: '/servicios' },
          { label: service.name },
        ]}
        title={service.name}
        description={`${serviceTypeLabel(service.type)} · ${service.providerName}`}
        actions={
          <StatusBadge tone={CONTENT_STATUS_TONES[service.status]}>
            {CONTENT_STATUS_LABELS[service.status]}
          </StatusBadge>
        }
      />

      <div className={styles.detailLayout}>
        <div className={styles.column}>
          <div className={styles.hero}>
            {heroPhoto !== undefined ? (
              <img
                className={styles.photo}
                src={heroPhoto}
                alt={service.name}
              />
            ) : (
              'Sin fotos: la prestadora no cargó imágenes'
            )}
          </div>

          <section>
            <h2 className={styles.sectionTitle}>Descripción</h2>
            {service.description === '' ? (
              <p className={styles.paragraphMuted}>
                La prestadora no escribió una descripción.
              </p>
            ) : (
              <p className={styles.paragraph}>{service.description}</p>
            )}
          </section>

          <div className={styles.tiles}>
            <div className={styles.tile}>
              <span className={styles.tileLabel}>Tipo</span>
              <span className={styles.tileValue}>
                {serviceTypeLabel(service.type)}
              </span>
            </div>
            <div className={styles.tile}>
              <span className={styles.tileLabel}>Prestadora</span>
              <span className={styles.tileValue}>{service.providerName}</span>
            </div>
            <div className={styles.tile}>
              <span className={styles.tileLabel}>Capacidad</span>
              <span className={styles.tileValue}>
                {service.maxCapacity} personas
              </span>
            </div>
            <div className={styles.tile}>
              <span className={styles.tileLabel}>Publicado</span>
              <span className={styles.tileValue}>
                {formatDate(service.createdAt)}
              </span>
            </div>
          </div>

          <section>
            <h2 className={styles.sectionTitle}>Ubicación</h2>
            <div className={styles.map}>
              <strong>{service.providerName}</strong>
              <br />
              {service.latitude.toFixed(5)},{' '}
              {service.longitude.toFixed(5)}
            </div>
          </section>
        </div>

        <div className={styles.column}>
          <article className={styles.booking}>
            <p className={styles.bookingLabel}>Desde</p>
            <div className={styles.priceRow}>
              <span className={styles.priceBig}>
                {formatCurrency(service.price)}
              </span>
              <span className={styles.priceUnit}>COP / persona</span>
            </div>
            <p className={styles.paragraphMuted}>
              El API de reservas solo acepta actividades y eventos: los servicios
              se contratan directamente con la prestadora.
            </p>
          </article>

          <article className={styles.booking}>
            <h2 className={styles.sectionTitle}>Prestadora</h2>
            <p className={styles.paragraph}>{service.providerName}</p>
            <Link to={`/prestadoras/${service.providerId}`}>
              <Button variant="outline" block>
                Ver perfil de la prestadora
              </Button>
            </Link>
          </article>

          <article className={styles.booking}>
            <h2 className={styles.sectionTitle}>Reseñas</h2>
            <p className={styles.paragraphMuted}>
              Todavía no hay reseñas: el backend aún no expone el módulo de
              reseñas.
            </p>
          </article>
        </div>
      </div>
    </div>
  )
}
