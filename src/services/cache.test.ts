import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  DEFAULT_TTL_MS,
  cacheSize,
  clearCache,
  dedupe,
  readCache,
  writeCache,
} from './cache'

afterEach(() => {
  clearCache()
  vi.useRealTimers()
})

describe('cache', () => {
  it('guarda y devuelve un valor dentro del TTL', () => {
    writeCache('GET /a', { id: 1 })
    expect(readCache('GET /a')).toEqual({ found: true, value: { id: 1 } })
  })

  it('no devuelve nada si la clave no existe', () => {
    expect(readCache('GET /nada')).toEqual({ found: false, value: undefined })
  })

  it('expira al pasar el TTL', () => {
    vi.useFakeTimers()
    writeCache('GET /a', 'valor', DEFAULT_TTL_MS)
    vi.advanceTimersByTime(DEFAULT_TTL_MS + 1)
    expect(readCache('GET /a').found).toBe(false)
    expect(cacheSize()).toBe(0)
  })

  it('respeta un TTL a medida', () => {
    vi.useFakeTimers()
    writeCache('GET /a', 'valor', 1000)
    vi.advanceTimersByTime(999)
    expect(readCache('GET /a').found).toBe(true)
    vi.advanceTimersByTime(2)
    expect(readCache('GET /a').found).toBe(false)
  })

  it('deduplica dos peticiones en vuelo de la misma clave', async () => {
    let calls = 0
    let release: (value: string) => void = () => undefined
    const pending = new Promise<string>((resolve) => {
      release = resolve
    })
    const load = () => {
      calls += 1
      return pending
    }

    const first = dedupe('GET /a', load)
    const second = dedupe('GET /a', load)
    release('datos')

    await expect(first).resolves.toBe('datos')
    await expect(second).resolves.toBe('datos')
    expect(calls).toBe(1)
  })

  it('no deja la clave en vuelo si la carga falla', async () => {
    await expect(
      dedupe('GET /a', () => Promise.reject(new Error('boom'))),
    ).rejects.toThrow('boom')

    let calls = 0
    await expect(
      dedupe('GET /a', async () => {
        calls += 1
        return 'ok'
      }),
    ).resolves.toBe('ok')
    expect(calls).toBe(1)
  })

  it('vacía todo al limpiar (logout o cambio de usuario)', () => {
    writeCache('GET /a', 1)
    writeCache('GET /b', 2)
    clearCache()
    expect(cacheSize()).toBe(0)
    expect(readCache('GET /a').found).toBe(false)
  })
})
