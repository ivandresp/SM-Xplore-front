import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Estados de la ubicación del navegador.
 *
 * - `idle`: todavía no se pidió.
 * - `locating`: consultando (el navegador puede tardar o mostrar su propio diálogo).
 * - `ready`: hay coordenadas listas para enviar.
 * - `denied`: la persona (o la política del navegador) negó el permiso.
 * - `unsupported`: el navegador no expone `navigator.geolocation`.
 * - `error`: permiso concedido pero sin posición (sin señal, tiempo agotado…).
 */
export type LocationStatus =
  | 'idle'
  | 'locating'
  | 'ready'
  | 'denied'
  | 'unsupported'
  | 'error'

export interface CurrentLocation {
  latitude: number
  longitude: number
}

export interface UseCurrentLocationResult {
  status: LocationStatus
  /** Coordenadas listas, o `null` mientras no haya una lectura válida. */
  location: CurrentLocation | null
  /** Lanza una consulta nueva; también sirve de reintento. */
  request: () => void
  /** Olvida la lectura y vuelve a `idle` (enviar sin ubicación). */
  clear: () => void
}

/** `GeolocationPositionError.PERMISSION_DENIED` (no existe el enum en jsdom). */
const PERMISSION_DENIED = 1

/**
 * Diez segundos: lo justo para un GPS urbano sin dejar el botón colgado para siempre.
 * `maximumAge: 0` evita reutilizar una posición vieja en un reporte de seguridad.
 */
const GEOLOCATION_TIMEOUT_MS = 10_000

const GEOLOCATION_OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  timeout: GEOLOCATION_TIMEOUT_MS,
  maximumAge: 0,
}

/**
 * Ubicación actual con estados explícitos y reintento.
 *
 * La ubicación es **opcional** en el alta de reportes (`SecurityReportRequest`
 * no la marca como obligatoria), así que ningún estado de error bloquea el envío.
 */
export function useCurrentLocation(): UseCurrentLocationResult {
  const [status, setStatus] = useState<LocationStatus>('idle')
  const [location, setLocation] = useState<CurrentLocation | null>(null)
  /** Un reintento invalida la respuesta de la consulta anterior. */
  const requestRef = useRef(0)
  /** Escape propio si el navegador no llama a ningun callback (dialogo abierto). */
  const timeoutRef = useRef<number | undefined>(undefined)

  const clearTimeoutRef = useCallback(() => {
    window.clearTimeout(timeoutRef.current)
    timeoutRef.current = undefined
  }, [])

  useEffect(
    () => () => {
      // Al desmontar, una respuesta tardía ya no debe tocar estado.
      requestRef.current += 1
      clearTimeoutRef()
    },
    [clearTimeoutRef],
  )

  const request = useCallback(() => {
    const requestId = ++requestRef.current
    const isCurrent = () => requestRef.current === requestId

    const geolocation: Geolocation | undefined =
      typeof navigator === 'undefined' ? undefined : navigator.geolocation

    // Una lectura anterior sigue siendo válida mientras se pide la nueva: solo
    // se reemplaza al resolver. Un fallo no deja el reporte sin ubicación.
    if (geolocation === undefined || geolocation === null) {
      setStatus('unsupported')
      return
    }

    setStatus('locating')
    clearTimeoutRef()
    timeoutRef.current = window.setTimeout(() => {
      if (!isCurrent()) return
      // Invalida una respuesta que llegue despues del escape.
      requestRef.current += 1
      setStatus('error')
    }, GEOLOCATION_TIMEOUT_MS)

    try {
      geolocation.getCurrentPosition(
        (position) => {
          if (!isCurrent()) return
          clearTimeoutRef()
          setLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          })
          setStatus('ready')
        },
        (error) => {
          if (!isCurrent()) return
          clearTimeoutRef()
          setStatus(error.code === PERMISSION_DENIED ? 'denied' : 'error')
        },
        GEOLOCATION_OPTIONS,
      )
    } catch {
      clearTimeoutRef()
      if (!isCurrent()) return
      setStatus('error')
    }
  }, [clearTimeoutRef])

  const clear = useCallback(() => {
    requestRef.current += 1
    clearTimeoutRef()
    setLocation(null)
    setStatus('idle')
  }, [clearTimeoutRef])

  return { status, location, request, clear }
}
