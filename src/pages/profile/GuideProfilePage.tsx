import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Avatar } from '@/components/Avatar/Avatar'
import { Button } from '@/components/Button'
import { DefList } from '@/components/DefList/DefList'
import type { DefItem } from '@/components/DefList/DefList'
import { PageHeader } from '@/components/PageHeader/PageHeader'
import { StatusBadge } from '@/components/StatusBadge/StatusBadge'
import { activitiesApi } from '@/services/activitiesApi'
import { usersApi } from '@/services/usersApi'
import { describeApiError } from '@/utils/errors'
import { formatCurrency, formatDuration, formatMonthYear } from '@/utils/format'
import type { ActivityResponse, PublicProfile } from '@/types'
import styles from './profile.module.css'

export default function GuideProfilePage() {
  const { guideId } = useParams<{ guideId: string }>()

  const [guide, setGuide] = useState<PublicProfile | null>(null)
  const [activities, setActivities] = useState<ActivityResponse[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (guideId === undefined) {
      return
    }

    let cancelled = false

    async function load() {
      setIsLoading(true)
      setError(null)

      try {
        const found = await usersApi.getPublicProfile(guideId as string)
        if (cancelled) return
        if (found.role !== 'GUIDE') {
          setError('Esa cuenta no es un guía turístico.')
          return
        }
        setGuide(found)

        // Las actividades del guía se filtran del listado completo:
        // el backend no expone un endpoint por guía.
        try {
          const all = await activitiesApi.list()
          if (!cancelled) {
            setActivities(all.filter((activity) => activity.guideId === guideId))
          }
        } catch {
          if (!cancelled) setActivities([])
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
  }, [guideId])

  if (isLoading) {
    return <p className={styles.page}>Cargando perfil…</p>
  }

  if (guide === null) {
    return (
      <section className={styles.page}>
        <Link to="/explorar" className={styles.back}>
          ← Volver al catálogo
        </Link>
        <p className={`${styles.feedback} ${styles.error}`} role="alert">
          {error ?? 'No se encontró el guía.'}
        </p>
      </section>
    )
  }

  const profile = guide.role === 'GUIDE' ? guide.profile : null
  const details: DefItem[] = [
    {
      label: 'Licencia',
      value: profile?.license != null ? `RNT ${profile.license}` : '—',
    },
    {
      label: 'Guía desde',
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
          { label: 'Guías' },
          { label: guide.fullName },
        ]}
        title={guide.fullName}
      />

      <div className={styles.layout}>
        <div className={styles.column}>
          <article className={styles.card}>
            <div className={styles.headerCard}>
              <Avatar name={guide.fullName} size="lg" />
              <div className={styles.identity}>
                <h2 className={styles.name}>{guide.fullName}</h2>
                <p className={styles.meta}>Guía turístico</p>
                {profile?.startOperationDate != null && (
                  <p className={styles.meta}>
                    Guía desde {formatMonthYear(profile.startOperationDate)}
                  </p>
                )}
              </div>
            </div>
          </article>

          <article className={styles.card}>
            <h2 className={styles.cardTitle}>Sobre mí</h2>
            <p className={styles.notice}>
              El backend no publica la descripción, los idiomas ni las
              certificaciones adicionales del guía.
            </p>
          </article>

          <article className={styles.card}>
            <h2 className={styles.cardTitle}>Certificaciones</h2>
            {profile?.license != null ? (
              <div className={styles.listRow}>
                <span>
                  <span className={styles.listName}>RNT {profile.license}</span>
                  <span className={styles.listMeta}>tarjeta profesional</span>
                </span>
                <StatusBadge tone="success">Registrada</StatusBadge>
              </div>
            ) : (
              <p className={styles.empty}>El guía no registró su tarjeta.</p>
            )}
          </article>

          <article className={styles.card}>
            <h2 className={styles.cardTitle}>Actividades que ofrece</h2>

            {activities.length === 0 ? (
              <p className={styles.empty}>
                Este guía todavía no tiene actividades publicadas.
              </p>
            ) : (
              activities.map((activity) => (
                <div key={activity.id} className={styles.listRow}>
                  <span>
                    <span className={styles.listName}>{activity.name}</span>
                    <span className={styles.listMeta}>
                      {formatDuration(activity.durationMinutes)} ·{' '}
                      {formatCurrency(activity.price)}
                    </span>
                  </span>
                  <Link to={`/actividades/${activity.id}`}>
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
            <h2 className={styles.cardTitle}>Ficha del guía</h2>
            <DefList items={details} columns={1} />
            <p className={styles.notice}>
              El backend no expone el teléfono ni el correo del guía: el contacto
              se coordina al confirmar una reserva.
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
