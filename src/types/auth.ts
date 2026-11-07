export interface LoginRequest {
  email: string
  password: string
}

export interface ForgotPasswordRequest {
  email: string
}

export interface ResetPasswordRequest {
  token: string
  newPassword: string
}

export interface VerifyMfaRequest {
  challengeToken: string
  code: string
}

/**
 * Respuesta de `POST /api/v1/auth/login` y `/auth/mfa/verify`.
 * Con MFA activo llega `mfaRequired: true`, sin token de acceso y con
 * `mfaChallengeToken` para completar el segundo paso.
 */
export interface LoginResult {
  accessToken: string | null
  tokenType: string | null
  expiresInSeconds: number
  expiresAt: string
  mfaRequired: boolean
  mfaChallengeToken: string | null
}

/** `UserStatus` de ms-01. Llega en español, sin mapeo en el backend. */
export type AccountStatus =
  | 'ACTIVO'
  | 'BLOQUEADO'
  | 'SUSPENDIDO'
  | 'ELIMINADO'

export interface TouristProfile {
  dniType: string | null
  dniNumber: string | null
  preferredLanguage: string | null
  birthDate: string | null
  nationality: string | null
}

export interface GuideProfile {
  dniType: string | null
  dniNumber: string | null
  license: string | null
  startOperationDate: string | null
}

export interface ProviderProfile {
  nit: string | null
  businessType: string | null
  registrationStatus: string | null
  websiteUrl: string | null
  latitude: number | null
  longitude: number | null
  startOperationDate: string | null
}

export interface DestinationManagerProfile {
  nit: string | null
  startOperationDate: string | null
}

export interface AdministratorProfile {
  dniType: string | null
  dniNumber: string | null
  lastAccessDate: string | null
}

interface SessionUser {
  id: string
  fullName: string
  email: string
  phone: string
  status: AccountStatus
  /** Perfil propio del rol; el backend no envía discriminador, va con `role`. */
  profile: unknown
  signedUpAt: string
  authVersion: number
}

/**
 * Usuario autenticado (`UserView` de ms-01). El perfil se discrimina por
 * `role`, que es lo único que permite saber qué record viene en `profile`.
 */
export type AuthUser =
  | (SessionUser & { role: 'TOURIST'; profile: TouristProfile | null })
  | (SessionUser & { role: 'GUIDE'; profile: GuideProfile | null })
  | (SessionUser & {
      role: 'SERVICE_PROVIDER'
      profile: ProviderProfile | null
    })
  | (SessionUser & {
      role: 'DESTINATION_MANAGER'
      profile: DestinationManagerProfile | null
    })
  | (SessionUser & { role: 'ADMIN'; profile: AdministratorProfile | null })

export interface RegisterTouristRequest {
  fullName: string
  email: string
  phone: string
  password: string
  dniType: string
  dniNumber: string
  preferredLanguage?: string
  birthDate?: string
  nationality?: string
}

export interface RegisterProviderRequest {
  fullName: string
  email: string
  phone: string
  password: string
  nit: string
  businessType?: string
  latitude?: number
  longitude?: number
  websiteUrl?: string
  startOperationDate?: string
}

/** `PATCH /api/v1/users/me`: todos los campos son opcionales. */
export interface UpdateMyProfileRequest {
  fullName?: string
  phone?: string
  preferredLanguage?: string
  birthDate?: string
  nationality?: string
  businessType?: string
  latitude?: number
  longitude?: number
  websiteUrl?: string
  license?: string
}

