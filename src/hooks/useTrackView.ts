import { useEffect } from 'react'
import { useAuth } from './useAuth'
import { recommendationsApi } from '@/services/recommendationsApi'
import type { RecommendationItemType } from '@/types'

/**
 * Avisa a ms-05 de que el turista abrió una ficha (señal para las
 * recomendaciones). Un fallo del registro nunca afecta a la pantalla.
 */
export function useTrackView(
  itemType: RecommendationItemType,
  itemId: string | undefined,
) {
  const { user } = useAuth()
  const isTourist = user?.role === 'TOURIST'

  useEffect(() => {
    if (!isTourist || itemId === undefined) {
      return
    }

    void recommendationsApi.registerView(itemType, itemId).catch(() => {
      // Silencioso a propósito: es telemetría, no parte del flujo del usuario.
    })
  }, [isTourist, itemType, itemId])
}
