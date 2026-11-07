import type { AccountStatus, AuthUser } from './auth'

export type UserRole =
  | 'ADMIN'
  | 'GUIDE'
  | 'SERVICE_PROVIDER'
  | 'DESTINATION_MANAGER'
  | 'TOURIST'

/** ms-01 no traduce el enum de cuenta: los valores viajan en español. */
export type UserStatus = AccountStatus

/** `ProviderRegistrationStatus` de ms-01. */
export type ProviderRegistrationStatus = 'PENDIENTE' | 'APROBADO' | 'RECHAZADO'

export type AdminSortBy =
  | 'fullName'
  | 'email'
  | 'signedUpAt'
  | 'updatedAt'
  | 'role'
  | 'status'

export type SortOrder = 'ASC' | 'DESC'

/** `UserSummaryView` — fila de `GET /api/v1/admin/users`. */
export interface AdminUserSummary {
  id: string
  fullName: string
  email: string
  role: UserRole
  status: UserStatus
  /** Solo tiene valor en las prestadoras. */
  providerStatus: ProviderRegistrationStatus | null
  signedUpAt: string
}

/** El detalle `GET /admin/users/{id}` es el mismo `UserView` de la sesión. */
export type AdminUserDetail = AuthUser

export interface AdminUserListParams {
  q?: string
  role?: UserRole
  status?: UserStatus
  providerStatus?: ProviderRegistrationStatus
  sortBy?: AdminSortBy
  sortOrder?: SortOrder
  page?: number
  size?: number
}

/** `PageResult` de ms-01: no usa el mismo paginador que ms-03 y ms-04. */
export interface AdminUserPage {
  content: AdminUserSummary[]
  page: number
  size: number
  totalElements: number
  totalPages: number
}

/** Solo se pueden crear cuentas de guía, gestora o administrador. */
export interface CreateUserRequest {
  role: Extract<UserRole, 'GUIDE' | 'DESTINATION_MANAGER' | 'ADMIN'>
  fullName: string
  email: string
  phone?: string
  dniType?: string
  dniNumber?: string
  license?: string
  nit?: string
  startOperationDate?: string
}

export interface ChangeUserStatusRequest {
  status: Exclude<UserStatus, 'ELIMINADO'>
  reason?: string
}

export interface ChangeUserRoleRequest {
  role: UserRole
  dniType?: string
  dniNumber?: string
  preferredLanguage?: string
  birthDate?: string
  nationality?: string
  license?: string
  nit?: string
  businessType?: string
  latitude?: number
  longitude?: number
  websiteUrl?: string
  startOperationDate?: string
}

export interface ProviderReviewRequest {
  decision: Exclude<ProviderRegistrationStatus, 'PENDIENTE'>
  reason?: string
}

/**
 * `PublicProfileView` — `GET /api/v1/public/users/{id}`. Solo existe para
 * guías y prestadoras, y no incluye correo ni teléfono.
 */
export interface PublicGuideDetails {
  license: string | null
  startOperationDate: string | null
}

export interface PublicProviderDetails {
  nit: string | null
  businessType: string | null
  websiteUrl: string | null
  latitude: number | null
  longitude: number | null
  startOperationDate: string | null
}

export type PublicProfile =
  | {
      id: string
      fullName: string
      role: 'GUIDE'
      profile: PublicGuideDetails | null
    }
  | {
      id: string
      fullName: string
      role: 'SERVICE_PROVIDER'
      profile: PublicProviderDetails | null
    }
