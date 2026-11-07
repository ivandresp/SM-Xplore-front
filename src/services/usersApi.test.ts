import { afterEach, describe, expect, it, vi } from 'vitest'
import { usersApi } from './usersApi'

function jsonResponse(body: unknown, status = 200) {
  return new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

const summary = {
  id: 'u1',
  fullName: 'Ana Guía',
  email: 'ana@smxplore.local',
  role: 'GUIDE',
  status: 'ACTIVO',
  providerStatus: null,
  signedUpAt: '2026-11-01T10:00:00Z',
}

describe('usersApi', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('lista con paginación del servidor (totalElements, no total)', async () => {
    const fetchStub = vi.fn(async (_url: string, _init?: RequestInit) =>
      jsonResponse({
        content: [summary],
        page: 1,
        size: 10,
        totalElements: 12,
        totalPages: 2,
      }),
    )
    vi.stubGlobal('fetch', fetchStub)

    const page = await usersApi.list({
      q: 'ana',
      role: 'GUIDE',
      status: 'ACTIVO',
      sortBy: 'signedUpAt',
      sortOrder: 'DESC',
      page: 1,
      size: 10,
    })

    expect(page.totalElements).toBe(12)
    expect(page.content[0].fullName).toBe('Ana Guía')

    const url = String(fetchStub.mock.calls[0][0])
    expect(url).toContain('/admin/users?')
    expect(url).toContain('role=GUIDE')
    expect(url).toContain('page=1')
    expect(url).toContain('size=10')
  })

  it('rechaza una página sin totalElements', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        jsonResponse({ content: [], page: 0, size: 10, total: 0, totalPages: 0 }),
      ),
    )

    await expect(usersApi.list()).rejects.toThrow(/totalElements/)
  })

  it('cambia el estado con el motivo en el cuerpo', async () => {
    const fetchStub = vi.fn(async (_url: string, _init?: RequestInit) =>
      jsonResponse(undefined, 204),
    )
    vi.stubGlobal('fetch', fetchStub)

    await usersApi.changeStatus('u1', {
      status: 'BLOQUEADO',
      reason: 'Incumplimiento',
    })

    const [url, init] = fetchStub.mock.calls[0]
    expect(String(url)).toContain('/admin/users/u1/status')
    expect(init?.method).toBe('PATCH')
    expect(JSON.parse(String(init?.body))).toEqual({
      status: 'BLOQUEADO',
      reason: 'Incumplimiento',
    })
  })

  it('pide el restablecimiento sin cuerpo (202)', async () => {
    const fetchStub = vi.fn(async (_url: string, _init?: RequestInit) =>
      jsonResponse(undefined, 202),
    )
    vi.stubGlobal('fetch', fetchStub)

    await expect(usersApi.requestPasswordReset('u1')).resolves.toBeUndefined()

    const [url, init] = fetchStub.mock.calls[0]
    expect(String(url)).toContain('/admin/users/u1/password-reset')
    expect(init?.method).toBe('POST')
    expect(init?.body).toBeUndefined()
  })

  it('lee el perfil público del guía sin datos de contacto', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        jsonResponse({
          id: 'u1',
          fullName: 'Ana Guía',
          role: 'GUIDE',
          profile: { license: 'RNT-1', startOperationDate: '2025-01-01' },
        }),
      ),
    )

    const profile = await usersApi.getPublicProfile('u1')

    expect(profile.role).toBe('GUIDE')
    if (profile.role !== 'GUIDE') throw new Error('rol inesperado')
    expect(profile.profile?.license).toBe('RNT-1')
    expect(profile).not.toHaveProperty('email')
  })
})
