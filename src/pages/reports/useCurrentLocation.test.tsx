import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useCurrentLocation } from './useCurrentLocation'

type SuccessCallback = (position: GeolocationPosition) => void
type FailureCallback = (error: GeolocationPositionError) => void

interface Call {
  success: SuccessCallback
  failure: FailureCallback
  options: PositionOptions | undefined
}

const POSITION = {
  coords: { latitude: 11.2404, longitude: -74.199 },
  timestamp: 0,
} as GeolocationPosition

function permissionError(code: number): GeolocationPositionError {
  return { code, message: 'fallo', PERMISSION_DENIED: 1, POSITION_UNAVAILABLE: 2, TIMEOUT: 3 }
}

/** Sustituye `navigator.geolocation` y devuelve las llamadas pendientes de resolver. */
function stubGeolocation(): Call[] {
  const calls: Call[] = []

  Object.defineProperty(navigator, 'geolocation', {
    configurable: true,
    value: {
      getCurrentPosition: vi.fn(
        (
          success: SuccessCallback,
          failure: FailureCallback,
          options?: PositionOptions,
        ) => {
          calls.push({ success, failure, options })
        },
      ),
    },
  })

  return calls
}

afterEach(() => {
  Object.defineProperty(navigator, 'geolocation', {
    configurable: true,
    value: undefined,
  })
})

describe('useCurrentLocation', () => {
  it('arranca en reposo y pasa por consultando al pedir la ubicación', () => {
    stubGeolocation()
    const { result } = renderHook(() => useCurrentLocation())

    expect(result.current.status).toBe('idle')

    act(() => result.current.request())

    expect(result.current.status).toBe('locating')
    expect(result.current.location).toBeNull()
  })

  it('queda lista con las coordenadas que devuelve el navegador', () => {
    const calls = stubGeolocation()
    const { result } = renderHook(() => useCurrentLocation())

    act(() => result.current.request())
    act(() => calls[0].success(POSITION))

    expect(result.current.status).toBe('ready')
    expect(result.current.location).toEqual({
      latitude: 11.2404,
      longitude: -74.199,
    })
  })

  it('marca permiso denegado cuando el navegador no autoriza', () => {
    const calls = stubGeolocation()
    const { result } = renderHook(() => useCurrentLocation())

    act(() => result.current.request())
    act(() => calls[0].failure(permissionError(1)))

    expect(result.current.status).toBe('denied')
    expect(result.current.location).toBeNull()
  })

  it('marca error cuando la posición no está disponible', () => {
    const calls = stubGeolocation()
    const { result } = renderHook(() => useCurrentLocation())

    act(() => result.current.request())
    act(() => calls[0].failure(permissionError(2)))

    expect(result.current.status).toBe('error')
  })

  it('marca sin soporte cuando el navegador no expone geolocation', () => {
    const { result } = renderHook(() => useCurrentLocation())

    act(() => result.current.request())

    expect(result.current.status).toBe('unsupported')
  })

  it('marca error si getCurrentPosition lanza de forma síncrona', () => {
    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: {
        getCurrentPosition: vi.fn(() => {
          throw new Error('boom')
        }),
      },
    })
    const { result } = renderHook(() => useCurrentLocation())

    act(() => result.current.request())

    expect(result.current.status).toBe('error')
  })

  it('permite reintentar después de un permiso denegado', () => {
    const calls = stubGeolocation()
    const { result } = renderHook(() => useCurrentLocation())

    act(() => result.current.request())
    act(() => calls[0].failure(permissionError(1)))
    expect(result.current.status).toBe('denied')

    act(() => result.current.request())
    expect(result.current.status).toBe('locating')

    act(() => calls[1].success(POSITION))
    expect(result.current.status).toBe('ready')
  })

  it('descarta la respuesta de una consulta anterior al reiniciar', () => {
    const calls = stubGeolocation()
    const { result } = renderHook(() => useCurrentLocation())

    act(() => result.current.request())
    act(() => result.current.request())
    act(() => calls[0].success(POSITION))

    expect(result.current.status).toBe('locating')
  })
})
