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
  TOURIST: 'Turista',
  GUIDE: 'Guía turístico',
  SERVICE_PROVIDER: 'Prestadora de servicios',
  DESTINATION_MANAGER: 'Gestora de destinos',
  ADMIN: 'Administrador',
}

/** Nombre legible del estado de una cuenta. */
export const ACCOUNT_STATUS_LABELS: Record<AccountStatus, string> = {
  ACTIVO: 'Activo',
  BLOQUEADO: 'Bloqueado',
  SUSPENDIDO: 'Suspendido',
  ELIMINADO: 'Eliminado',
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
  PENDIENTE: 'Pendiente',
  APROBADO: 'Aprobada',
  RECHAZADO: 'Rechazada',
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
  TRANSPORT: 'Transporte',
  LODGING: 'Alojamiento',
  FEEDING: 'Alimentación',
}

/** Nombre legible del tipo de servicio; si el backend trae otro, se muestra tal cual. */
export function serviceTypeLabel(type: string): string {
  return SERVICE_TYPE_LABELS[type] ?? type
}

/** Nombre legible del estado de un sitio o servicio. */
export const CONTENT_STATUS_LABELS: Record<ContentStatus, string> = {
  DRAFT: 'Borrador',
  PUBLISHED: 'Publicado',
  INACTIVE: 'Inactivo',
}

/** Color de la etiqueta según el estado de un sitio o servicio. */
export const CONTENT_STATUS_TONES: Record<ContentStatus, BadgeTone> = {
  DRAFT: 'neutral',
  PUBLISHED: 'success',
  INACTIVE: 'warning',
}

/** Nombre legible del estado de una actividad. */
export const ACTIVITY_STATUS_LABELS: Record<ActivityStatus, string> = {
  DRAFT: 'Borrador',
  PUBLISHED: 'Publicada',
  PAUSED: 'Pausada',
  CANCELLED: 'Cancelada',
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
  CARD: 'Tarjeta',
  CASH: 'Efectivo',
  TRANSFER: 'Transferencia',
}

/** Nombre legible del estado de un evento. */
export const EVENT_STATUS_LABELS: Record<EventStatus, string> = {
  DRAFT: 'Borrador',
  PUBLISHED: 'Publicado',
  POSTPONED: 'Pospuesto',
  CANCELLED: 'Cancelado',
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
  ONGOING: 'En curso',
  REPORTED: 'Reportado',
  SOLVED: 'Resuelto',
}

/** Color de la etiqueta según el estado de un reporte. */
export const REPORT_STATUS_TONES: Record<SecurityReportStatus, BadgeTone> = {
  ONGOING: 'warning',
  REPORTED: 'info',
  SOLVED: 'success',
}

/** Nombre legible del estado de una reserva. */
export const RESERVATION_STATUS_LABELS: Record<ReservationStatus, string> = {
  CONFIRMED: 'Confirmada',
  CANCELLED: 'Cancelada',
  NO_SHOW: 'No asistió',
  COMPLETED: 'Asistió',
}

/** Color de la etiqueta según el estado de una reserva. */
export const RESERVATION_STATUS_TONES: Record<ReservationStatus, BadgeTone> = {
  CONFIRMED: 'success',
  CANCELLED: 'danger',
  NO_SHOW: 'neutral',
  COMPLETED: 'info',
}
