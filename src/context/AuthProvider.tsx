import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { AuthContext } from './auth-context'
import { authApi } from '@/services/authApi'
import { usersApi } from '@/services/usersApi'
import {
  clearToken,
  loadToken,
  onUnauthorized,
  saveToken,
} from '@/services/authToken'
import type {
  AuthUser,
  LoginRequest,
  LoginResult,
  RegisterProviderRequest,
  RegisterTouristRequest,
} from '@/types'

/**
 * Sesión con JWT. El token viaja en `Authorization: Bearer` (lo añade
 * `httpClient`) y se guarda en `sessionStorage` junto a su vencimiento.
 * No hay refresh: al expirar se vuelve a `/auth/login`.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isRestoring, setIsRestoring] = useState(() => loadToken() !== null)
  const [mfaChallenge, setMfaChallenge] = useState<string | null>(null)

  useEffect(() => {
    onUnauthorized(() => {
      clearToken()
      setUser(null)
    })

    // Sin token no hay nada que restaurar: `isRestoring` ya nace en `false`.
    if (loadToken() === null) {
      return
    }

    let active = true
    usersApi
      .me()
      .then((restored) => {
        if (active) {
          setUser(restored)
        }
      })
      .catch(() => {
        // Token vencido o revocado: `onUnauthorized` ya limpió la sesión.
        if (active) {
          clearToken()
        }
      })
      .finally(() => {
        if (active) {
          setIsRestoring(false)
        }
      })

    return () => {
      active = false
    }
  }, [])

  async function applyLoginResult(result: LoginResult): Promise<AuthUser> {
    if (result.accessToken === null) {
      throw new Error('El backend no devolvió un token de acceso.')
    }

    saveToken(result.accessToken, result.expiresAt)
    const authenticated = await usersApi.me()
    setUser(authenticated)
    setMfaChallenge(null)
    return authenticated
  }

  async function login(credentials: LoginRequest): Promise<AuthUser | null> {
    const result = await authApi.login(credentials)

    if (result.mfaRequired) {
      setMfaChallenge(result.mfaChallengeToken)
      return null
    }

    return applyLoginResult(result)
  }

  async function completeMfa(code: string): Promise<AuthUser> {
    if (mfaChallenge === null) {
      throw new Error('No hay un desafío MFA pendiente.')
    }

    return applyLoginResult(
      await authApi.verifyMfa({ challengeToken: mfaChallenge, code }),
    )
  }

  async function registerTourist(
    payload: RegisterTouristRequest,
  ): Promise<AuthUser | null> {
    await authApi.registerTourist(payload)
    return login({ email: payload.email, password: payload.password })
  }

  function registerProvider(payload: RegisterProviderRequest) {
    return authApi.registerProvider(payload)
  }

  async function logout() {
    try {
      await usersApi.logout()
    } catch {
      // Token ya inválido: igual se borra la sesión local.
    }

    clearToken()
    setUser(null)
    setMfaChallenge(null)
  }

  return (
    <AuthContext
      value={{
        user,
        isAuthenticated: user !== null,
        isRestoring,
        mfaChallenge,
        login,
        completeMfa,
        cancelMfa: () => setMfaChallenge(null),
        registerTourist,
        registerProvider,
        logout,
        updateSessionUser: setUser,
      }}
    >
      {children}
    </AuthContext>
  )
}
