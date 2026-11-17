import { translate as t } from '@/i18n/language'
import type {
  AccountStatus,
  ActivityStatus,
  BadgeTone,
  ContentStatus,
  EventStatus,
  PaymentMethod,
  ProviderRegistrationStatus,
  ReservationStatus,
  SecurityReportStatus,
  UserRole,
} from '@/types'

/** Nombre legible de cada rol (los cinco actores del SRS). */
export const ROLE_LABELS: Record<UserRole, string> = {
  get TOURIST() { return t("Turista") },
  get GUIDE() { return t("Guía turístico") },
  get SERVICE_PROVIDER() { return t("Prestadora de servicios") },
  get DESTINATION_MANAGER() { return t("Gestora de destinos") },
  get ADMIN() { return t("Administrador") },
}

/** Nombre legible del estado de una cuenta. */
export const ACCOUNT_STATUS_LABELS: Record<AccountStatus, string> = {
  get ACTIVO() { return t("Activo") },
  get BLOQUEADO() { return t("Bloqueado") },
  get SUSPENDIDO() { return t("Suspendido") },
  get ELIMINADO() { return t("Eliminado") },
}

/** Color de la etiqueta según el estado de una cuenta. */
export const ACCOUNT_STATUS_TONES: Record<AccountStatus, BadgeTone> = {
  ACTIVO: 'success',
  BLOQUEADO: 'danger',
  SUSPENDIDO: 'warning',
  ELIMINADO: 'neutral',
}

/** Estado del registro de una prestadora de servicios. */
export const PROVIDER_STATUS_LABELS: Record<
  ProviderRegistrationStatus,
  string
> = {
  get PENDIENTE() { return t("Pendiente") },
  get APROBADO() { return t("Aprobada") },
  get RECHAZADO() { return t("Rechazada") },
}

export const PROVIDER_STATUS_TONES: Record<
  ProviderRegistrationStatus,
  BadgeTone
> = {
  PENDIENTE: 'warning',
  APROBADO: 'success',
  RECHAZADO: 'danger',
}

/** Tipos de servicio que ofrece el formulario; el backend acepta cualquier texto. */
const SERVICE_TYPE_LABELS: Record<string, string> = {
  get TRANSPORT() { return t("Transporte") },
  get LODGING() { return t("Alojamiento") },
  get FEEDING() { return t("Alimentación") },
}

/** Nombre legible del tipo de servicio; si el backend trae otro, se muestra tal cual. */
export function serviceTypeLabel(type: string): string {
  return SERVICE_TYPE_LABELS[type] ?? type
}

/** Nombre legible del estado de un sitio o servicio. */
export const CONTENT_STATUS_LABELS: Record<ContentStatus, string> = {
  get DRAFT() { return t("Borrador") },
  get PUBLISHED() { return t("Publicado") },
  get INACTIVE() { return t("Inactivo") },
}

/** Color de la etiqueta según el estado de un sitio o servicio. */
export const CONTENT_STATUS_TONES: Record<ContentStatus, BadgeTone> = {
  DRAFT: 'neutral',
  PUBLISHED: 'success',
  INACTIVE: 'warning',
}

/** Nombre legible del estado de una actividad. */
export const ACTIVITY_STATUS_LABELS: Record<ActivityStatus, string> = {
  get DRAFT() { return t("Borrador") },
  get PUBLISHED() { return t("Publicada") },
  get PAUSED() { return t("Pausada") },
  get CANCELLED() { return t("Cancelada") },
}

/** Color de la etiqueta según el estado de una actividad. */
export const ACTIVITY_STATUS_TONES: Record<ActivityStatus, BadgeTone> = {
  DRAFT: 'neutral',
  PUBLISHED: 'success',
  PAUSED: 'warning',
  CANCELLED: 'danger',
}

/** Nombre legible del método de pago de una reserva. */
export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  get CARD() { return t("Tarjeta") },
  get CASH() { return t("Efectivo") },
  get TRANSFER() { return t("Transferencia") },
}

/** Nombre legible del estado de un evento. */
export const EVENT_STATUS_LABELS: Record<EventStatus, string> = {
  get DRAFT() { return t("Borrador") },
  get PUBLISHED() { return t("Publicado") },
  get POSTPONED() { return t("Pospuesto") },
  get CANCELLED() { return t("Cancelado") },
}

/** Color de la etiqueta según el estado de un evento. */
export const EVENT_STATUS_TONES: Record<EventStatus, BadgeTone> = {
  DRAFT: 'neutral',
  PUBLISHED: 'success',
  POSTPONED: 'warning',
  CANCELLED: 'danger',
}

/** Nombre legible del estado de un reporte de seguridad. */
export const REPORT_STATUS_LABELS: Record<SecurityReportStatus, string> = {
  get ONGOING() { return t("En curso") },
  get REPORTED() { return t("Reportado") },
  get SOLVED() { return t("Resuelto") },
}

/** Color de la etiqueta según el estado de un reporte. */
export const REPORT_STATUS_TONES: Record<SecurityReportStatus, BadgeTone> = {
  ONGOING: 'warning',
  REPORTED: 'info',
  SOLVED: 'success',
}

/** Nombre legible del estado de una reserva. */
export const RESERVATION_STATUS_LABELS: Record<ReservationStatus, string> = {
  get CONFIRMED() { return t("Confirmada") },
  get CANCELLED() { return t("Cancelada") },
  get NO_SHOW() { return t("No asistió") },
  get COMPLETED() { return t("Asistió") },
}

/** Color de la etiqueta según el estado de una reserva. */
export const RESERVATION_STATUS_TONES: Record<ReservationStatus, BadgeTone> = {
  CONFIRMED: 'success',
  CANCELLED: 'danger',
  NO_SHOW: 'neutral',
  COMPLETED: 'info',
}
