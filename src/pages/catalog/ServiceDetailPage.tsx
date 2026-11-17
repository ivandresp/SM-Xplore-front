import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useMessageState } from '@/hooks/useMessageState'
import { translate as t } from '@/i18n/language'
import { useLanguage } from '@/hooks/useLanguage'
import { Button } from '@/components/Button'
import { MapPreview } from '@/components/MapPreview'
import { PageHeader } from '@/components/PageHeader/PageHeader'
import { Skeleton } from '@/components/Skeleton'
import { StateMessage } from '@/components/StateMessage'
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
import serviceStyles from './serviceDetail.module.css'

/** Ajusta el viewport sin deformar los tiles y reserva espacio para atribución. */
function ServiceLocationMap({ service }: { service: ServiceResponse }) {
  const { language } = useLanguage()
  const container = useRef<HTMLDivElement>(null)
  const [dimensions, setDimensions] = useState({ width: 256, height: 256 })

  useEffect(() => {
    const element = container.current
    if (element === null) return
    const media = window.matchMedia?.('(min-width: 768px)')
    const measure = () => {
      const attribution = element.querySelector('a[href="https://www.openstreetmap.org/copyright"]')?.parentElement
      const attributionWrapper = attribution?.parentElement
      let width = 256
      let height = 256
      if (media?.matches ?? window.innerWidth >= 768) {
        const bounds = element.getBoundingClientRect()
        if (bounds.width <= 0 || bounds.height <= 0) return
        const gap = attributionWrapper
          ? Number.parseFloat(getComputedStyle(attributionWrapper).rowGap) || 8 : 8
        width = Math.max(1, Math.min(1024, Math.floor(bounds.width)))
        height = Math.max(1, Math.min(1024, Math.floor(bounds.height - (attribution?.getBoundingClientRect().height ?? 0) - gap)))
      }
      setDimensions((previous) => previous.width === width && previous.height === height ? previous : { width, height })
    }
    measure()
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure)
    observer?.observe(element)
    const attribution = element.querySelector('a[href="https://www.openstreetmap.org/copyright"]')?.parentElement
    if (attribution !== undefined && attribution !== null) observer?.observe(attribution)
    window.addEventListener('resize', measure)
    media?.addEventListener('change', measure)
    return () => {
      observer?.disconnect()
      window.removeEventListener('resize', measure)
      media?.removeEventListener('change', measure)
    }
  }, [language, dimensions.width, dimensions.height])

  return (
    <div ref={container} className={serviceStyles.mapSlot}>
      <div className={serviceStyles.mapContent}>
        <MapPreview label={service.name} latitude={service.latitude} longitude={service.longitude} width={dimensions.width} height={dimensions.height} />
      </div>
    </div>
  )
}

export default function ServiceDetailPage() {
  useLanguage()
  const { serviceId } = useParams<{ serviceId: string }>()
  useTrackView('SERVICE', serviceId)

  const [service, setService] = useState<ServiceResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useMessageState<string | null>(null)
  /** Cambia de valor para forzar una recarga (botón "Reintentar"). */
  const [reloadToken, setReloadToken] = useState(0)

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
          setError(() => describeApiError(cause))
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
  }, [serviceId, reloadToken, setError])

  function retry() {
    setIsLoading(true)
    setError(null)
    setReloadToken((current) => current + 1)
  }

  if (isLoading) {
    return (
      <div className={styles.page}>
        <Skeleton variant="text" count={6} label={t("Cargando servicio…")} />
      </div>
    )
  }

  if (service === null) {
    return (
      <div className={styles.page}>
        <Link to="/servicios" className={styles.state}>
          {t("← Volver al catálogo")}</Link>
        <StateMessage
          tone="error"
          title={t("No pudimos cargar el servicio")}
          description={error ?? t("No se encontró el servicio.")}
          action={
            <Button variant="accent" onClick={retry}>
              {t("Reintentar")}</Button>
          }
        />
      </div>
    )
  }

  const heroPhoto = service.photosUrls[0]

  return (
    <div className={styles.page}>
      <PageHeader
        serif
        breadcrumb={[
          { label: t("Inicio"), to: '/explorar' },
          { label: t("Servicios"), to: '/servicios' },
          { label: service.name },
        ]}
        title={service.name}
        actions={
          <StatusBadge tone={CONTENT_STATUS_TONES[service.status]}>
            {CONTENT_STATUS_LABELS[service.status]}
          </StatusBadge>
        }
      />

      <div className={serviceStyles.layout}>
        <div className={`${styles.hero} ${serviceStyles.hero}`}>
          {heroPhoto !== undefined ? (
            <img
              className={styles.photo}
              src={heroPhoto}
              alt={service.name}
            />
          ) : (
            t("Sin fotos: la prestadora no cargó imágenes")
          )}
        </div>

        <div className={`${styles.column} ${serviceStyles.details}`}>
          <section>
            <h2 className={styles.sectionTitle}>{t("Descripción")}</h2>
            {service.description === '' ? (
              <p className={styles.paragraphMuted}>
                {t("La prestadora no escribió una descripción.")}</p>
            ) : (
              <p className={styles.paragraph}>{service.description}</p>
            )}
          </section>

          <div className={styles.tiles}>
            <div className={styles.tile}>
              <span className={styles.tileLabel}>{t("Tipo")}</span>
              <span className={styles.tileValue}>
                {serviceTypeLabel(service.type)}
              </span>
            </div>
            <div className={styles.tile}>
              <span className={styles.tileLabel}>{t("Prestadora")}</span>
              <span className={styles.tileValue}>{service.providerName}</span>
            </div>
            <div className={styles.tile}>
              <span className={styles.tileLabel}>{t("Capacidad")}</span>
              <span className={styles.tileValue}>
                {service.maxCapacity} {" "}{t("personas")}</span>
            </div>
            <div className={styles.tile}>
              <span className={styles.tileLabel}>{t("Publicado")}</span>
              <span className={styles.tileValue}>
                {formatDate(service.createdAt)}
              </span>
            </div>
          </div>

        </div>

        <div className={serviceStyles.rail}>
          <section className={serviceStyles.location} aria-label={t("Ubicación")}>
            <h2 className={styles.sectionTitle}>{t("Ubicación")}</h2>
            <ServiceLocationMap key={service.id} service={service} />
          </section>

          <article className={`${styles.booking} ${serviceStyles.contact}`} aria-label={t("Contratar servicio")}>
            <div>
              <p className={styles.bookingLabel}>{t("Desde")}</p>
              <div className={styles.priceRow}>
                <span className={styles.priceBig}>{formatCurrency(service.price)}</span>
                <span className={styles.priceUnit}>{t("COP / persona")}</span>
              </div>
            </div>
            <p className={styles.paragraphMuted}>
              {t("Los servicios se contratan directamente con la prestadora.")}
            </p>
            <Link className={serviceStyles.contactLink} to={`/prestadoras/${service.providerId}`}>
              {t("Contactar a la prestadora")}
            </Link>
          </article>
        </div>

        <article className={`${styles.booking} ${serviceStyles.reviews}`}>
          <h2 className={styles.sectionTitle}>{t("Reseñas")}</h2>
          <p className={styles.paragraphMuted}>
            {t("Todavía no hay reseñas de este servicio.")}
          </p>
        </article>
      </div>
    </div>
  )
}
