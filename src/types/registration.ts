import type { PageResponse } from './common'
import type { UserRole } from './user'

/**
 * Roles con alta pública que una gestora revisa. Turista y gestora nacen sin
 * cola: el backend responde 400 para cualquier otro rol.
 */
export type RegistrationRole = Extract<UserRole, 'GUIDE' | 'SERVICE_PROVIDER'>

/**
 * `RegistrationStatus` de ms-01 (`RegistrationStatus.java:9-13`). Es la misma
 * máquina de estados para guías y prestadoras.
 */
export type RegistrationStatus = 'PENDIENTE' | 'APROBADO' | 'RECHAZADO'

/** Estados que acepta `GET /registrations`: `APROBADO` devuelve 400. */
export type QueueableRegistrationStatus = Exclude<
  RegistrationStatus,
  'APROBADO'
>

/**
 * Fila de `RegistrationSummaryView.java:13-21`. `license` solo en guías y
 * `nit` solo en prestadoras; nunca viajan documentos ni credenciales.
 */
export interface RegistrationSummary {
  id: string
  role: RegistrationRole
  fullName: string
  email: string
  license: string | null
  nit: string | null
  signedUpAt: string
  registrationStatus: RegistrationStatus
}

/** `RegistrationPage.java:11`: comparte el sobre de `PageResponse` de ms-03/ms-04. */
export type RegistrationPage = PageResponse<RegistrationSummary>

export interface RegistrationQueueParams {
  role: RegistrationRole
  status: QueueableRegistrationStatus
  /** 0-based, como el resto de listados paginados. */
  page?: number
  /** 1..100: el backend responde 400 fuera de ese rango. */
  size?: number
}

/** `RegistrationReviewRequest.java:7-9`: `reason` obligatorio al rechazar. */
export interface RegistrationReviewRequest {
  decision: Exclude<RegistrationStatus, 'PENDIENTE'>
  reason?: string
}
