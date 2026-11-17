import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { setLanguage, translate as t } from '@/i18n/language'
import { useMessageState } from './useMessageState'

afterEach(() => setLanguage('es'))

describe('useMessageState', () => {
  it('updates an existing notice in both directions without repeating the action', () => {
    const { result } = renderHook(() => useMessageState<string | null>(null))
    act(() => result.current[1](() => t('Perfil actualizado.')))
    expect(result.current[0]).toBe('Perfil actualizado.')
    act(() => setLanguage('en'))
    expect(result.current[0]).toBe('Profile updated.')
    act(() => setLanguage('es'))
    expect(result.current[0]).toBe('Perfil actualizado.')
  })

  it('keeps field errors reactive when a touched field is removed', () => {
    const { result } = renderHook(() => useMessageState<Record<string, string | undefined>>({}))
    act(() => result.current[1](() => ({ email: t('Revisa este campo.'), phone: t('Escribe tu teléfono.') })))
    act(() => result.current[1]((current) => ({ ...current, email: undefined })))
    act(() => setLanguage('en'))
    expect(result.current[0].email).toBeUndefined()
    expect(result.current[0].phone).toBe('Enter your phone number.')
  })
})
