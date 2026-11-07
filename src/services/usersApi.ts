import { httpClient } from './httpClient'
import { parseResponse } from './validate'
import { toAuthUser, userViewSchema } from './userSchema'
import type {
  UpdateMyProfileRequest,
  ChangeUserStatusRequest,
  GuideProfileResponse,
  AdminResetPasswordRequest,
  ServiceProviderProfileResponse,
  UserResponse,
  UserSearchFilters,
} from '@/types'

export const usersApi = {
  /** `GET /api/v1/users/me` — usuario de la sesión. */
  me: () =>
    httpClient
      .get<unknown>('/users/me')
      .then((response) =>
        toAuthUser(parseResponse(userViewSchema, response, 'GET /users/me')),
      ),

  /** `PATCH /api/v1/users/me` — el correo no se puede editar. */
  updateMe: (payload: UpdateMyProfileRequest) =>
    httpClient
      .patch<unknown>('/users/me', payload)
      .then((response) =>
        toAuthUser(parseResponse(userViewSchema, response, 'PATCH /users/me')),
      ),

  /** `POST /api/v1/users/me/logout` — 204; invalida las sesiones del usuario. */
  logout: () => httpClient.post<void>('/users/me/logout'),

  /** `GET /api/v1/users` — lista completa de usuarios. */
  list: () => httpClient.get<UserResponse[]>('/users'),

  /** `GET /api/v1/users/{userId}` */
  getById: (userId: string) => httpClient.get<UserResponse>(`/users/${userId}`),

  /** `GET /api/v1/users/search` — todos los filtros son opcionales. */
  search: (filters: UserSearchFilters) =>
    httpClient.get<UserResponse[]>('/users/search', { query: { ...filters } }),

  /** `DELETE /api/v1/users/{userId}` — el usuario elimina su cuenta (204). */
  deleteAccount: (userId: string) =>
    httpClient.delete<void>(`/users/${userId}`),

  /**
   * `PATCH /api/v1/users/{userId}/status` — admin: reactivar (`ACTIVE`),
   * bloquear (`BLOCKED`) o suspender (`SUSPENDED`). Cambiar el rol no está
   * soportado por el backend: cada rol tiene su propio perfil.
   */
  changeStatus: (userId: string, payload: ChangeUserStatusRequest) =>
    httpClient.patch<UserResponse>(`/users/${userId}/status`, payload),

  /** `DELETE /api/v1/users/{userId}/admin` — degrada a un administrador (204). */
  removeAdmin: (userId: string) =>
    httpClient.delete<void>(`/users/${userId}/admin`),

  /** `POST /api/v1/users/{userId}/reset-password` — 204. */
  resetPassword: (userId: string, payload: AdminResetPasswordRequest) =>
    httpClient.post<void>(`/users/${userId}/reset-password`, payload),

  /** `GET /api/v1/users/guides/{guideId}` */
  getGuideProfile: (guideId: string) =>
    httpClient.get<GuideProfileResponse>(`/users/guides/${guideId}`),

  /** `GET /api/v1/users/providers/{providerId}` */
  getProviderProfile: (providerId: string) =>
    httpClient.get<ServiceProviderProfileResponse>(
      `/users/providers/${providerId}`,
    ),

  /** `POST /api/v1/users/{userId}/approve-provider` — admin. */
  approveProvider: (userId: string) =>
    httpClient.post<ServiceProviderProfileResponse>(
      `/users/${userId}/approve-provider`,
    ),

  /** `POST /api/v1/users/{userId}/reject-provider` — admin. */
  rejectProvider: (userId: string) =>
    httpClient.post<ServiceProviderProfileResponse>(
      `/users/${userId}/reject-provider`,
    ),

  /** `POST /api/v1/users/{userId}/approve-guide` — admin. */
  approveGuide: (userId: string) =>
    httpClient.post<GuideProfileResponse>(`/users/${userId}/approve-guide`),

  /** `POST /api/v1/users/{userId}/approve-manager` — admin. */
  approveManager: (userId: string) =>
    httpClient.post<UserResponse>(`/users/${userId}/approve-manager`),
}
