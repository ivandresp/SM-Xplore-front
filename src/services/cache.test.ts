import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  DEFAULT_TTL_MS,
  cacheGeneration,
  cacheSize,
  clearCache,
  dedupe,
  readCache,
  writeCache,
  writeCacheIfCurrent,
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

  it('no escribe una respuesta que empezó antes de limpiar (cambio de cuenta)', () => {
    const startedIn = cacheGeneration()
    clearCache()
    const written = writeCacheIfCurrent('GET /users/me', 'de A', startedIn)
    expect(written).toBe(false)
    expect(readCache('GET /users/me').found).toBe(false)
  })

  it('sí escribe si nadie limpió entre el inicio y la respuesta', () => {
    const startedIn = cacheGeneration()
    expect(writeCacheIfCurrent('GET /a', 'valor', startedIn)).toBe(true)
    expect(readCache('GET /a').value).toBe('valor')
  })

  it('limpiar en vuelo no deja colgada la clave de la petición siguiente', async () => {
    let releaseFirst: (value: string) => void = () => undefined
    let releaseSecond: (value: string) => void = () => undefined
    const first = dedupe(
      'GET /a',
      () => new Promise<string>((resolve) => (releaseFirst = resolve)),
    )

    clearCache()

    const second = dedupe(
      'GET /a',
      () => new Promise<string>((resolve) => (releaseSecond = resolve)),
    )
    releaseFirst('viejo')
    await expect(first).resolves.toBe('viejo')

    let calls = 0
    const third = dedupe('GET /a', async () => {
      calls += 1
      return 'tercero'
    })
    releaseSecond('nuevo')

    await expect(second).resolves.toBe('nuevo')
    await expect(third).resolves.toBe('nuevo')
    expect(calls).toBe(0)
  })

  it('no crece sin tope: purga expiradas y luego la más antigua', () => {
    vi.useFakeTimers()
    for (let index = 0; index < 250; index += 1) {
      writeCache(`GET /item-${index}`, index, DEFAULT_TTL_MS)
    }
    expect(cacheSize()).toBe(200)
    expect(readCache('GET /item-0').found).toBe(false)
    expect(readCache('GET /item-249').found).toBe(true)
  })

  it('refrescar una clave en el tope no desaloja a la refrescada', () => {
    for (let index = 0; index < 199; index += 1) {
      writeCache(`GET /item-${index}`, index)
    }
    writeCache('GET /item-0', 'refrescado')
    writeCache('GET /item-199', 199)
    writeCache('GET /item-200', 200)

    expect(cacheSize()).toBe(200)
    expect(readCache('GET /item-0').value).toBe('refrescado')
  })

  it('vacía todo al limpiar (logout o cambio de usuario)', () => {
    writeCache('GET /a', 1)
    writeCache('GET /b', 2)
    clearCache()
    expect(cacheSize()).toBe(0)
    expect(readCache('GET /a').found).toBe(false)
  })
})
