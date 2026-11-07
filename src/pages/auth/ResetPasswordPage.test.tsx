import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import ResetPasswordPage from './ResetPasswordPage'

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/reset-password" element={<ResetPasswordPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('ResetPasswordPage', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('envía el token del enlace y la contraseña nueva', async () => {
    const fetchMock = vi.fn(
      async (_input: RequestInfo | URL, _init?: RequestInit) =>
        new Response(null, { status: 204 }),
    )
    vi.stubGlobal('fetch', fetchMock)

    const user = userEvent.setup()
    renderAt('/reset-password?token=abc-123')

    await user.type(screen.getByLabelText('Nueva contraseña'), 'clave-segura-1')
    await user.type(screen.getByLabelText('Confirmar contraseña'), 'clave-segura-1')
    await user.click(screen.getByRole('button', { name: 'Guardar contraseña' }))

    expect(
      await screen.findByRole('heading', { name: 'Contraseña actualizada' }),
    ).toBeTruthy()

    const [url, init] = fetchMock.mock.calls[0]
    expect(String(url)).toBe('/api/v1/auth/reset-password')
    expect(init?.body).toBe(
      JSON.stringify({ token: 'abc-123', newPassword: 'clave-segura-1' }),
    )
  })

  it('no deja guardar si las contraseñas no coinciden', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    const user = userEvent.setup()
    renderAt('/reset-password?token=abc-123')

    await user.type(screen.getByLabelText('Nueva contraseña'), 'clave-segura-1')
    await user.type(screen.getByLabelText('Confirmar contraseña'), 'otra-clave-1')
    await user.click(screen.getByRole('button', { name: 'Guardar contraseña' }))

    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toContain('no coinciden')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('avisa cuando el enlace no trae token', () => {
    renderAt('/reset-password')

    expect(
      screen.getByRole('heading', { name: 'Enlace no válido' }),
    ).toBeTruthy()
  })
})
