import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMessageState } from '@/hooks/useMessageState'
import { translate as t } from '@/i18n/language'
import { useLanguage } from '@/hooks/useLanguage'
import { Button } from '@/components/Button'
import { PageHeader } from '@/components/PageHeader/PageHeader'
import { Skeleton } from '@/components/Skeleton'
import { StatusBadge } from '@/components/StatusBadge/StatusBadge'
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
  SITE: { get label() { return t("Atractivo") }, to: '/atractivos', get action() { return t("Ver atractivos") } },
  ACTIVITY: { get label() { return t("Actividad") }, to: '/explorar', get action() { return t("Ver actividades") } },
  EVENT: { get label() { return t("Evento") }, to: '/eventos', get action() { return t("Ver eventos") } },
  SERVICE: { get label() { return t("Servicio") }, to: '/servicios', get action() { return t("Ver servicios") } },
}

const SOURCE_LABEL: Record<RecommendationSource, string> = {
  get AFFINITY() { return t("Afinidad") },
  get QUALITY() { return t("Valoración") },
  get NEARBY() { return t("Cercanía") },
  get FALLBACK() { return t("Catálogo") },
  get MIXED() { return t("Mezcla") },
}

const SOURCE_NOTE: Record<RecommendationSource, string> = {
  get FALLBACK() { return t("Todavía no tenemos suficientes señales tuyas, así que mostramos lo mejor valorado del catálogo. Abre fichas y volveremos a ordenarlas para ti.") },
  get AFFINITY() { return t("Ordenado por afinidad con las categorías que has visitado.") },
  get QUALITY() { return t("Ordenado por la valoración del catálogo.") },
  get NEARBY() { return t("Ordenado por cercanía a la ubicación consultada.") },
  get MIXED() { return t("Mezcla de afinidad, valoración y cercanía.") },
}

export default function RecommendationsPage() {
  useLanguage()
  const [data, setData] = useState<RecommendationResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [error, setError] = useMessageState<string | null>(null)
  // Fallo de una recarga o de «ver más» con tarjetas ya en pantalla: no borra la lista.
  const [inlineError, setInlineError] = useMessageState<string | null>(null)
  // Corte con el que llegó `data`: es el que se puede volver a pedir sin fallar.
  const [loadedLimit, setLoadedLimit] = useState(RECOMMENDATION_INITIAL_LIMIT)
  const [statusMessage, setStatusMessage] = useMessageState('')
  const [reloadToken, setReloadToken] = useState(0)
  const resultsHeadingRef = useRef<HTMLHeadingElement>(null)
  // El corte vigente se conserva en los reintentos sin provocar otra carga al cambiarlo.
  const loadedLimitRef = useRef(RECOMMENDATION_INITIAL_LIMIT)
  const dataRef = useRef<RecommendationResponse | null>(null)
  // Solo la última petición escribe en pantalla: una respuesta vieja de «ver más» no
  // puede pisar la recarga que la sustituyó.
  const requestSeqRef = useRef(0)

  useEffect(() => {
    let cancelled = false
    const seq = (requestSeqRef.current += 1)
    const limit = loadedLimitRef.current

    async function run() {
      try {
        const result = await recommendationsApi.list({ limit })

        if (cancelled || seq !== requestSeqRef.current) {
          return
        }

        dataRef.current = result
        setData(result)
        setInlineError(null)
        setError(null)
      } catch (cause) {
        if (cancelled || seq !== requestSeqRef.current) {
          return
        }

        // Sin esta traza el mensaje «revisa la consola» apunta a una consola vacía.
        logApiError(cause, 'recomendaciones')

        if (dataRef.current === null) {
          setError(() => describeApiError(cause))
        } else {
          // Había tarjetas en pantalla: se quedan y el aviso es inline.
          setInlineError(() => describeApiError(cause))
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
  }, [reloadToken, setError, setInlineError])

  function retry() {
    // El reintento vuelve al corte inicial: repetir el mismo limit que el backend
    // rechaza dejaba el botón en un bucle que solo se rompía recargando.
    loadedLimitRef.current = RECOMMENDATION_INITIAL_LIMIT
    setLoadedLimit(RECOMMENDATION_INITIAL_LIMIT)
    setIsLoading(true)
    setError(null)
    setInlineError(null)
    setReloadToken((current) => current + 1)
  }

  function retryInline() {
    // Recarga con el corte que hay en pantalla (loadedLimitRef): el reintento no debe
    // devolver al usuario al corte inicial y perder lo que ya tenía abierto.
    setInlineError(null)
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

    const seq = (requestSeqRef.current += 1)
    setIsLoadingMore(true)
    setInlineError(null)

    try {
      const result = await recommendationsApi.list({ limit: nextLimit })

      if (seq !== requestSeqRef.current) {
        // Una recarga más nueva ya manda: esta respuesta es del ranking anterior.
        return
      }

      dataRef.current = result
      setData(result)
      loadedLimitRef.current = nextLimit
      setLoadedLimit(nextLimit)
      setStatusMessage(
        () => t("{0} {1} en pantalla.", [result.items.length, result.items.length === 1 ? t('sugerencia') : t('sugerencias')]),
      )

      const stillHasMore =
        result.items.length >= nextLimit && nextLimit < RECOMMENDATION_MAX_LIMIT
      if (!stillHasMore) {
        // El botón desaparece: sin esto Chrome manda el foco a <body> y el usuario de
        // teclado no puede seguir.
        resultsHeadingRef.current?.focus()
      }
    } catch (cause) {
      if (seq !== requestSeqRef.current) {
        return
      }

      // La lista que ya estaba en pantalla se queda; solo se avisa y no se sube el corte.
      logApiError(cause, t("recomendaciones: ver más"))
      setInlineError(() => describeApiError(cause))
    } finally {
      setIsLoadingMore(false)
    }
  }

  const hasMore =
    data !== null &&
    data.items.length >= loadedLimit &&
    loadedLimit < RECOMMENDATION_MAX_LIMIT
  const isAtMaxLimit = loadedLimit === RECOMMENDATION_MAX_LIMIT

  return (
    <div className={styles.page}>
      <PageHeader
        serif
        title={t("Recomendado para ti")}
        description={t("Sugerencias del catálogo según lo que has visto y su valoración.")}
      />

      {error !== null && (
        <div className={styles.state} role="alert">
          <p className={styles.stateTitle}>{t("No pudimos cargar tus recomendaciones")}</p>
          <p>{error}</p>
          <Button variant="accent" onClick={retry}>
            {t("Reintentar")}</Button>
        </div>
      )}

      {!isLoading && error === null && data !== null && inlineError !== null && (
        <div className={styles.inlineError} role="alert">
          <p className={styles.inlineErrorText}>{inlineError}</p>
          <Button variant="outline" size="sm" onClick={retryInline}>
            {t("Reintentar")}</Button>
        </div>
      )}

      {isLoading && (
        <Skeleton variant="card" count={4} label={t("Cargando recomendaciones")} />
      )}

      {!isLoading && error === null && data !== null && data.items.length === 0 && (
        <div className={styles.state}>
          <p className={styles.stateTitle}>{t("Aún no hay recomendaciones")}</p>
          <p>{t("Explora el catálogo y vuelve: con tus primeras visitas podremos ordenarlo.")}</p>
          <Link className={styles.stateLink} to="/explorar">
            {t("Explorar actividades")}</Link>
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
            {t("Sugerencias")}</h2>

          <p className={styles.summary}>
            <span className={styles.summarySource}>
              {t("Fuente:")}{" "}{SOURCE_LABEL[data.source]}
            </span>
            <span>
              {`${data.items.length} ${
                data.items.length === 1 ? t("sugerencia") : t("sugerencias")
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
                  {isLoadingMore ? t("Cargando…") : t("Ver más sugerencias")}
                </Button>
                <p className={styles.moreNote}>
                  {t("El servicio no pagina ni informa un total: «Ver más» vuelve a pedir el mismo ranking con un corte más amplio, hasta el máximo de")}{' '}
                  {RECOMMENDATION_MAX_LIMIT} {" "}{t("sugerencias.")}</p>
              </>
            )}

            {!hasMore && isAtMaxLimit && (
              <p className={styles.moreNote}>
                {t("Estás viendo el máximo de")}{" "}{RECOMMENDATION_MAX_LIMIT} {" "}{t("sugerencias que acepta el servicio. El servicio no informa cuántas más podría haber.")}</p>
            )}

            {!hasMore && !isAtMaxLimit && (
              <p className={styles.moreNote}>
                {t("El servicio no informa un total. Devolvió")}{" "}{data.items.length} {" "}{t("de las")}{' '}
                {loadedLimit} {" "}{t("pedidas: no quedan más candidatas para tu perfil por ahora.")}</p>
            )}
          </div>
        </>
      )}
    </div>
  )
}
