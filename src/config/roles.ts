import type {
  AccountStatus,
  ActivityStatus,
  BadgeTone,
  EventStatus,
  PaymentMethod,
  RegistrationStatus,
  ReservationStatus,
  SecurityReportStatus,
  ServiceStatus,
  ServiceType,
  UserRole,
  UserStatus,
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
export const STATUS_LABELS: Record<UserStatus, string> = {
  ACTIVE: 'Activo',
  BLOCKED: 'Bloqueado',
  SUSPENDED: 'Suspendido',
  INACTIVE: 'Inactivo',
}

/** Color de la etiqueta según el estado de la cuenta. */
export const STATUS_TONES: Record<UserStatus, BadgeTone> = {
  ACTIVE: 'success',
  BLOCKED: 'danger',
  SUSPENDED: 'warning',
  INACTIVE: 'neutral',
}

/** Estado del registro de una prestadora de servicios. */
export const REGISTRATION_LABELS: Record<RegistrationStatus, string> = {
  PENDING: 'Pendiente',
  APPROVED: 'Aprobado',
  REJECTED: 'Rechazado',
}

export const REGISTRATION_TONES: Record<RegistrationStatus, BadgeTone> = {
  PENDING: 'warning',
  APPROVED: 'success',
  REJECTED: 'danger',
}

/** Nombre legible del tipo de servicio turístico. */
export const SERVICE_TYPE_LABELS: Record<ServiceType, string> = {
  TRANSPORT: 'Transporte',
  LODGING: 'Alojamiento',
  FEEDING: 'Alimentación',
}

/** Nombre legible del estado de un servicio. */
export const SERVICE_STATUS_LABELS: Record<ServiceStatus, string> = {
  AVAILABLE: 'Disponible',
  UNAVAILABLE: 'No disponible',
}

/** Color de la etiqueta según el estado de un servicio. */
export const SERVICE_STATUS_TONES: Record<ServiceStatus, BadgeTone> = {
  AVAILABLE: 'success',
  UNAVAILABLE: 'neutral',
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
  PENDING: 'Pendiente',
  CONFIRMED: 'Confirmada',
  CANCELLATION_REQUESTED: 'Cancelación solicitada',
  REJECTED: 'Rechazada',
  CANCELLED: 'Cancelada',
  NO_SHOW: 'No asistió',
  COMPLETED: 'Completada',
}

/** Color de la etiqueta según el estado de una reserva. */
export const RESERVATION_STATUS_TONES: Record<ReservationStatus, BadgeTone> = {
  PENDING: 'warning',
  CONFIRMED: 'success',
  CANCELLATION_REQUESTED: 'info',
  REJECTED: 'danger',
  CANCELLED: 'danger',
  NO_SHOW: 'neutral',
  COMPLETED: 'success',
}

/** Nombre legible del estado de la cuenta autenticada (`AccountStatus`). */
export const ACCOUNT_STATUS_LABELS: Record<AccountStatus, string> = {
  ACTIVO: 'Activo',
  BLOQUEADO: 'Bloqueado',
  SUSPENDIDO: 'Suspendido',
  ELIMINADO: 'Eliminado',
}
