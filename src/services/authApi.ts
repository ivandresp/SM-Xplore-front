import { z } from 'zod'
import { httpClient } from './httpClient'
import { parseResponse } from './validate'
import { toAuthUser, userViewSchema } from './userSchema'
import type {
  AuthUser,
  ForgotPasswordRequest,
  LoginRequest,
  LoginResult,
  RegisterGuideRequest,
  RegisterProviderRequest,
  RegisterTouristRequest,
  ResetPasswordRequest,
  VerifyMfaRequest,
} from '@/types'

const nullableString = z
  .string()
  .nullish()
  .transform((value) => value ?? null)

const loginResultSchema = z.object({
  accessToken: nullableString,
  tokenType: nullableString,
  expiresInSeconds: z.number(),
  expiresAt: z.string(),
  mfaRequired: z.boolean(),
  mfaChallengeToken: nullableString,
})

async function parseLogin(response: unknown): Promise<LoginResult> {
  return parseResponse(loginResultSchema, response, 'POST /auth/login')
}
async function parseCreatedUser(
  response: unknown,
  label: string,
): Promise<AuthUser> {
  return toAuthUser(parseResponse(userViewSchema, response, label))
}

export const authApi = {
  /** 200 con token, 401 credenciales, 403 cuenta no activa, 429 demasiados intentos. */
  login: (payload: LoginRequest) =>
    httpClient.post<unknown>('/auth/login', payload).then(parseLogin),

  /** Segundo paso cuando el login devuelve `mfaRequired`. */
  verifyMfa: (payload: VerifyMfaRequest) =>
    httpClient
      .post<unknown>('/auth/mfa/verify', payload)
      .then((response) =>
        parseResponse(loginResultSchema, response, 'POST /auth/mfa/verify'),
      ),

  /** 201 con el usuario creado. La cuenta nace `ACTIVO`. */
  registerTourist: (payload: RegisterTouristRequest) =>
    httpClient
      .post<unknown>('/auth/register/turista', payload)
      .then((response) =>
        parseCreatedUser(response, 'POST /auth/register/turista'),
      ),

  /**
   * 201 con el alta creada y `registrationStatus: PENDIENTE`; la cuenta no
   * puede iniciar sesión hasta que una gestora la apruebe.
   */
  registerGuide: (payload: RegisterGuideRequest) =>
    httpClient
      .post<unknown>('/auth/register/guia', payload)
      .then((response) =>
        parseCreatedUser(response, 'POST /auth/register/guia'),
      ),

  /** 201 con la prestadora creada; queda pendiente de revisión del admin. */
  registerProvider: (payload: RegisterProviderRequest) =>
    httpClient
      .post<unknown>('/auth/register/prestadora', payload)
      .then((response) =>
        parseCreatedUser(response, 'POST /auth/register/prestadora'),
      ),

  /** 202 siempre, exista o no el correo. */
  forgotPassword: (payload: ForgotPasswordRequest) =>
    httpClient.post<void>('/auth/forgot-password', payload),

  /** 204 con token válido; 400 `INVALID_RESET_TOKEN` si venció o no existe. */
  resetPassword: (payload: ResetPasswordRequest) =>
    httpClient.post<void>('/auth/reset-password', payload),
}
