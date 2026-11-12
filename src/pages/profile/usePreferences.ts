import { useCallback, useEffect, useState } from 'react'
import { categoriesApi } from '@/services/categoriesApi'
import { recommendationsApi } from '@/services/recommendationsApi'
import { describeApiError, logApiError } from '@/utils/errors'
import type { CategoryResponse, PreferenceResponse } from '@/types'

export interface UsePreferencesOptions {
  /**
   * ms-05 exige ROLE_TOURIST en /preferences (`SecurityConfiguration:52-54`); para el
   * resto de roles el hook no pide nada y la vista explica que son de turista.
   */
  enabled: boolean
}

export interface UsePreferencesResult {
  preferences: PreferenceResponse[]
  categories: CategoryResponse[]
  isLoading: boolean
  error: string | null
  /** Categoría con una escritura en curso; deshabilita su chip o el botón. */
  savingCategory: string | null
  add: (categoryId: string) => Promise<boolean>
  remove: (categoryId: string) => Promise<boolean>
}

/**
 * Preferencias de categoría del turista (ms-05). Lo usan /perfil y /recomendaciones:
 * la lógica vive aquí una sola vez. Pendiente moverlo a `src/hooks/` cuando ese
 * directorio se abra a este bloque.
 */
export function usePreferences({
  enabled,
}: UsePreferencesOptions): UsePreferencesResult {
  const [preferences, setPreferences] = useState<PreferenceResponse[]>([])
  const [categories, setCategories] = useState<CategoryResponse[]>([])
  const [isLoading, setIsLoading] = useState(enabled)
  const [error, setError] = useState<string | null>(null)
  const [savingCategory, setSavingCategory] = useState<string | null>(null)

  useEffect(() => {
    if (!enabled) {
      return
    }

    let cancelled = false

    // Una preferencia que falla no debe tumbar las recomendaciones ni al revés.
    void Promise.allSettled([
      recommendationsApi.listPreferences(),
      categoriesApi.list(),
    ])
      .then(([prefs, cats]) => {
        if (cancelled) {
          return
        }

        if (prefs.status === 'fulfilled') {
          setPreferences(prefs.value)
        }
        if (cats.status === 'fulfilled') {
          setCategories(cats.value)
        }

        const failure =
          prefs.status === 'rejected'
            ? prefs.reason
            : cats.status === 'rejected'
              ? cats.reason
              : null

        if (failure === null) {
          setError(null)
          return
        }

        logApiError(failure, 'preferencias')
        setError(describeApiError(failure))
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [enabled])

  const add = useCallback(async (categoryId: string): Promise<boolean> => {
    setSavingCategory(categoryId)
    setError(null)

    try {
      const created = await recommendationsApi.addPreference(categoryId)
      setPreferences((current) => [
        ...current.filter((item) => item.categoryId !== categoryId),
        created,
      ])
      return true
    } catch (cause) {
      logApiError(cause, 'preferencias: añadir')
      setError(describeApiError(cause))
      return false
    } finally {
      setSavingCategory(null)
    }
  }, [])

  const remove = useCallback(async (categoryId: string): Promise<boolean> => {
    setSavingCategory(categoryId)
    setError(null)

    try {
      await recommendationsApi.removePreference(categoryId)
      setPreferences((current) =>
        current.filter((item) => item.categoryId !== categoryId),
      )
      return true
    } catch (cause) {
      logApiError(cause, 'preferencias: quitar')
      setError(describeApiError(cause))
      return false
    } finally {
      setSavingCategory(null)
    }
  }, [])

  return {
    preferences,
    categories,
    isLoading,
    error,
    savingCategory,
    add,
    remove,
  }
}
