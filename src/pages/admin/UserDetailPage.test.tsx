import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import UserDetailPage from './UserDetailPage'

const GUIDE = {
  id: 'u-1',
  fullName: 'Ana Guía',
  email: 'ana@smxplore.local',
  phone: '3001234567',
  role: 'GUIDE',
  status: 'ACTIVO',
  profile: {
    dniType: 'CC',
    dniNumber: '123',
    license: 'RNT-1',
    startOperationDate: '2025-01-01',
  },
  signedUpAt: '2026-11-01T10:00:00Z',
  authVersion: 1,
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function renderDetail() {
  return render(
    <MemoryRouter initialEntries={['/app/usuarios/u-1']}>
      <Routes>
        <Route path="/app/usuarios/:userId" element={<UserDetailPage />} />
        <Route path="/app/usuarios" element={<p>Listado de usuarios</p>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('UserDetailPage', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('aplica el estado con su motivo y refresca la ficha', async () => {
    const fetchMock = vi.fn(
      async (_url: string, init?: RequestInit) => {
        if (init?.method === 'PATCH') {
          return jsonResponse(undefined, 204)
        }
        return jsonResponse(GUIDE)
      },
    )
    vi.stubGlobal('fetch', fetchMock)

    const user = userEvent.setup()
    renderDetail()

    await screen.findByRole('heading', { name: 'Ana Guía' })
    await user.click(screen.getByRole('combobox', { name: 'Nuevo estado' }))
    await user.click(screen.getByRole('option', { name: 'Bloqueado' }))
    await user.type(
      screen.getByLabelText('Motivo (opcional)'),
      'Reiterados incumplimientos',
    )
    await user.click(screen.getByRole('button', { name: 'Aplicar estado' }))

    await waitFor(() => {
      const patch = fetchMock.mock.calls.find(
        ([, init]) => init?.method === 'PATCH',
      )
      expect(patch).toBeTruthy()
      expect(String(patch?.[0])).toContain('/admin/users/u-1/status')
      expect(JSON.parse(String(patch?.[1]?.body))).toEqual({
        status: 'BLOQUEADO',
        reason: 'Reiterados incumplimientos',
      })
    })

    expect(
      await screen.findByText('Estado actualizado a bloqueado.'),
    ).toBeTruthy()
  })

  it('envía el enlace de restablecimiento sin cuerpo', async () => {
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
      if (init?.method === 'POST') return jsonResponse(undefined, 202)
      return jsonResponse(GUIDE)
    })
    vi.stubGlobal('fetch', fetchMock)

    const user = userEvent.setup()
    renderDetail()

    await screen.findByRole('heading', { name: 'Ana Guía' })
    await user.click(screen.getByRole('button', { name: 'Enviar enlace' }))

    const post = fetchMock.mock.calls.find(([, init]) => init?.method === 'POST')
    expect(String(post?.[0])).toContain('/admin/users/u-1/password-reset')
    expect(post?.[1]?.body).toBeUndefined()
    expect(
      await screen.findByText(
        'Enlace de recuperación enviado al correo del usuario.',
      ),
    ).toBeTruthy()
  })

  it('exige confirmar antes de eliminar la cuenta', async () => {
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
      if (init?.method === 'DELETE') return jsonResponse(undefined, 204)
      return jsonResponse(GUIDE)
    })
    vi.stubGlobal('fetch', fetchMock)

    const user = userEvent.setup()
    renderDetail()

    await screen.findByRole('heading', { name: 'Ana Guía' })

    const remove = screen.getByRole('button', { name: 'Eliminar cuenta' })
    expect((remove as HTMLButtonElement).disabled).toBe(true)

    await user.click(
      screen.getByLabelText('Entiendo que la cuenta no podrá recuperarse.'),
    )
    await user.click(remove)

    expect(await screen.findByText('Listado de usuarios')).toBeTruthy()
  })
})
