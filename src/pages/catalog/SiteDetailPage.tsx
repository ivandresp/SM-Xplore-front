import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useMessageState } from '@/hooks/useMessageState'
import { getLocale, translate as t } from '@/i18n/language'
import { useLanguage } from '@/hooks/useLanguage'
import { ActivityCard } from '@/components/ActivityCard/ActivityCard'
import { Button } from '@/components/Button'
import { Field } from '@/components/FormField'
import { MapPreview } from '@/components/MapPreview'
import { PageHeader } from '@/components/PageHeader/PageHeader'
import { SitePhotoGallery } from '@/components/SitePhotoGallery'
import { Skeleton } from '@/components/Skeleton'
import { StateMessage } from '@/components/StateMessage'
import { activitiesApi } from '@/services/activitiesApi'
import { eventsApi } from '@/services/eventsApi'
import { sitesApi } from '@/services/sitesApi'
import { useItinerary } from '@/hooks/useItinerary'
import { useTrackView } from '@/hooks/useTrackView'
import { zonesApi } from '@/services/zonesApi'
import { describeApiError } from '@/utils/errors'
import { formatCurrency, formatDate } from '@/utils/format'
import type { ActivityResponse, EventResponse, Site, Zone } from '@/types'
import styles from './catalog.module.css'
import siteStyles from './siteDetail.module.css'

function formatTime(value: string): string {
  return new Intl.DateTimeFormat(getLocale(), {
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value))
}

/** El mapa conserva su proyección usando el ancho real de su columna. */
function SiteLocationMap({ site }: { site: Site }) {
  const container = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState(256)

  useEffect(() => {
    const element = container.current
    if (element === null) return
    const measure = () => {
      const width = Math.floor(element.getBoundingClientRect().width)
      if (width > 0) setSize(Math.min(512, width))
    }
    measure()
    if (typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  return <div ref={container}><MapPreview label={site.name} latitude={site.latitude} longitude={site.longitude} size={size} /></div>
}

/** Ficha pública de un atractivo con sus actividades y eventos. Sin mockup: patrón de actividad. */
export default function SiteDetailPage() {
  useLanguage()
  const { siteId } = useParams<{ siteId: string }>()
  useTrackView('SITE', siteId)

  const { itinerary, addEntry, removeEntry } = useItinerary()
  const [visitDate, setVisitDate] = useState('')

  const [site, setSite] = useState<Site | null>(null)
  const [zone, setZone] = useState<Zone | null>(null)
  const [activities, setActivities] = useState<ActivityResponse[]>([])
  const [events, setEvents] = useState<EventResponse[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useMessageState<string | null>(null)
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
        if (!cancelled) setError(() => describeApiError(cause))
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [siteId, reloadToken, setError])

  function retry() {
    setIsLoading(true)
    setError(null)
    setReloadToken((current) => current + 1)
  }

  if (isLoading) {
    return (
      <div className={styles.page}>
        <Skeleton variant="text" count={6} label={t("Cargando atractivo…")} />
      </div>
    )
  }

  if (site === null) {
    return (
      <div className={styles.page}>
        <Link to="/atractivos" className={styles.state}>
          {t("← Volver a atractivos")}</Link>
        <StateMessage
          tone="error"
          title={t("No pudimos cargar el atractivo")}
          description={error ?? t("No se encontró el atractivo.")}
          action={
            <Button variant="accent" onClick={retry}>
              {t("Reintentar")}</Button>
          }
        />
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <PageHeader
        serif
        breadcrumb={[
          { label: t("Inicio"), to: '/explorar' },
          { label: t("Atractivos"), to: '/atractivos' },
          { label: site.name },
        ]}
        title={site.name}
      />

      <div className={siteStyles.mediaGrid}>
        <div className={`${styles.column} ${siteStyles.column}`}>
          <SitePhotoGallery key={site.id} name={site.name} photos={site.photoUrls} />
          <div className={styles.tiles}>
            <div className={styles.tile}>
              <span className={styles.tileLabel}>{t("Zona")}</span>
              <span className={styles.tileValue}>
                {zone?.name ?? t("Sin zona publicada")}
              </span>
            </div>
          </div>

          <section>
            <h2 className={styles.sectionTitle}>
              {t("Actividades en este atractivo")}</h2>
            {activities.length === 0 ? (
              <p className={styles.paragraphMuted}>
                {t("No hay actividades publicadas en este atractivo.")}</p>
            ) : (
              <div className={styles.cards}>
                {activities.map((activity) => (
                  <ActivityCard key={activity.id} activity={activity} />
                ))}
              </div>
            )}
          </section>
        </div>

        <div className={`${styles.column} ${siteStyles.column}`}>
          <section className={siteStyles.location} aria-label={t("Ubicación")}>
            <h2 className={styles.sectionTitle}>{t("Ubicación")}</h2>
            <SiteLocationMap site={site} />
          </section>
          <article className={styles.booking}>
            <h2 className={styles.sectionTitle}>{t("Planificar visita")}</h2>
            {itinerary.entries.some(entry => entry.type === 'SITE' && entry.itemId === site.id) ? (
              <>
                <Link to="/itinerario">{t("Ver itinerario")}</Link>
                <Button variant="outline" block onClick={() => removeEntry(site.id)}>{t("Quitar del itinerario")}</Button>
              </>
            ) : (
              <form className={siteStyles.visitForm} onSubmit={event => {
                event.preventDefault()
                addEntry({ itemId: site.id, type: 'SITE', name: site.name, startsAt: `${visitDate}T12:00:00`, price: 0 })
              }}>
                <Field label={t("Fecha de visita")} type="date" required value={visitDate}
                  min={itinerary.from || undefined} max={itinerary.to || undefined}
                  onChange={event => setVisitDate(event.target.value)} />
                <Button type="submit" block>{t("Agregar al itinerario")}</Button>
              </form>
            )}
          </article>
          <article className={styles.booking}>
            <h2 className={styles.sectionTitle}>{t("¿Cómo llegar?")}</h2>
            <dl className={siteStyles.coordinates}>
              <div className={siteStyles.coordinate}>
                <dt>{t("Latitud")}</dt><dd>{site.latitude.toFixed(5)}</dd>
              </div>
              <div className={siteStyles.coordinate}>
                <dt>{t("Longitud")}</dt><dd>{site.longitude.toFixed(5)}</dd>
              </div>
            </dl>
            <p className={styles.paragraphMuted}>
              {t("Abre estas coordenadas en tu aplicación de mapas preferida.")}</p>
          </article>
          <article className={styles.booking}>
            <h2 className={styles.sectionTitle}>{t("Eventos en este atractivo")}</h2>

            {events.length === 0 ? (
              <p className={styles.paragraphMuted}>
                {t("No hay eventos publicados en este atractivo.")}</p>
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
                        ? t("Gratis")
                        : formatCurrency(event.price)}
                    </span>
                    <Link to={`/eventos/${event.id}`}>
                      <Button variant="outline" size="sm">
                        {t("Ver")}</Button>
                    </Link>
                  </div>
                ))
            )}
          </article>
        </div>
      </div>
    </div>
  )
}
