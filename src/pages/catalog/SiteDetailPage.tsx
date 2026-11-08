import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ActivityCard } from '@/components/ActivityCard/ActivityCard'
import { Button } from '@/components/Button'
import { PageHeader } from '@/components/PageHeader/PageHeader'
import { Skeleton } from '@/components/Skeleton'
import { StateMessage } from '@/components/StateMessage'
import { activitiesApi } from '@/services/activitiesApi'
import { eventsApi } from '@/services/eventsApi'
import { sitesApi } from '@/services/sitesApi'
import { useTrackView } from '@/hooks/useTrackView'
import { zonesApi } from '@/services/zonesApi'
import { describeApiError } from '@/utils/errors'
import { formatCurrency, formatDate } from '@/utils/format'
import type { ActivityResponse, EventResponse, Site, Zone } from '@/types'
import styles from './catalog.module.css'

function formatTime(value: string): string {
  return new Intl.DateTimeFormat('es-CO', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value))
}

/** Ficha pública de un atractivo con sus actividades y eventos. Sin mockup: patrón de actividad. */
export default function SiteDetailPage() {
  const { siteId } = useParams<{ siteId: string }>()
  useTrackView('SITE', siteId)

  const [site, setSite] = useState<Site | null>(null)
  const [zone, setZone] = useState<Zone | null>(null)
  const [activities, setActivities] = useState<ActivityResponse[]>([])
  const [events, setEvents] = useState<EventResponse[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  /** Cambia de valor para forzar una recarga (botón "Reintentar"). */
  const [reloadToken, setReloadToken] = useState(0)

  useEffect(() => {
    if (siteId === undefined) {
      return
    }

    let cancelled = false

    async function load() {
      setIsLoading(true)
      setError(null)

      try {
        const found = await sitesApi.getById(siteId as string)
        if (cancelled) return

        setSite(found)

        const [zonesResult, activitiesResult, eventsResult] =
          await Promise.allSettled([
            zonesApi.list(),
            activitiesApi.listBySite(found.id),
            eventsApi.listBySite(found.id),
          ])

        if (cancelled) return

        if (zonesResult.status === 'fulfilled') {
          setZone(
            zonesResult.value.find((item) => item.id === found.zoneId) ?? null,
          )
        }

        if (activitiesResult.status === 'fulfilled') {
          setActivities(
            activitiesResult.value.filter(
              (activity) => activity.status === 'PUBLISHED',
            ),
          )
        }

        if (eventsResult.status === 'fulfilled') {
          setEvents(
            eventsResult.value.filter((event) => event.status === 'PUBLISHED'),
          )
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
  }, [siteId, reloadToken])

  function retry() {
    setIsLoading(true)
    setError(null)
    setReloadToken((current) => current + 1)
  }

  if (isLoading) {
    return (
      <div className={styles.page}>
        <Skeleton variant="text" count={6} label="Cargando atractivo…" />
      </div>
    )
  }

  if (site === null) {
    return (
      <div className={styles.page}>
        <Link to="/atractivos" className={styles.state}>
          ← Volver a atractivos
        </Link>
        <StateMessage
          tone="error"
          title="No pudimos cargar el atractivo"
          description={error ?? 'No se encontró el atractivo.'}
          action={
            <Button variant="accent" onClick={retry}>
              Reintentar
            </Button>
          }
        />
      </div>
    )
  }

  const heroPhoto = site.photoUrls[0]

  return (
    <div className={styles.page}>
      <PageHeader
        serif
        breadcrumb={[
          { label: 'Inicio', to: '/explorar' },
          { label: 'Atractivos', to: '/atractivos' },
          { label: site.name },
        ]}
        title={site.name}
        description={
          zone !== null
            ? `Zona: ${zone.name}`
            : 'Atractivo turístico de Santa Marta'
        }
      />

      <div className={styles.detailLayout}>
        <div className={styles.column}>
          <div className={styles.hero}>
            {heroPhoto !== undefined ? (
              <img className={styles.photo} src={heroPhoto} alt={site.name} />
            ) : (
              'Sin fotos: la gestora no cargó imágenes'
            )}
          </div>

          <div className={styles.tiles}>
            <div className={styles.tile}>
              <span className={styles.tileLabel}>Zona</span>
              <span className={styles.tileValue}>
                {zone?.name ?? 'Sin zona publicada'}
              </span>
            </div>
            <div className={styles.tile}>
              <span className={styles.tileLabel}>Latitud</span>
              <span className={styles.tileValue}>
                {site.latitude.toFixed(5)}
              </span>
            </div>
            <div className={styles.tile}>
              <span className={styles.tileLabel}>Longitud</span>
              <span className={styles.tileValue}>
                {site.longitude.toFixed(5)}
              </span>
            </div>
          </div>

          <section>
            <h2 className={styles.sectionTitle}>Ubicación</h2>
            <div className={styles.map}>
              <strong>{site.name}</strong>
              <br />
              {zone !== null ? `${zone.name} · ` : ''}
              {site.latitude.toFixed(5)}, {site.longitude.toFixed(5)}
            </div>
          </section>

          <section>
            <h2 className={styles.sectionTitle}>
              Actividades en este atractivo
            </h2>
            {activities.length === 0 ? (
              <p className={styles.paragraphMuted}>
                No hay actividades publicadas en este atractivo.
              </p>
            ) : (
              <div className={styles.cards}>
                {activities.map((activity) => (
                  <ActivityCard key={activity.id} activity={activity} />
                ))}
              </div>
            )}
          </section>
        </div>

        <div className={styles.column}>
          <article className={styles.booking}>
            <h2 className={styles.sectionTitle}>Eventos en este atractivo</h2>

            {events.length === 0 ? (
              <p className={styles.paragraphMuted}>
                No hay eventos publicados en este atractivo.
              </p>
            ) : (
              [...events]
                .sort(
                  (a, b) =>
                    new Date(a.startsAt).getTime() -
                    new Date(b.startsAt).getTime(),
                )
                .map((event) => (
                  <div key={event.id} className={styles.line}>
                    <span>
                      <strong>{event.name}</strong>
                      <br />
                      {formatDate(event.startsAt)} · {formatTime(event.startsAt)}{' '}
                      ·{' '}
                      {event.price === 0
                        ? 'Gratis'
                        : formatCurrency(event.price)}
                    </span>
                    <Link to={`/eventos/${event.id}`}>
                      <Button variant="outline" size="sm">
                        Ver
                      </Button>
                    </Link>
                  </div>
                ))
            )}
          </article>

          <article className={styles.booking}>
            <h2 className={styles.sectionTitle}>¿Cómo llegar?</h2>
            <p className={styles.paragraphMuted}>
              Abre estas coordenadas en tu aplicación de mapas preferida.
            </p>
          </article>
        </div>
      </div>
    </div>
  )
}
