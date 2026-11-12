import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/Button'
import { PageHeader } from '@/components/PageHeader/PageHeader'
import { Skeleton } from '@/components/Skeleton'
import { StatusBadge } from '@/components/StatusBadge/StatusBadge'
import { usePreferences } from '@/pages/profile/usePreferences'
import { recommendationsApi } from '@/services/recommendationsApi'
import { describeApiError, logApiError } from '@/utils/errors'
// `@/types` solo reexporta tipos (`export type *`): las constantes van por su módulo.
import {
  RECOMMENDATION_INITIAL_LIMIT,
  RECOMMENDATION_LIMIT_STEP,
  RECOMMENDATION_MAX_LIMIT,
} from '@/types/recommendation'
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

const SOURCE_LABEL: Record<RecommendationSource, string> = {
  AFFINITY: 'Afinidad',
  QUALITY: 'Valoración',
  NEARBY: 'Cercanía',
  FALLBACK: 'Catálogo',
  MIXED: 'Mezcla',
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
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null)
  // Corte con el que llegó `data`: es el que se puede volver a pedir sin fallar.
  const [loadedLimit, setLoadedLimit] = useState(RECOMMENDATION_INITIAL_LIMIT)
  const [statusMessage, setStatusMessage] = useState('')
  const [reloadToken, setReloadToken] = useState(0)
  const [selectedCategory, setSelectedCategory] = useState('')
  const resultsHeadingRef = useRef<HTMLHeadingElement>(null)

  const {
    preferences,
    categories,
    error: preferencesError,
    savingCategory,
    add,
    remove,
  } = usePreferences({ enabled: true })

  useEffect(() => {
    let cancelled = false

    async function run() {
      try {
        const result = await recommendationsApi.list({
          limit: RECOMMENDATION_INITIAL_LIMIT,
        })

        if (!cancelled) {
          setData(result)
          setLoadedLimit(RECOMMENDATION_INITIAL_LIMIT)
          setLoadMoreError(null)
          setError(null)
        }
      } catch (cause) {
        if (!cancelled) {
          // Sin esta traza el mensaje «revisa la consola» apunta a una consola vacía.
          logApiError(cause, 'recomendaciones')
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
    // Siempre desde el corte inicial: reintentar el mismo limit que el backend rechaza
    // dejaba el botón en un bucle que solo se rompía recargando.
    setIsLoading(true)
    setError(null)
    setLoadMoreError(null)
    setReloadToken((current) => current + 1)
  }

  async function loadMore() {
    if (isLoadingMore) {
      return
    }

    const nextLimit = Math.min(
      loadedLimit + RECOMMENDATION_LIMIT_STEP,
      RECOMMENDATION_MAX_LIMIT,
    )
    if (nextLimit === loadedLimit) {
      return
    }

    setIsLoadingMore(true)
    setLoadMoreError(null)

    try {
      const result = await recommendationsApi.list({ limit: nextLimit })
      setData(result)
      setLoadedLimit(nextLimit)
      setStatusMessage(
        `${result.items.length} ${result.items.length === 1 ? 'sugerencia' : 'sugerencias'} en pantalla.`,
      )

      const stillHasMore =
        result.items.length >= nextLimit && nextLimit < RECOMMENDATION_MAX_LIMIT
      if (!stillHasMore) {
        // El botón desaparece: sin esto Chrome manda el foco a <body> y el usuario de
        // teclado no puede seguir.
        resultsHeadingRef.current?.focus()
      }
    } catch (cause) {
      // La lista que ya estaba en pantalla se queda; solo se avisa y no se sube el corte.
      logApiError(cause, 'recomendaciones: ver más')
      setLoadMoreError(describeApiError(cause))
    } finally {
      setIsLoadingMore(false)
    }
  }

  async function addPreference() {
    if (selectedCategory === '') {
      return
    }

    if (await add(selectedCategory)) {
      // Sin limpiar el select, «Añadir» quedaba habilitado con una opción ya inexistente.
      setSelectedCategory('')
      setReloadToken((current) => current + 1)
    }
  }

  async function removePreference(categoryId: string) {
    if (await remove(categoryId)) {
      setReloadToken((current) => current + 1)
    }
  }

  const categoryNames = new Map(
    categories.map((category) => [category.id, category.name]),
  )
  const availableCategories = categories.filter(
    (category) =>
      !preferences.some((preference) => preference.categoryId === category.id),
  )

  const hasMore =
    data !== null &&
    data.items.length >= loadedLimit &&
    loadedLimit < RECOMMENDATION_MAX_LIMIT
  const isAtMaxLimit = loadedLimit === RECOMMENDATION_MAX_LIMIT

  return (
    <div className={styles.page}>
      <PageHeader
        serif
        title="Recomendado para ti"
        description="Sugerencias del catálogo según lo que has visto y su valoración."
      />

      <section className={styles.prefs} aria-labelledby="prefs-title">
        <div className={styles.prefsHead}>
          <h2 id="prefs-title" className={styles.prefsTitle}>
            Tus intereses
          </h2>
          <p className={styles.prefsHint}>
            Marca las categorías que te gustan y afinamos las sugerencias. También
            puedes editarlas desde tu perfil.
          </p>
        </div>

        {preferences.length > 0 && (
          <ul className={styles.prefsList}>
            {preferences.map((preference) => {
              const name = categoryNames.get(preference.categoryId) ?? 'Categoría'

              return (
                <li key={preference.categoryId}>
                  <button
                    type="button"
                    className={styles.prefChip}
                    onClick={() => void removePreference(preference.categoryId)}
                    disabled={savingCategory === preference.categoryId}
                    aria-label={`Quitar ${name}`}
                  >
                    {name}
                    <span aria-hidden="true">×</span>
                  </button>
                </li>
              )
            })}
          </ul>
        )}

        {availableCategories.length > 0 && (
          <div className={styles.prefsForm}>
            <label className={styles.prefsLabel} htmlFor="pref-category">
              Añadir categoría
            </label>
            <select
              id="pref-category"
              className={styles.select}
              value={selectedCategory}
              onChange={(event) => setSelectedCategory(event.target.value)}
            >
              <option value="">Selecciona una categoría…</option>
              {availableCategories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
            <Button
              size="sm"
              disabled={selectedCategory === '' || savingCategory !== null}
              onClick={() => void addPreference()}
            >
              Añadir
            </Button>
          </div>
        )}

        {preferencesError !== null && (
          <p className={styles.prefsError} role="alert">
            {preferencesError}
          </p>
        )}
      </section>

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
        <Skeleton variant="card" count={4} label="Cargando recomendaciones" />
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

          <h2
            ref={resultsHeadingRef}
            tabIndex={-1}
            className={styles.resultsTitle}
          >
            Sugerencias
          </h2>

          <p className={styles.summary}>
            <span className={styles.summarySource}>
              Fuente: {SOURCE_LABEL[data.source]}
            </span>
            <span>
              {`${data.items.length} ${
                data.items.length === 1 ? 'sugerencia' : 'sugerencias'
              }`}
            </span>
          </p>

          <p role="status" aria-live="polite" className={styles.srOnly}>
            {statusMessage}
          </p>

          <div className={styles.cards}>
            {data.items.map((item) => {
              const meta = TYPE_META[item.itemType]

              return (
                <article key={`${item.itemType}-${item.itemId}`} className={styles.card}>
                  <StatusBadge tone="info">{meta.label}</StatusBadge>
                  <h3 className={styles.cardTitle}>{item.name}</h3>
                  <p className={styles.reason}>{item.reason}</p>
                  <Link className={styles.cardLink} to={meta.to}>
                    {meta.action}
                  </Link>
                </article>
              )
            })}
          </div>

          <div className={styles.more}>
            {hasMore && (
              <>
                <Button
                  variant="outline"
                  onClick={() => void loadMore()}
                  aria-busy={isLoadingMore}
                >
                  {isLoadingMore ? 'Cargando…' : 'Ver más sugerencias'}
                </Button>
                <p className={styles.moreNote}>
                  El servicio no pagina ni informa un total: «Ver más» vuelve a pedir
                  el mismo ranking con un corte más amplio, hasta el máximo de{' '}
                  {RECOMMENDATION_MAX_LIMIT} sugerencias.
                </p>
              </>
            )}

            {loadMoreError !== null && (
              <p className={styles.moreError} role="alert">
                {loadMoreError}
              </p>
            )}

            {!hasMore && isAtMaxLimit && (
              <p className={styles.moreNote}>
                Estás viendo el máximo de {RECOMMENDATION_MAX_LIMIT} sugerencias que
                acepta el servicio. El servicio no informa cuántas más podría haber.
              </p>
            )}

            {!hasMore && !isAtMaxLimit && (
              <p className={styles.moreNote}>
                El servicio no informa un total. Devolvió {data.items.length} de las{' '}
                {loadedLimit} pedidas: no quedan más candidatas para tu perfil por
                ahora.
              </p>
            )}
          </div>
        </>
      )}
    </div>
  )
}
