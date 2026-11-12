import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AuthContext } from '@/context/auth-context'
import type { AuthContextValue } from '@/context/auth-context'
import { clearCache } from '@/services/cache'
import MyProfilePage from './MyProfilePage'

function jsonResponse(body: unknown, status = 200) {
  return new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

const CATEGORIES = {
  content: [
    {
      categoryId: 'c1',
      name: 'Playas',
      scope: 'GENERAL',
      parentId: null,
      updatedAt: '2026-11-07T12:00:00Z',
    },
    {
      categoryId: 'c2',
      name: 'Museos',
      scope: 'GENERAL',
      parentId: null,
      updatedAt: '2026-11-07T12:00:00Z',
    },
    {
      categoryId: 'c3',
      name: 'Senderos',
      scope: 'GENERAL',
      parentId: null,
      updatedAt: '2026-11-07T12:00:00Z',
    },
  ],
  page: 0,
  size: 100,
  total: 3,
  totalPages: 1,
}

function authValue(role: 'TOURIST' | 'GUIDE'): AuthContextValue {
  return {
    user: {
      id: 'u-1',
      fullName: 'Ana Turista',
      email: 'ana@smxplore.local',
      phone: '3001234567',
      role,
      status: 'ACTIVO',
      profile: null,
      signedUpAt: '2026-11-02T10:00:00Z',
      authVersion: 1,
    },
    isAuthenticated: true,
    isRestoring: false,
    mfaChallenge: null,
    login: vi.fn(),
    completeMfa: vi.fn(),
    cancelMfa: vi.fn(),
    registerTourist: vi.fn(),
    registerProvider: vi.fn(),
    logout: vi.fn(),
    updateSessionUser: vi.fn(),
  }
}

function renderProfile(role: 'TOURIST' | 'GUIDE') {
  return render(
    <AuthContext.Provider value={authValue(role)}>
      <MemoryRouter initialEntries={['/app/perfil']}>
        <MyProfilePage />
      </MemoryRouter>
    </AuthContext.Provider>,
  )
}

function stubApi(handler: (url: string, init?: RequestInit) => Response) {
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) =>
    handler(String(input), init),
  )
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  clearCache()
})

describe('MyProfilePage · preferencias', () => {
  it('lista, añade y quita preferencias desde el perfil del turista', async () => {
    const calls: string[] = []
    const methods: string[] = []

    stubApi((url, init) => {
      calls.push(url)
      methods.push(init?.method ?? 'GET')

      if (url.endsWith('/preferences/c1')) {
        return new Response(null, { status: 204 })
      }

      if (url === '/api/v1/preferences' && init?.method === 'POST') {
        return jsonResponse(
          {
            touristId: 'u-1',
            categoryId: 'c3',
            weight: 1,
            source: 'EXPLICIT',
            updatedAt: '2026-11-12T05:10:00Z',
          },
          201,
        )
      }

      if (url.includes('/preferences')) {
        return jsonResponse([
          {
            touristId: 'u-1',
            categoryId: 'c1',
            weight: 1,
            source: 'EXPLICIT',
            updatedAt: '2026-11-12T05:04:27Z',
          },
          {
            touristId: 'u-1',
            categoryId: 'c2',
            weight: 0.15,
            source: 'INFERRED',
            updatedAt: '2026-11-12T05:04:20Z',
          },
        ])
      }

      return jsonResponse(CATEGORIES)
    })

    renderProfile('TOURIST')

    expect(await screen.findByText('Playas')).toBeTruthy()
    expect(screen.getByText(/Elegida por ti/)).toBeTruthy()
    expect(screen.getByText(/Deducida de tus visitas/)).toBeTruthy()

    const select = screen.getByLabelText('Añadir categoría') as HTMLSelectElement
    expect(Array.from(select.options).map((option) => option.text)).toEqual([
      'Selecciona una categoría…',
      'Senderos',
    ])

    await userEvent.selectOptions(select, 'c3')
    await userEvent.click(screen.getByRole('button', { name: 'Añadir' }))

    await waitFor(() => expect(screen.getByText('Senderos')).toBeTruthy())
    expect(calls.filter((url) => url === '/api/v1/preferences')).toHaveLength(2)
    expect(methods).toContain('POST')

    await userEvent.click(screen.getByRole('button', { name: 'Quitar Playas' }))

    await waitFor(() =>
      expect(screen.queryByRole('button', { name: 'Quitar Playas' })).toBeNull(),
    )
    expect(calls.some((url) => url.endsWith('/preferences/c1'))).toBe(true)
  })

  it('no pide preferencias a una cuenta que no es de turista', async () => {
    const calls: string[] = []

    stubApi((url) => {
      calls.push(url)
      return jsonResponse(CATEGORIES)
    })

    renderProfile('GUIDE')

    expect(
      await screen.findByText(/se guardan en cuentas de turista/i),
    ).toBeTruthy()
    expect(calls.some((url) => url.includes('/preferences'))).toBe(false)
  })
})