import { act, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthContext } from '@/context/auth-context'
import type { AuthContextValue } from '@/context/auth-context'
import { ApiError } from '@/services/httpClient'
import { clearToken, loadToken, saveToken } from '@/services/authToken'
import { ApiErrorAction } from './ApiErrorAction'

beforeEach(() => clearToken())
function setup(error: unknown, logout = vi.fn().mockResolvedValue(undefined)) {
  const retry = vi.fn()
  render(<AuthContext.Provider value={{ logout } as unknown as AuthContextValue}>
    <MemoryRouter initialEntries={['/detalle']}><Routes>
      <Route path="/detalle" element={<ApiErrorAction error={error} onRetry={retry} />} />
      <Route path="/login" element={<p>Login de nuevo</p>} />
    </Routes></MemoryRouter>
  </AuthContext.Provider>)
  return { retry, logout }
}
describe('ApiErrorAction', () => {
  it.each([401])('ends the session and opens login for HTTP %s without retrying', async status => {
    saveToken('expired-session', '2100-01-01T00:00:00Z')
    const { retry, logout } = setup(new ApiError('unauthorized', status))
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar sesión' }))
    expect(await screen.findByText('Login de nuevo')).toBeTruthy()
    expect(logout).toHaveBeenCalledTimes(1)
    expect(retry).not.toHaveBeenCalled()
    expect(loadToken()).toBeNull()
  })
  it.each([new ApiError('forbidden', 403), new ApiError('server', 500), new TypeError('Failed to fetch')])('keeps retries for other failures (%s)', error => {
    const { retry, logout } = setup(error)
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(retry).toHaveBeenCalledTimes(1)
    expect(logout).not.toHaveBeenCalled()
  })
  it('prevents double submission while logout is pending', async () => {
    let finish!: () => void
    const logout = vi.fn(() => new Promise<void>(resolve => { finish = resolve }))
    setup(new ApiError('unauthorized', 401), logout)
    const button = screen.getByRole('button', { name: 'Cerrar sesión' })
    fireEvent.click(button)
    fireEvent.click(button)
    expect((button as HTMLButtonElement).disabled).toBe(true)
    expect(logout).toHaveBeenCalledTimes(1)
    await act(async () => finish())
    expect(await screen.findByText('Login de nuevo')).toBeTruthy()
  })

  it('cleans up and returns to login if remote logout fails', async () => {
    saveToken('old-session', '2100-01-01T00:00:00Z')
    setup(new ApiError('unauthorized', 401), vi.fn().mockRejectedValue(new Error('offline')))
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar sesión' }))
    expect(await screen.findByText('Login de nuevo')).toBeTruthy()
    expect(loadToken()).toBeNull()
  })
})
