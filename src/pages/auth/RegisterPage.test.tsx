import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider } from '@/context/AuthProvider'
import RegisterPage from './RegisterPage'

const TOURIST_USER = {
  id: 'u-1',
  fullName: 'Laura Mora',
  email: 'laura@correo.com',
  phone: '+573001234567',
  role: 'TOURIST',
  status: 'ACTIVO',
  profile: null,
  signedUpAt: '2026-11-01T10:00:00Z',
  authVersion: 1,
}

const PROVIDER_USER = {
  ...TOURIST_USER,
  id: 'u-2',
  role: 'SERVICE_PROVIDER',
  profile: { registrationStatus: 'PENDIENTE' },
}

const LOGIN_RESULT = {
  accessToken: 'jwt-1',
  tokenType: 'Bearer',
  expiresInSeconds: 3600,
  expiresAt: '2100-01-01T00:00:00Z',
  mfaRequired: false,
  mfaChallengeToken: null,
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function renderRegister() {
  return render(
    <AuthProvider>
      <MemoryRouter initialEntries={['/registro']}>
        <Routes>
          <Route path="/registro" element={<RegisterPage />} />
          <Route path="/login" element={<p>Formulario de acceso</p>} />
          <Route path="/explorar" element={<p>Catálogo de actividades</p>} />
        </Routes>
      </MemoryRouter>
    </AuthProvider>,
  )
}

type User = ReturnType<typeof userEvent.setup>

async function fillTouristForm(
  user: User,
  overrides: Partial<Record<'phone' | 'password' | 'email', string>> = {},
) {
  await user.type(screen.getByLabelText('Nombre completo'), 'Laura Mora')
  await user.type(
    screen.getByLabelText('Correo electrónico'),
    overrides.email ?? 'laura@correo.com',
  )
  await user.type(
    screen.getByLabelText('Teléfono'),
    overrides.phone ?? '+57 300 123 4567',
  )
  await user.type(
    screen.getByLabelText('Contraseña'),
    overrides.password ?? 'ContraseñaSegura1!',
  )
  await user.type(screen.getByLabelText('Número de documento'), '1020304050')
}

function registerCall(fetchMock: ReturnType<typeof vi.fn>) {
  return fetchMock.mock.calls.find(([input]) =>
    String(input).endsWith('/auth/register/turista'),
  )
}

describe('RegisterPage', () => {
  afterEach(() => {
    window.sessionStorage.clear()
    vi.unstubAllGlobals()
  })

  it('muestra el checklist con los mínimos del backend y no envía con la contraseña incompleta', async () => {
    const fetchMock = vi.fn(async () => jsonResponse(TOURIST_USER, 201))
    vi.stubGlobal('fetch', fetchMock)

    const user = userEvent.setup()
    renderRegister()

    await fillTouristForm(user, { password: 'corta' })
    await user.click(screen.getByRole('button', { name: 'Crear cuenta' }))

    const checklist = screen.getByRole('list', {
      name: 'Requisitos de la contraseña',
    })
    const items = within(checklist).getAllByRole('listitem')
    expect(items[0].textContent).toContain('Al menos 12 caracteres')
    expect(items[0].textContent).toContain('Falta')
    expect(items[1].textContent).toContain('Como máximo 72 caracteres')
    expect(items[1].textContent).toContain('Cumple')
    expect(items[2].textContent).toContain('Combina al menos 3')
    expect(items[3].textContent).toContain('común')

    const password = screen.getByLabelText('Contraseña') as HTMLInputElement
    expect(password.getAttribute('aria-invalid')).toBe('true')
    expect(fetchMock).not.toHaveBeenCalled()
    expect(document.activeElement).toBe(password)
  })

  it('valida el teléfono en vivo, lo describe con aria-describedby y bloquea el envío', async () => {
    const fetchMock = vi.fn(async () => jsonResponse(TOURIST_USER, 201))
    vi.stubGlobal('fetch', fetchMock)

    const user = userEvent.setup()
    renderRegister()

    await fillTouristForm(user, { phone: '300 12' })
    await user.tab()

    // El error del blur se pinta en la tarea siguiente (ver RegisterPage).
    await screen.findByText(/7 y 20/i)

    const phone = screen.getByLabelText('Teléfono') as HTMLInputElement
    expect(phone.getAttribute('aria-invalid')).toBe('true')

    const describedBy = phone.getAttribute('aria-describedby') ?? ''
    const described = describedBy
      .split(' ')
      .map((id) => document.getElementById(id)?.textContent ?? '')
      .join(' ')
    expect(described).toMatch(/7 y 20/i)

    await user.click(screen.getByRole('button', { name: 'Crear cuenta' }))

    expect(fetchMock).not.toHaveBeenCalled()
    expect(document.activeElement).toBe(phone)
    const blockedAlerts = screen
      .getAllByRole('alert')
      .map((node) => node.textContent ?? '')
      .join(' ')
    expect(blockedAlerts).toMatch(/teléfono/i)
  })

  it('quita el error del teléfono en cuanto el valor pasa a ser válido', async () => {
    const fetchMock = vi.fn(async () => jsonResponse(TOURIST_USER, 201))
    vi.stubGlobal('fetch', fetchMock)

    const user = userEvent.setup()
    renderRegister()

    const phone = screen.getByLabelText('Teléfono') as HTMLInputElement
    await user.type(phone, '300 12')
    await user.tab()
    await screen.findByText(/7 y 20/i)
    expect(phone.getAttribute('aria-invalid')).toBe('true')

    await user.type(phone, '34567')
    await user.tab()

    expect(phone.getAttribute('aria-invalid')).toBeNull()
    expect(screen.queryByText(/7 y 20/i)).toBeNull()
  })

  it('da de alta al turista y entra al catálogo', async () => {
    const fetchMock = vi.fn(
      async (input: RequestInfo | URL, init?: RequestInit) => {
        void init
        const url = String(input)
        if (url.endsWith('/auth/register/turista')) {
          return jsonResponse(TOURIST_USER, 201)
        }
        if (url.endsWith('/auth/login')) {
          return jsonResponse(LOGIN_RESULT)
        }
        if (url.endsWith('/users/me')) {
          return jsonResponse(TOURIST_USER)
        }
        return jsonResponse({ code: 'NOT_FOUND' }, 404)
      },
    )
    vi.stubGlobal('fetch', fetchMock)

    const user = userEvent.setup()
    renderRegister()

    await fillTouristForm(user)
    await user.click(screen.getByRole('button', { name: 'Crear cuenta' }))

    expect(await screen.findByText('Catálogo de actividades')).toBeTruthy()

    const call = registerCall(fetchMock)
    expect(call).toBeTruthy()
    expect(JSON.parse(String(call?.[1]?.body))).toEqual({
      fullName: 'Laura Mora',
      email: 'laura@correo.com',
      phone: '+573001234567',
      password: 'ContraseñaSegura1!',
      dniType: 'CC',
      dniNumber: '1020304050',
    })
  })

  it('pone el correo duplicado en el campo de correo con su propio mensaje', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        jsonResponse(
          {
            detail: 'El correo ya está registrado',
            code: 'EMAIL_ALREADY_EXISTS',
          },
          409,
        ),
      ),
    )

    const user = userEvent.setup()
    renderRegister()

    await fillTouristForm(user)
    await user.click(screen.getByRole('button', { name: 'Crear cuenta' }))

    const email = screen.getByLabelText('Correo electrónico') as HTMLInputElement
    expect(email.getAttribute('aria-invalid')).toBe('true')

    const describedBy = email.getAttribute('aria-describedby') ?? ''
    const described = describedBy
      .split(' ')
      .map((id) => document.getElementById(id)?.textContent ?? '')
      .join(' ')
    expect(described).toMatch(/ya existe una cuenta con ese correo/i)

    const duplicateAlerts = screen
      .getAllByRole('alert')
      .map((node) => node.textContent ?? '')
      .join(' ')
    expect(duplicateAlerts).toMatch(/ya existe una cuenta con ese correo/i)
  })

  it('mapea los errors del ProblemDetail a su campo sin taparlos con el mensaje genérico', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        jsonResponse(
          {
            detail: 'Los datos enviados no son válidos',
            code: 'VALIDATION_ERROR',
            errors: { phone: 'must match "^[0-9+()\\-\\s]{7,20}$"' },
          },
          400,
        ),
      ),
    )

    const user = userEvent.setup()
    renderRegister()

    await fillTouristForm(user)
    await user.click(screen.getByRole('button', { name: 'Crear cuenta' }))

    const phone = screen.getByLabelText('Teléfono') as HTMLInputElement
    expect(phone.getAttribute('aria-invalid')).toBe('true')

    const describedBy = phone.getAttribute('aria-describedby') ?? ''
    const described = describedBy
      .split(' ')
      .map((id) => document.getElementById(id)?.textContent ?? '')
      .join(' ')

    expect(described).toMatch(/teléfono/i)
    expect(described).not.toMatch(/must match/i)

    const serverAlerts = screen
      .getAllByRole('alert')
      .map((node) => node.textContent ?? '')
      .join(' ')
    expect(serverAlerts).toMatch(/revisa los datos/i)
  })

  it('registra la prestadora y avisa de que queda pendiente de revisión', async () => {
    const fetchMock = vi.fn(
      async (input: RequestInfo | URL, init?: RequestInit) => {
        void init
        const url = String(input)
        if (url.endsWith('/auth/register/prestadora')) {
          return jsonResponse(PROVIDER_USER, 201)
        }
        return jsonResponse({ code: 'NOT_FOUND' }, 404)
      },
    )
    vi.stubGlobal('fetch', fetchMock)

    const user = userEvent.setup()
    renderRegister()

    await user.selectOptions(
      screen.getByLabelText('Tipo de cuenta'),
      'SERVICE_PROVIDER',
    )
    await user.type(screen.getByLabelText('Nombre completo'), 'Hotel Tayrona')
    await user.type(screen.getByLabelText('Correo electrónico'), 'hotel@correo.com')
    await user.type(screen.getByLabelText('Teléfono'), '3001234567')
    await user.type(screen.getByLabelText('Contraseña'), 'ContraseñaSegura1!')
    await user.type(screen.getByLabelText('NIT'), '900123456-7')
    await user.click(screen.getByRole('button', { name: 'Crear cuenta' }))

    expect(
      await screen.findByRole('heading', { name: 'Solicitud enviada' }),
    ).toBeTruthy()
    expect(screen.getByText(/hotel@correo.com/)).toBeTruthy()

    const call = fetchMock.mock.calls.find(([input]) =>
      String(input).endsWith('/auth/register/prestadora'),
    )
    expect(JSON.parse(String(call?.[1]?.body))).toMatchObject({
      nit: '900123456-7',
      phone: '3001234567',
    })
  })

  it('acepta un teléfono internacional distinto de +57 (gate = DTO)', async () => {
    const fetchMock = vi.fn(
      async (input: RequestInfo | URL, init?: RequestInit) => {
        void init
        const url = String(input)
        if (url.endsWith('/auth/register/turista')) {
          return jsonResponse(TOURIST_USER, 201)
        }
        if (url.endsWith('/auth/login')) {
          return jsonResponse(LOGIN_RESULT)
        }
        if (url.endsWith('/users/me')) {
          return jsonResponse(TOURIST_USER)
        }
        return jsonResponse({ code: 'NOT_FOUND' }, 404)
      },
    )
    vi.stubGlobal('fetch', fetchMock)

    const user = userEvent.setup()
    renderRegister()

    await fillTouristForm(user, { phone: '+34 600 123 456' })
    await user.click(screen.getByRole('button', { name: 'Crear cuenta' }))

    expect(await screen.findByText('Catálogo de actividades')).toBeTruthy()
    const call = registerCall(fetchMock)
    expect(JSON.parse(String(call?.[1]?.body))).toMatchObject({
      phone: '+34600123456',
    })
  })

  it('detiene el alta si la nacionalidad excede el máximo y enfoca el campo', async () => {
    const fetchMock = vi.fn(
      async (input: RequestInfo | URL, init?: RequestInit) => {
        void input
        void init
        return jsonResponse(TOURIST_USER, 201)
      },
    )
    vi.stubGlobal('fetch', fetchMock)

    const user = userEvent.setup()
    renderRegister()

    await fillTouristForm(user)
    await user.type(screen.getByLabelText('Nacionalidad'), 'a'.repeat(81))
    await user.click(screen.getByRole('button', { name: 'Crear cuenta' }))

    const registerCalls = fetchMock.mock.calls.filter(([input]) =>
      String(input).includes('/auth/register'),
    )
    expect(registerCalls).toHaveLength(0)

    const nationality = screen.getByLabelText('Nacionalidad') as HTMLInputElement
    expect(document.activeElement).toBe(nationality)
    expect(nationality.getAttribute('aria-invalid')).toBe('true')

    const described = (nationality.getAttribute('aria-describedby') ?? '')
      .split(' ')
      .map((id) => document.getElementById(id)?.textContent ?? '')
      .join(' ')
    expect(described).toMatch(/80/)
  })

  it('al enviar con teclado el foco llega al primer error ya descrito', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse(TOURIST_USER, 201)))

    const user = userEvent.setup()
    renderRegister()

    screen.getByRole('button', { name: 'Crear cuenta' }).focus()
    await user.keyboard('{Enter}')

    expect(document.activeElement?.getAttribute('name')).toBe('fullName')

    const described = (document.activeElement?.getAttribute('aria-describedby') ?? '')
      .split(' ')
      .map((id) => document.getElementById(id)?.textContent ?? '')
      .join(' ')
    expect(described).toContain('Escribe tu nombre completo.')

    // Un solo alert (el resumen); el error del campo se anuncia en polite.
    const alerts = screen.getAllByRole('alert')
    expect(alerts).toHaveLength(1)
    expect(alerts[0].textContent).toContain('Revisa los datos')

    const fieldError = screen.getByText('Escribe tu nombre completo.')
    expect(fieldError.getAttribute('aria-live')).toBe('polite')
  })

  it('explica el DATA_CONFLICT sin hablar de campos no válidos', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        jsonResponse(
          {
            detail: 'Ya existe un registro con los mismos datos',
            code: 'DATA_CONFLICT',
          },
          409,
        ),
      ),
    )

    const user = userEvent.setup()
    renderRegister()

    await fillTouristForm(user)
    await user.click(screen.getByRole('button', { name: 'Crear cuenta' }))

    const alert = await screen.findByText(/el documento o el NIT/i)
    expect(alert.textContent).toMatch(/teléfono/i)
    expect(screen.queryByText(/Revisa los datos/i)).toBeNull()
  })

  it('con la contraseña vacía el checklist no muestra ningún Cumple', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse(TOURIST_USER, 201)))

    renderRegister()

    const checklist = screen.getByRole('list', {
      name: 'Requisitos de la contraseña',
    })
    const items = within(checklist).getAllByRole('listitem')

    expect(items.some((item) => (item.textContent ?? '').includes('Pendiente'))).toBe(
      true,
    )
    expect(items.every((item) => !(item.textContent ?? '').includes('Cumple'))).toBe(
      true,
    )
  })
})
