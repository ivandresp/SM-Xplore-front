import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/Button'
import { PageHeader } from '@/components/PageHeader/PageHeader'
import { StatusBadge } from '@/components/StatusBadge/StatusBadge'
import { recommendationsApi } from '@/services/recommendationsApi'
import { describeApiError } from '@/utils/errors'
import type {
  RecommendationItemType,
  RecommendationResponse,
  RecommendationSource,
} from '@/types'
import styles from './recommendations.module.css'

const TYPE_META: Record<
  RecommendationItemType,
  { label: string; to: string; action: string }
> = {
  SITE: { label: 'Atractivo', to: '/atractivos', action: 'Ver atractivos' },
  ACTIVITY: { label: 'Actividad', to: '/explorar', action: 'Ver actividades' },
  EVENT: { label: 'Evento', to: '/eventos', action: 'Ver eventos' },
  SERVICE: { label: 'Servicio', to: '/servicios', action: 'Ver servicios' },
}

const SOURCE_NOTE: Record<RecommendationSource, string> = {
  FALLBACK:
    'Todavía no tenemos suficientes señales tuyas, así que mostramos lo mejor valorado del catálogo. Abre fichas y volveremos a ordenarlas para ti.',
  AFFINITY: 'Ordenado por afinidad con las categorías que has visitado.',
  QUALITY: 'Ordenado por la valoración del catálogo.',
  NEARBY: 'Ordenado por cercanía a la ubicación consultada.',
  MIXED: 'Mezcla de afinidad, valoración y cercanía.',
}

export default function RecommendationsPage() {
  const [data, setData] = useState<RecommendationResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reloadToken, setReloadToken] = useState(0)

  useEffect(() => {
    let cancelled = false

    async function run() {
      try {
        const result = await recommendationsApi.list({ limit: 12 })

        if (!cancelled) {
          setData(result)
          setError(null)
        }
      } catch (cause) {
        if (!cancelled) {
          setData(null)
          setError(describeApiError(cause))
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
  }, [reloadToken])

  function retry() {
    setIsLoading(true)
    setError(null)
    setReloadToken((current) => current + 1)
  }

  return (
    <div className={styles.page}>
      <PageHeader
        serif
        title="Recomendado para ti"
        description="Sugerencias del catálogo según lo que has visto y su valoración."
        meta={
          data === null
            ? undefined
            : `${data.items.length} ${data.items.length === 1 ? 'sugerencia' : 'sugerencias'}`
        }
      />

      {error !== null && (
        <div className={styles.state} role="alert">
          <p className={styles.stateTitle}>No pudimos cargar tus recomendaciones</p>
          <p>{error}</p>
          <Button variant="accent" onClick={retry}>
            Reintentar
          </Button>
        </div>
      )}

      {isLoading && (
        <div className={styles.cards} aria-hidden="true">
          {[0, 1, 2, 3].map((key) => (
            <div key={key} className={styles.skeleton} />
          ))}
        </div>
      )}

      {!isLoading && error === null && data !== null && data.items.length === 0 && (
        <div className={styles.state}>
          <p className={styles.stateTitle}>Aún no hay recomendaciones</p>
          <p>Explora el catálogo y vuelve: con tus primeras visitas podremos ordenarlo.</p>
          <Link className={styles.stateLink} to="/explorar">
            Explorar actividades
          </Link>
        </div>
      )}

      {!isLoading && error === null && data !== null && data.items.length > 0 && (
        <>
          <p className={styles.note}>{SOURCE_NOTE[data.source]}</p>

          <div className={styles.cards}>
            {data.items.map((item) => {
              const meta = TYPE_META[item.itemType]

              return (
                <article key={`${item.itemType}-${item.itemId}`} className={styles.card}>
                  <StatusBadge tone="info">{meta.label}</StatusBadge>
                  <h2 className={styles.cardTitle}>{item.name}</h2>
                  <p className={styles.reason}>{item.reason}</p>
                  <Link className={styles.cardLink} to={meta.to}>
                    {meta.action}
                  </Link>
                </article>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
