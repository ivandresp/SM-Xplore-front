import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider } from '@/context/AuthProvider'
import LoginPage from './LoginPage'

const USER = {
  id: 'u-1',
  fullName: 'Laura Mora',
  email: 'laura@correo.com',
  phone: '3001234567',
  role: 'TOURIST',
  status: 'ACTIVO',
  profile: null,
  signedUpAt: '2026-11-01T10:00:00Z',
  authVersion: 1,
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function renderLogin() {
  return render(
    <AuthProvider>
      <MemoryRouter initialEntries={['/login']}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/explorar" element={<p>Catálogo de actividades</p>} />
          <Route path="/app" element={<p>Panel</p>} />
        </Routes>
      </MemoryRouter>
    </AuthProvider>,
  )
}

describe('LoginPage', () => {
  afterEach(() => {
    window.sessionStorage.clear()
    vi.unstubAllGlobals()
  })

  it('pide el código de MFA y entra al catálogo al verificarlo', async () => {
    const fetchMock = vi.fn(
      async (input: RequestInfo | URL, init?: RequestInit) => {
        void init
        const url = String(input)

      if (url.endsWith('/auth/login')) {
        return jsonResponse({
          accessToken: null,
          tokenType: null,
          expiresInSeconds: 300,
          expiresAt: '2026-11-07T12:05:00Z',
          mfaRequired: true,
          mfaChallengeToken: 'challenge-1',
        })
      }

      if (url.endsWith('/auth/mfa/verify')) {
        return jsonResponse({
          accessToken: 'jwt-1',
          tokenType: 'Bearer',
          expiresInSeconds: 3600,
          expiresAt: '2100-01-01T00:00:00Z',
          mfaRequired: false,
          mfaChallengeToken: null,
        })
      }

      if (url.endsWith('/users/me')) {
        return jsonResponse(USER)
      }

      return jsonResponse({ code: 'NOT_FOUND' }, 404)
    })
    vi.stubGlobal('fetch', fetchMock)

    const user = userEvent.setup()
    renderLogin()

    await user.type(screen.getByLabelText('Correo electrónico'), 'laura@correo.com')
    await user.type(screen.getByLabelText('Contraseña'), 'secreta123456')
    await user.click(screen.getByRole('button', { name: 'Iniciar sesión' }))

    expect(
      await screen.findByRole('heading', { name: 'Verificación en dos pasos' }),
    ).toBeTruthy()

    await user.type(
      screen.getByLabelText('Código de verificación'),
      '123456',
    )
    await user.click(screen.getByRole('button', { name: 'Verificar' }))

    expect(await screen.findByText('Catálogo de actividades')).toBeTruthy()

    const verifyCall = fetchMock.mock.calls.find(([url]) =>
      String(url).endsWith('/auth/mfa/verify'),
    )
    expect(verifyCall?.[1]?.body).toBe(
      JSON.stringify({ challengeToken: 'challenge-1', code: '123456' }),
    )
    expect(window.sessionStorage.getItem('sm-xplore:session')).toContain('jwt-1')
  })

  it('el boton de envio va antes que el mensaje: el error no lo empuja', () => {
    renderLogin()

    const form = document.querySelector('form') as HTMLFormElement
    const submit = screen.getByRole('button', { name: 'Iniciar sesión' })
    const last = form.lastElementChild as HTMLElement

    expect(last.contains(submit)).toBe(false)
    expect(
      submit.compareDocumentPosition(last) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBe(Node.DOCUMENT_POSITION_FOLLOWING)
  })

  it('muestra el mensaje de credenciales inválidas', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        jsonResponse(
          { detail: 'Credenciales inválidas', code: 'INVALID_CREDENTIALS' },
          401,
        ),
      ),
    )

    const user = userEvent.setup()
    renderLogin()

    await user.type(screen.getByLabelText('Correo electrónico'), 'laura@correo.com')
    await user.type(screen.getByLabelText('Contraseña'), 'mala')
    await user.click(screen.getByRole('button', { name: 'Iniciar sesión' }))

    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toContain('Correo o contraseña incorrectos')
  })

  async function submitWith403(code: string) {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        jsonResponse(
          {
            status: 403,
            code,
            detail: 'Forbidden',
          },
          403,
        ),
      ),
    )

    const user = userEvent.setup()
    renderLogin()

    await user.type(screen.getByLabelText('Correo electrónico'), 'ana@correo.com')
    await user.type(screen.getByLabelText('Contraseña'), 'ContraseñaSegura1!')
    await user.click(screen.getByRole('button', { name: 'Iniciar sesión' }))

    return screen.findByRole('alert')
  }

  it('avisa en el formulario de que la solicitud de guía sigue en revisión', async () => {
    const alert = await submitWith403('ACCOUNT_PENDING_REVIEW')

    expect(alert.textContent).toContain('Tu solicitud como guía está en revisión')
    expect(screen.queryByText('Panel')).toBeNull()
  })

  it('avisa en el formulario de que la solicitud fue rechazada y del motivo', async () => {
    const alert = await submitWith403('ACCOUNT_REGISTRATION_REJECTED')

    expect(alert.textContent).toContain('fue rechazada')
    expect(alert.textContent).toContain('motivo')
  })
})
