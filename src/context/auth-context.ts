import { createContext } from 'react'
import type {
  AuthUser,
  LoginRequest,
  RegisterProviderRequest,
  RegisterTouristRequest,
} from '@/types'

export interface AuthContextValue {
  /** Usuario autenticado, o `null` si no hay sesión. */
  user: AuthUser | null
  isAuthenticated: boolean
  /** `true` mientras se revalida con `/users/me` la sesión guardada. */
  isRestoring: boolean
  /** Challenge pendiente cuando el login pidió el segundo factor. */
  mfaChallenge: string | null
  /**
   * Inicia sesión. Devuelve `null` si la cuenta tiene MFA: hay que llamar a
   * `completeMfa` con el código de la app de autenticación.
   */
  login: (credentials: LoginRequest) => Promise<AuthUser | null>
  /** Segundo paso del login con MFA. */
  completeMfa: (code: string) => Promise<AuthUser>
  /** Descarta el challenge pendiente y vuelve al formulario de credenciales. */
  cancelMfa: () => void
  /** Registro público de turista; deja la sesión iniciada. */
  registerTourist: (payload: RegisterTouristRequest) => Promise<AuthUser | null>
  /** Registro de prestadora; queda pendiente de aprobación y sin sesión. */
  registerProvider: (payload: RegisterProviderRequest) => Promise<AuthUser>
  /** Invalida la sesión en el backend (si se puede) y la borra en el navegador. */
  logout: () => Promise<void>
  /** Refresca el usuario de la sesión tras editar el perfil. */
  updateSessionUser: (user: AuthUser) => void
}

export const AuthContext = createContext<AuthContextValue | null>(null)
