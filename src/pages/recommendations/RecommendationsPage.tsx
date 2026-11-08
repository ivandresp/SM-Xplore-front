import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/Button'
import { PageHeader } from '@/components/PageHeader/PageHeader'
import { Skeleton } from '@/components/Skeleton'
import { StatusBadge } from '@/components/StatusBadge/StatusBadge'
import { recommendationsApi } from '@/services/recommendationsApi'
import { categoriesApi } from '@/services/categoriesApi'
import { describeApiError } from '@/utils/errors'
import type {
  CategoryResponse,
  PreferenceResponse,
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

  const [preferences, setPreferences] = useState<PreferenceResponse[]>([])
  const [categories, setCategories] = useState<CategoryResponse[]>([])
  const [preferencesError, setPreferencesError] = useState<string | null>(null)
  const [selectedCategory, setSelectedCategory] = useState('')
  const [savingCategory, setSavingCategory] = useState<string | null>(null)

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

  useEffect(() => {
    let cancelled = false

    // Una preferencia que falla no debe tumbar las recomendaciones ni al revés.
    void Promise.allSettled([
      recommendationsApi.listPreferences(),
      categoriesApi.list(),
    ]).then(([prefs, cats]) => {
      if (cancelled) return

      if (prefs.status === 'fulfilled' && cats.status === 'fulfilled') {
        setPreferences(prefs.value)
        setCategories(cats.value)
        setPreferencesError(null)
        return
      }

      setPreferencesError(
        describeApiError(
          prefs.status === 'rejected'
            ? prefs.reason
            : cats.status === 'rejected'
              ? cats.reason
              : null,
        ),
      )
    })

    return () => {
      cancelled = true
    }
  }, [])

  async function addPreference(categoryId: string) {
    setSavingCategory(categoryId)
    setPreferencesError(null)

    try {
      const created = await recommendationsApi.addPreference(categoryId)
      setPreferences((current) => [...current.filter((p) => p.categoryId !== categoryId), created])
      setSelectedCategory('')
      setReloadToken((current) => current + 1)
    } catch (cause) {
      setPreferencesError(describeApiError(cause))
    } finally {
      setSavingCategory(null)
    }
  }

  async function removePreference(categoryId: string) {
    setSavingCategory(categoryId)
    setPreferencesError(null)

    try {
      await recommendationsApi.removePreference(categoryId)
      setPreferences((current) => current.filter((p) => p.categoryId !== categoryId))
      setReloadToken((current) => current + 1)
    } catch (cause) {
      setPreferencesError(describeApiError(cause))
    } finally {
      setSavingCategory(null)
    }
  }

  const categoryNames = new Map(categories.map((category) => [category.id, category.name]))
  const availableCategories = categories.filter(
    (category) => !preferences.some((preference) => preference.categoryId === category.id),
  )

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

      <section className={styles.prefs} aria-labelledby="prefs-title">
        <div className={styles.prefsHead}>
          <h2 id="prefs-title" className={styles.prefsTitle}>
            Tus intereses
          </h2>
          <p className={styles.prefsHint}>
            Marca las categorías que te gustan y afinamos las sugerencias.
          </p>
        </div>

        {preferences.length > 0 && (
          <ul className={styles.prefsList}>
            {preferences.map((preference) => {
              const name =
                categoryNames.get(preference.categoryId) ?? 'Categoría'

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
              onClick={() => void addPreference(selectedCategory)}
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
