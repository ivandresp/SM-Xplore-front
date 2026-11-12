import { useEffect, useRef, useState } from 'react'

/**
 * Tiempo que se espera antes de pintar el esqueleto.
 *
 * 200 ms es el límite alto de la ventana 150-200 ms y además garantiza que una
 * respuesta por debajo de 200 ms nunca llegue a pintar el esqueleto.
 */
export const SKELETON_DELAY_MS = 200

/** Tiempo mínimo que el esqueleto permanece visible una vez pintado. */
export const SKELETON_MIN_VISIBLE_MS = 250

export interface DelayedLoadingOptions {
  /** Retardo antes de pintar; por defecto {@link SKELETON_DELAY_MS}. */
  delayMs?: number
  /** Permanencia mínima una vez pintado; por defecto {@link SKELETON_MIN_VISIBLE_MS}. */
  minVisibleMs?: number
}

/**
 * Convierte una carga en un esqueleto que no parpadea:
 *
 * 1. Si la respuesta llega antes del retardo, no se pinta nada (0 parpadeo).
 * 2. Si la carga dura más, el esqueleto aparece al cumplirse el retardo.
 * 3. Una vez pintado se mantiene al menos `minVisibleMs`, para que no se
 *    retire a medio shimmer y parezca un fallo.
 *
 * El paso de carga a contenido no cambia la estructura de la página: el
 * esqueleto solo se monta dentro del contenedor de resultados.
 */
export function useDelayedLoading(
  isLoading: boolean,
  {
    delayMs = SKELETON_DELAY_MS,
    minVisibleMs = SKELETON_MIN_VISIBLE_MS,
  }: DelayedLoadingOptions = {},
): boolean {
  const [visible, setVisible] = useState(false)
  /** Momento (ms) en que el esqueleto quedo pintado; `null` si nunca se pinto. */
  const shownAt = useRef<number | null>(null)

  // 1. Retardo: solo se pinta si la carga sigue en curso al vencer el temporizador.
  useEffect(() => {
    if (!isLoading || visible) return

    const timer = setTimeout(() => {
      setVisible(true)
    }, delayMs)

    return () => {
      clearTimeout(timer)
    }
  }, [isLoading, visible, delayMs])

  // 2. La marca de tiempo se toma después del commit que pinta el esqueleto:
  //    el minimo visible se cuenta desde que el usuario lo ve, no desde el estado.
  useEffect(() => {
    if (visible) shownAt.current = Date.now()
  }, [visible])

  // 3. Permanencia minima: al terminar la carga se espera lo que falte.
  useEffect(() => {
    if (isLoading || !visible) return

    const elapsed =
      shownAt.current === null ? minVisibleMs : Date.now() - shownAt.current
    const remaining = minVisibleMs - elapsed

    if (remaining <= 0) {
      shownAt.current = null
      setVisible(false)
      return
    }

    const timer = setTimeout(() => {
      shownAt.current = null
      setVisible(false)
    }, remaining)

    return () => {
      clearTimeout(timer)
    }
  }, [isLoading, visible, minVisibleMs])

  return visible
}