export type UserRole =
  | 'ADMIN'
  | 'GUIDE'
  | 'SERVICE_PROVIDER'
  | 'DESTINATION_MANAGER'
  | 'TOURIST'

export type UserStatus = 'ACTIVE' | 'BLOCKED' | 'SUSPENDED' | 'INACTIVE'

export type DniType =
  | 'CITIZENSHIP_CARD'
  | 'FOREIGNER_ID'
  | 'PASSPORT'
  | 'TAX_ID'

export type RegistrationStatus = 'PENDING' | 'APPROVED' | 'REJECTED'

export interface UserResponse {
  id: string
  fullName: string
  email: string
  phone: string
  role: UserRole
  status: UserStatus
  /**
   * Estado del registro de la prestadora (`null` en los demás roles). En guías y
   * gestoras el registro pendiente se refleja en `status === 'INACTIVE'`.
   */
  registrationStatus: RegistrationStatus | null
  signedUpAt: string
}

/** El backend solo acepta `ACTIVE` (reactivar), `BLOCKED` o `SUSPENDED`. */
export interface ChangeUserStatusRequest {
  status: Extract<UserStatus, 'ACTIVE' | 'BLOCKED' | 'SUSPENDED'>
}

export interface AdminResetPasswordRequest {
  password: string
}

export interface UserSearchFilters {
  role?: UserRole
  status?: UserStatus
  term?: string
}

/**
 * Los campos que el usuario no registró llegan como `null`.
 * `email` y `phone` llegan `null` cuando la petición es anónima: el backend
 * solo entrega los datos de contacto a quienes tienen sesión.
 */
export interface GuideProfileResponse {
  id: string
  fullName: string
  email: string | null
  phone: string | null
  status: UserStatus
  license: string | null
  startOperationDate: string | null
}

/**
 * Los campos que el usuario no registró llegan como `null`.
 * `email` y `phone` llegan `null` cuando la petición es anónima: el backend
 * solo entrega los datos de contacto a quienes tienen sesión.
 */
export interface ServiceProviderProfileResponse {
  id: string
  fullName: string
  email: string | null
  phone: string | null
  status: UserStatus
  nit: string | null
  serviceType: string | null
  registrationStatus: RegistrationStatus
  latitude: number | null
  longitude: number | null
  startOperationDate: string | null
}
