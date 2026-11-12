import { afterEach, describe, expect, it, vi } from 'vitest'
import { authApi } from './authApi'
import type { RegisterTouristRequest } from '@/types'

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('authApi', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('devuelve la unión de MFA sin token de acceso', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        jsonResponse({
          accessToken: null,
          tokenType: null,
          expiresInSeconds: 300,
          expiresAt: '2026-11-07T12:05:00Z',
          mfaRequired: true,
          mfaChallengeToken: 'challenge-1',
        }),
      ),
    )

    const result = await authApi.login({
      email: 'laura@correo.com',
      password: 'secreta123456',
    })

    expect(result.mfaRequired).toBe(true)
    expect(result.accessToken).toBeNull()
    expect(result.mfaChallengeToken).toBe('challenge-1')
  })

  it('rechaza una respuesta cuyo estado de cuenta no es el del backend', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        jsonResponse({
          id: 'u-1',
          fullName: 'Laura',
          email: 'laura@correo.com',
          phone: '',
          role: 'TOURIST',
          status: 'ACTIVE',
          profile: null,
          signedUpAt: '2026-11-01T10:00:00Z',
          authVersion: 1,
        }),
      ),
    )

    await expect(
      authApi.registerTourist({} as RegisterTouristRequest),
    ).rejects.toThrow(/Respuesta inesperada de POST \/auth\/register\/turista/)
  })

  it('registerGuide da de alta al guía pendiente de revisión', async () => {
    const fetchStub = vi.fn(async (_url: string, _init?: RequestInit) =>
      jsonResponse(
        {
          id: 'u-guia',
          fullName: 'Ana Guía',
          email: 'ana@correo.com',
          phone: '+573001112233',
          role: 'GUIDE',
          status: 'ACTIVO',
          profile: {
            dniType: 'CC',
            dniNumber: '1020304050',
            license: 'LIC-B8A-001',
            registrationStatus: 'PENDIENTE',
            startOperationDate: null,
          },
          signedUpAt: '2026-11-01T10:00:00Z',
          authVersion: 0,
        },
        201,
      ),
    )
    vi.stubGlobal('fetch', fetchStub)

    const created = await authApi.registerGuide({
      fullName: 'Ana Guía',
      email: 'ana@correo.com',
      phone: '+573001112233',
      password: 'ContraseñaSegura1!',
      dniType: 'CC',
      dniNumber: '1020304050',
      license: 'LIC-B8A-001',
    })

    expect(created.role).toBe('GUIDE')
    const [url, init] = fetchStub.mock.calls[0]
    expect(String(url)).toContain('/auth/register/guia')
    expect(JSON.parse(String(init?.body))).toMatchObject({ license: 'LIC-B8A-001' })
  })
})
