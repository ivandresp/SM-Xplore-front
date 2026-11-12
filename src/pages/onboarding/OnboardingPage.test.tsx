import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider } from '@/context/AuthProvider'
import { clearToken, saveToken } from '@/services/authToken'
import OnboardingPage from './OnboardingPage'

const TOURIST = {
  id: 'u-1',
  fullName: 'Laura Mora',
  email: 'laura@correo.com',
  phone: '+573001234567',
  role: 'TOURIST',
  status: 'ACTIVO',
  profile: {
    dniType: 'CC',
    dniNumber: '1020304050',
    preferredLanguage: null,
    birthDate: null,
    nationality: null,
  },
  signedUpAt: '2026-11-01T10:00:00Z',
  authVersion: 1,
}

const COMPLETE_TOURIST = {
  ...TOURIST,
  profile: {
    ...TOURIST.profile,
    nationality: 'Colombia',
    preferredLanguage: 'es',
  },
}

const CATEGORY_ROWS = [
  {
    categoryId: 'c-playa',
    name: 'Playa',
    scope: 'ACTIVITY',
    parentId: null,
    updatedAt: '2026-10-01T00:00:00Z',
  },
  {
    categoryId: 'c-gastro',
    name: 'Gastronomía',
    scope: 'EVENT',
    parentId: null,
    updatedAt: '2026-10-01T00:00:00Z',
  },
]

interface RecordedCall {
  path: string
  method: string
  body?: Record<string, unknown>
}

interface StubOptions {
  user?: Record<string, unknown>
  preferences?: string[]
  addPreference?: () => Response
  removePreference?: () => Response
  patchProfile?: (body: Record<string, unknown>) => Response
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function preferenceRow(categoryId: string) {
  return {
    touristId: 'u-1',
    categoryId,
    weight: 1,
    source: 'EXPLICIT',
    updatedAt: '2026-11-12T00:00:00Z',
  }
}

function stubApi(options: StubOptions = {}) {
  const user = options.user ?? TOURIST
  const preferences = options.preferences ?? []
  const calls: RecordedCall[] = []

  const fetchMock = vi.fn(async (input: string, init?: RequestInit) => {
    const url = new URL(String(input), 'http://localhost')
    const method = (init?.method ?? 'GET').toUpperCase()
    const body: Record<string, unknown> | undefined =
      init?.body === undefined || init.body === null
        ? undefined
        : (JSON.parse(String(init.body)) as Record<string, unknown>)
    calls.push({ path: url.pathname, method, body })

    if (url.pathname.endsWith('/users/me')) {
      if (method === 'PATCH') {
        return (
          options.patchProfile?.(body ?? {}) ??
          jsonResponse({
            ...user,
            profile: { ...(user.profile as Record<string, unknown>), ...(body ?? {}) },
          })
        )
      }
      return jsonResponse(user)
    }

    if (url.pathname.endsWith('/categories')) {
      return jsonResponse({
        content: CATEGORY_ROWS,
        page: 0,
        size: 100,
        total: CATEGORY_ROWS.length,
        totalPages: 1,
      })
    }

    if (url.pathname.endsWith('/preferences') && method === 'GET') {
      return jsonResponse(preferences.map(preferenceRow))
    }

    if (url.pathname.endsWith('/preferences') && method === 'POST') {
      return (
        options.addPreference?.() ??
        jsonResponse(preferenceRow(String(body?.categoryId)), 201)
      )
    }

    if (url.pathname.includes('/preferences/') && method === 'DELETE') {
      return options.removePreference?.() ?? new Response(null, { status: 204 })
    }

    return jsonResponse({ code: 'NOT_FOUND' }, 404)
  })

  vi.stubGlobal('fetch', fetchMock)
  return { fetchMock, calls }
}

function renderOnboarding() {
  return render(
    <AuthProvider>
      <MemoryRouter initialEntries={['/bienvenida']}>
        <Routes>
          <Route path="/bienvenida" element={<OnboardingPage />} />
          <Route path="/explorar" element={<p>Catálogo de actividades</p>} />
          <Route
            path="/recomendaciones"
            element={<p>Recomendaciones personalizadas</p>}
          />
        </Routes>
      </MemoryRouter>
    </AuthProvider>,
  )
}

function progressItems() {
  return within(
    screen.getByRole('list', { name: 'Pasos de la bienvenida' }),
  ).getAllByRole('listitem')
}

function callsTo(calls: RecordedCall[], method: string, path: string) {
  return calls.filter((call) => call.method === method && call.path === path)
}

describe('OnboardingPage', () => {
  beforeEach(() => {
    saveToken('jwt-1', '2100-01-01T00:00:00Z')
  })

  afterEach(() => {
    clearToken()
    window.sessionStorage.clear()
    vi.unstubAllGlobals()
  })

  it('muestra las cápsulas con emoji y marca las preferencias que ya están guardadas', async () => {
    stubApi({ preferences: ['c-playa'] })
    const user = userEvent.setup()
    renderOnboarding()

    // Con intereses guardados entra en el paso 2; "Atrás" vuelve a las cápsulas.
    await screen.findByRole('heading', { name: 'Cuéntanos de ti' })
    await user.click(screen.getByRole('button', { name: 'Atrás' }))

    const playa = await screen.findByRole('button', { name: 'Playa' })
    const gastro = screen.getByRole('button', { name: 'Gastronomía' })

    expect(playa.getAttribute('aria-pressed')).toBe('true')
    expect(gastro.getAttribute('aria-pressed')).toBe('false')
    expect(gastro.textContent).toContain('🍲')
    expect(progressItems()[0].textContent).toContain('Intereses: completado')
  })

  it('crear una preferencia desde una cápsula la guarda y enciende el punto 1', async () => {
    const { calls } = stubApi({ preferences: [] })
    const user = userEvent.setup()
    renderOnboarding()

    await user.click(await screen.findByRole('button', { name: 'Gastronomía' }))

    const posted = callsTo(calls, 'POST', '/api/v1/preferences')
    expect(posted).toHaveLength(1)
    expect(posted[0].body).toEqual({ categoryId: 'c-gastro' })
    expect(
      screen.getByRole('button', { name: 'Gastronomía' }).getAttribute('aria-pressed'),
    ).toBe('true')
    expect(progressItems()[0].textContent).toContain('Intereses: completado')
  })

  it('volver a pulsar una preferencia guardada la quita con DELETE', async () => {
    const { calls } = stubApi({ preferences: ['c-playa'] })
    const user = userEvent.setup()
    renderOnboarding()

    await screen.findByRole('heading', { name: 'Cuéntanos de ti' })
    await user.click(screen.getByRole('button', { name: 'Atrás' }))
    await user.click(await screen.findByRole('button', { name: 'Playa' }))

    expect(callsTo(calls, 'DELETE', '/api/v1/preferences/c-playa')).toHaveLength(1)
    expect(
      screen.getByRole('button', { name: 'Playa' }).getAttribute('aria-pressed'),
    ).toBe('false')
  })

  it('si guardar falla no marca la cápsula y lo anuncia', async () => {
    stubApi({
      preferences: [],
      addPreference: () =>
        jsonResponse({ status: 500, code: 'INTERNAL_ERROR' }, 500),
    })
    const user = userEvent.setup()
    renderOnboarding()

    await user.click(await screen.findByRole('button', { name: 'Gastronomía' }))

    expect(
      screen.getByRole('button', { name: 'Gastronomía' }).getAttribute('aria-pressed'),
    ).toBe('false')
    expect(screen.getByRole('alert').textContent).toContain('error interno')
  })

  it('al volver con intereses guardados retoma en el paso 2', async () => {
    stubApi({ preferences: ['c-playa'] })
    renderOnboarding()

    expect(
      await screen.findByRole('heading', { name: 'Cuéntanos de ti' }),
    ).toBeTruthy()
    expect(progressItems()[0].textContent).toContain('Intereses: completado')
    expect(progressItems()[1].textContent).toContain('Perfil: en curso')
  })

  it('guarda nacionalidad e idioma con PATCH /users/me y cierra en el paso 3', async () => {
    const { calls } = stubApi({ preferences: ['c-playa'] })
    const user = userEvent.setup()
    renderOnboarding()

    await user.type(await screen.findByLabelText('Nacionalidad'), 'Colombia')
    await user.selectOptions(screen.getByLabelText('Idioma preferido'), 'es')
    await user.click(screen.getByRole('button', { name: 'Guardar y continuar' }))

    const patched = callsTo(calls, 'PATCH', '/api/v1/users/me')
    expect(patched).toHaveLength(1)
    expect(patched[0].body).toEqual({
      nationality: 'Colombia',
      preferredLanguage: 'es',
    })

    expect(await screen.findByRole('heading', { name: /Todo listo/ })).toBeTruthy()
    expect(progressItems()[2].textContent).toContain('Listo: completado')
  })

  it('omitir el perfil avanza al paso 3 sin escribir en el backend', async () => {
    const { calls } = stubApi({ preferences: ['c-playa'] })
    const user = userEvent.setup()
    renderOnboarding()

    await user.click(await screen.findByRole('button', { name: 'Omitir' }))

    expect(await screen.findByRole('heading', { name: /Todo listo/ })).toBeTruthy()
    expect(callsTo(calls, 'PATCH', '/api/v1/users/me')).toHaveLength(0)
    expect(progressItems()[1].textContent).toContain('Perfil: pendiente')
  })

  it('el enlace de saltar lleva al catálogo sin tocar preferencias', async () => {
    const { calls } = stubApi({ preferences: [] })
    const user = userEvent.setup()
    renderOnboarding()

    await screen.findByRole('button', { name: 'Playa' })
    await user.click(screen.getByRole('link', { name: 'Saltar por ahora' }))

    expect(await screen.findByText('Catálogo de actividades')).toBeTruthy()
    expect(callsTo(calls, 'POST', '/api/v1/preferences')).toHaveLength(0)
  })

  it('el atajo de recomendaciones sale a /recomendaciones desde el primer paso', async () => {
    stubApi({ preferences: [] })
    const user = userEvent.setup()
    renderOnboarding()

    await screen.findByRole('button', { name: 'Playa' })
    await user.click(screen.getByRole('link', { name: 'Ver recomendaciones' }))

    expect(await screen.findByText('Recomendaciones personalizadas')).toBeTruthy()
  })

  it('con intereses y perfil reales cierra en el paso 3 y ofrece recomendaciones', async () => {
    stubApi({ user: COMPLETE_TOURIST, preferences: ['c-playa'] })
    const user = userEvent.setup()
    renderOnboarding()

    expect(await screen.findByRole('heading', { name: /Todo listo/ })).toBeTruthy()
    expect(progressItems()[2].textContent).toContain('Listo: completado')

    await user.click(screen.getByRole('button', { name: 'Ver mis recomendaciones' }))
    expect(await screen.findByText('Recomendaciones personalizadas')).toBeTruthy()
  })
})
