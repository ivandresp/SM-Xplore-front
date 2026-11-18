import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { setLanguage } from '@/i18n/language'
import { ApiError } from '@/services/httpClient'
import { useApiErrorState } from './useApiErrorState'

afterEach(() => setLanguage('es'))
describe('useApiErrorState', () => {
  it('retains the HTTP cause and translates without repeating requests', () => {
    const { result } = renderHook(() => useApiErrorState())
    const error = new ApiError('private server detail', 401)
    act(() => result.current[3](error))
    expect(result.current[2]).toBe(error)
    expect(result.current[0]).toBe('Necesitas iniciar sesión para ver esta información.')
    act(() => setLanguage('en'))
    expect(result.current[0]).toBe('You need to sign in to view this information.')
    expect(result.current[2]).toBe(error)
    act(() => result.current[1](null))
    expect(result.current[0]).toBeNull()
    expect(result.current[2]).toBeNull()
  })
  it('clears the HTTP cause when replacing it with a local validation message', () => {
    const { result } = renderHook(() => useApiErrorState())
    act(() => result.current[3](new ApiError('unauthorized', 401)))
    act(() => result.current[1]('Revisa las fechas'))
    expect(result.current[0]).toBe('Revisa las fechas')
    expect(result.current[2]).toBeNull()
  })
})
