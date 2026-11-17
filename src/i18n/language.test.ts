import { afterEach, describe, expect, it, vi } from 'vitest'
import { getLanguage, getLocale, setLanguage, subscribeLanguage, translate } from './language'

afterEach(() => {
  setLanguage('es')
  localStorage.clear()
  vi.restoreAllMocks()
})

describe('language', () => {
  it('switches language, persists it and announces document language without a reload', () => {
    const listener = vi.fn()
    const unsubscribe = subscribeLanguage(listener)
    setLanguage('en')
    expect(getLanguage()).toBe('en')
    expect(getLocale()).toBe('en-US')
    expect(document.documentElement.lang).toBe('en')
    expect(localStorage.getItem('sm-xplore:language')).toBe('en')
    expect(listener).toHaveBeenCalledTimes(1)
    setLanguage('en')
    expect(listener).toHaveBeenCalledTimes(1)
    unsubscribe()
  })

  it('translates interface messages and preserves interpolated content', () => {
    expect(translate('Iniciar sesión')).toBe('Iniciar sesión')
    setLanguage('en')
    expect(translate('Iniciar sesión')).toBe('Sign in')
    expect(translate('Actividad · {0}', ['Paseo por Santa Marta'])).toBe('Activity · Paseo por Santa Marta')
    expect(translate('Nombre de un lugar sin traducción')).toBe('Nombre de un lugar sin traducción')
  })

  it('works when storage is blocked', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked') })
    expect(() => setLanguage('en')).not.toThrow()
    expect(getLanguage()).toBe('en')
  })
})
