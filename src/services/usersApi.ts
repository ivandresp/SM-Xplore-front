import { z } from 'zod'
import { httpClient } from './httpClient'
import { parseResponse } from './validate'
import { toAuthUser, userViewSchema } from './userSchema'
import type {
  AdminUserListParams,
  ChangeUserRoleRequest,
  ChangeUserStatusRequest,
  CreateUserRequest,
  ProviderReviewRequest,
  UpdateMyProfileRequest,
} from '@/types'

const roleSchema = z.enum([
  'ADMIN',
  'GUIDE',
  'SERVICE_PROVIDER',
  'DESTINATION_MANAGER',
  'TOURIST',
])

const providerStatusSchema = z
  .enum(['PENDIENTE', 'APROBADO', 'RECHAZADO'])
  .nullish()
  .transform((value) => value ?? null)

/** `UserSummaryView` de `GET /admin/users`. */
const summarySchema = z.object({
  id: z.string(),
  fullName: z.string(),
  email: z.string(),
  role: roleSchema,
  status: z.enum(['ACTIVO', 'BLOQUEADO', 'SUSPENDIDO', 'ELIMINADO']),
  providerStatus: providerStatusSchema,
  signedUpAt: z.string(),
})

const adminPageSchema = z.object({
  content: z.array(summarySchema),
  page: z.number(),
  size: z.number(),
  totalElements: z.number(),
  totalPages: z.number(),
})

/** `PublicProfileView` de `GET /public/users/{id}`. */
const publicGuideDetailsSchema = z.object({
  license: z.string().nullish().transform((value) => value ?? null),
  startOperationDate: z.string().nullish().transform((value) => value ?? null),
})

const publicProviderDetailsSchema = z.object({
  nit: z.string().nullish().transform((value) => value ?? null),
  businessType: z.string().nullish().transform((value) => value ?? null),
  websiteUrl: z.string().nullish().transform((value) => value ?? null),
  latitude: z.number().nullish().transform((value) => value ?? null),
  longitude: z.number().nullish().transform((value) => value ?? null),
  startOperationDate: z.string().nullish().transform((value) => value ?? null),
})

const publicProfileSchema = z.discriminatedUnion('role', [
  z.object({
    id: z.string(),
    fullName: z.string(),
    role: z.literal('GUIDE'),
    profile: publicGuideDetailsSchema
      .nullish()
      .transform((value) => value ?? null),
  }),
  z.object({
    id: z.string(),
    fullName: z.string(),
    role: z.literal('SERVICE_PROVIDER'),
    profile: publicProviderDetailsSchema
      .nullish()
      .transform((value) => value ?? null),
  }),
])

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

  /** `GET /api/v1/admin/users` — listado paginado con filtros en servidor. */
  list: (params: AdminUserListParams = {}) =>
    httpClient
      .get<unknown>('/admin/users', { query: { ...params } })
      .then((response) =>
        parseResponse(adminPageSchema, response, 'GET /admin/users'),
      ),

  /** `GET /api/v1/admin/users/{id}` — mismo `UserView` que la sesión. */
  getById: (userId: string) =>
    httpClient
      .get<unknown>(`/admin/users/${userId}`)
      .then((response) =>
        toAuthUser(
          parseResponse(userViewSchema, response, 'GET /admin/users/{id}'),
        ),
      ),

  /** `POST /api/v1/admin/users` — 201; envía invitación por correo. */
  create: (payload: CreateUserRequest) =>
    httpClient
      .post<unknown>('/admin/users', payload)
      .then((response) =>
        toAuthUser(
          parseResponse(userViewSchema, response, 'POST /admin/users'),
        ),
      ),

  /** `PATCH /api/v1/admin/users/{id}/status` — 204. */
  changeStatus: (userId: string, payload: ChangeUserStatusRequest) =>
    httpClient.patch<void>(`/admin/users/${userId}/status`, payload),

  /** `PATCH /api/v1/admin/users/{id}/role` — devuelve el `UserView` nuevo. */
  changeRole: (userId: string, payload: ChangeUserRoleRequest) =>
    httpClient
      .patch<unknown>(`/admin/users/${userId}/role`, payload)
      .then((response) =>
        toAuthUser(
          parseResponse(
            userViewSchema,
            response,
            'PATCH /admin/users/{id}/role',
          ),
        ),
      ),

  /** `DELETE /api/v1/admin/users/{id}` — 204; anonimiza la cuenta. */
  remove: (userId: string) => httpClient.delete<void>(`/admin/users/${userId}`),

  /** `POST /api/v1/admin/users/{id}/provider-review` — 204. */
  reviewProvider: (userId: string, payload: ProviderReviewRequest) =>
    httpClient.post<void>(`/admin/users/${userId}/provider-review`, payload),

  /** `POST /api/v1/admin/users/{id}/password-reset` — 202; envía el enlace. */
  requestPasswordReset: (userId: string) =>
    httpClient.post<void>(`/admin/users/${userId}/password-reset`),

  /** `GET /api/v1/public/users/{id}` — solo guías y prestadoras. */
  getPublicProfile: (userId: string) =>
    httpClient
      .get<unknown>(`/public/users/${userId}`)
      .then((response) =>
        parseResponse(publicProfileSchema, response, 'GET /public/users/{id}'),
      ),
}
