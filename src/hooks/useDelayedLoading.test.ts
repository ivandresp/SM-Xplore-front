import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  SKELETON_DELAY_MS,
  SKELETON_MIN_VISIBLE_MS,
  useDelayedLoading,
} from './useDelayedLoading'

function advance(ms: number) {
  act(() => {
    vi.advanceTimersByTime(ms)
  })
}

describe('useDelayedLoading', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('espera 200 ms antes de pintar y no pinta nada con una respuesta rapida', () => {
    expect(SKELETON_DELAY_MS).toBe(200)

    const { result, rerender } = renderHook(
      ({ loading }) => useDelayedLoading(loading),
      { initialProps: { loading: true } },
    )

    advance(SKELETON_DELAY_MS - 1)
    expect(result.current).toBe(false)

    // La respuesta llega a los 199 ms: el esqueleto no debe aparecer nunca.
    rerender({ loading: false })
    advance(1000)
    expect(result.current).toBe(false)
  })

  it('pinta el esqueleto cuando la carga supera el retardo', () => {
    const { result } = renderHook(() => useDelayedLoading(true))

    advance(SKELETON_DELAY_MS - 1)
    expect(result.current).toBe(false)

    advance(1)
    expect(result.current).toBe(true)

    // Mientras siga cargando, el esqueleto no parpadea.
    advance(1000)
    expect(result.current).toBe(true)
  })

  it('mantiene el esqueleto al menos 250 ms aunque la respuesta llegue justo despues', () => {
    expect(SKELETON_MIN_VISIBLE_MS).toBe(250)

    const { result, rerender } = renderHook(
      ({ loading }) => useDelayedLoading(loading),
      { initialProps: { loading: true } },
    )

    advance(SKELETON_DELAY_MS)
    expect(result.current).toBe(true)

    rerender({ loading: false })
    advance(SKELETON_MIN_VISIBLE_MS - 1)
    expect(result.current).toBe(true)

    advance(1)
    expect(result.current).toBe(false)
  })
})
