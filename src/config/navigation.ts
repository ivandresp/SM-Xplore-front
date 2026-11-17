import { translate as t } from '@/i18n/language'
import type { UserRole } from '@/types'

export interface NavItem {
  /** Ruta dentro del shell autenticado. */
  to: string
  /**
   * Rutas alternativas en el shell público según el rol: el turista (y, para
   * reportes, también guía y prestadora) vive fuera del panel.
   */
  publicTo?: Partial<Record<UserRole, string>>
  label: string
  /** Qué debe ofrecer esta sección (se usa como texto provisional hasta tener los wireframes). */
  description: string
  /** Roles que pueden ver la sección. */
  roles: UserRole[]
}

/**
 * Secciones de la aplicación. Por ahora son provisionales: cada una es una
 * pantalla pendiente de los wireframes de Figma.
 */
export const NAV_ITEMS: NavItem[] = [
  {
    to: '/explorar',
    get label() { return t("Explorar") },
    get description() { return t("Catálogo público: eventos, actividades y servicios turísticos disponibles, con búsqueda y filtros.") },
    roles: ['TOURIST'],
  },
  {
    to: '/recomendaciones',
    get label() { return t("Para ti") },
    get description() { return t("Recomendaciones personalizadas según los intereses del turista y lo que ha visitado.") },
    roles: ['TOURIST'],
  },
  {
    to: '/mis-reservas',
    get label() { return t("Mis reservas") },
    get description() { return t("Reservas del turista con su estado, total, ítems y acciones (cancelar, solicitar cancelación).") },
    roles: ['TOURIST'],
  },
  {
    to: '/app/mis-actividades',
    get label() { return t("Mis actividades") },
    get description() { return t("Actividades asignadas al guía: agenda, disponibilidad, cupos y estado.") },
    roles: ['GUIDE'],
  },
  {
    to: '/app/disponibilidad',
    get label() { return t("Disponibilidad") },
    get description() { return t("Fechas, cupos por turno, bloqueo de fechas y cierre temporal de la actividad.") },
    roles: ['GUIDE'],
  },
  {
    to: '/app/mis-servicios',
    get label() { return t("Mis servicios") },
    get description() { return t("Servicios de la prestadora: precio, fotos, atributos extra y disponibilidad.") },
    roles: ['SERVICE_PROVIDER'],
  },
  {
    to: '/app/reservas-recibidas',
    get label() { return t("Reservas recibidas") },
    get description() { return t("Reservas recibidas por la prestadora o el guía: confirmar, rechazar, asistencia y no-show.") },
    roles: ['SERVICE_PROVIDER', 'GUIDE'],
  },
  {
    to: '/app/zonas',
    get label() { return t("Zonas") },
    get description() { return t("Zonas turísticas y los sitios (atractivos) que agrupan, con su ubicación y fotos.") },
    roles: ['DESTINATION_MANAGER'],
  },
  {
    to: '/app/eventos',
    get label() { return t("Eventos") },
    get description() { return t("Crear y publicar eventos, estimar asistencia y gestionar su estado.") },
    roles: ['DESTINATION_MANAGER'],
  },
  {
    to: '/app/usuarios',
    get label() { return t("Usuarios") },
    get description() { return t("Registros pendientes de aprobación, búsqueda de usuarios, bloqueo, reactivación y restablecimiento de contraseña.") },
    roles: ['ADMIN'],
  },
  {
    to: '/app/solicitudes',
    get label() { return t("Solicitudes") },
    get description() { return t("Cola de altas de guías y prestadoras: aprobar o rechazar con motivo antes de que puedan operar.") },
    roles: ['DESTINATION_MANAGER', 'ADMIN'],
  },
  {
    to: '/app/reportes',
    publicTo: {
      TOURIST: '/reportes',
      GUIDE: '/reportes',
      SERVICE_PROVIDER: '/reportes',
    },
    get label() { return t("Reportes de seguridad") },
    get description() { return t("Reportar incidentes de seguridad, seguimiento de estado, fotos y comentarios.") },
    roles: [
      'TOURIST',
      'GUIDE',
      'SERVICE_PROVIDER',
      'DESTINATION_MANAGER',
      'ADMIN',
    ],
  },
  {
    to: '/app/perfil',
    publicTo: { TOURIST: '/perfil' },
    get label() { return t("Mi perfil") },
    get description() { return t("Datos personales, actualización del perfil, cambio de contraseña y eliminación de la cuenta.") },
    roles: [
      'TOURIST',
      'GUIDE',
      'SERVICE_PROVIDER',
      'DESTINATION_MANAGER',
      'ADMIN',
    ],
  },
]

/** Secciones visibles para un rol; algunos roles navegan por el shell público. */
export function navItemsFor(role: UserRole): NavItem[] {
  return NAV_ITEMS.filter((item) => item.roles.includes(role)).map((item) => {
    const alternative = item.publicTo?.[role]
    return alternative !== undefined ? { ...item, to: alternative } : item
  })
}

export interface PublicNavItem {
  to: string
  label: string
}

/**
 * Navegación del catálogo público (barra superior).
 * "Actividades" apunta a /explorar, que es la entrada del catálogo.
 */
export const PUBLIC_NAV: PublicNavItem[] = [
  { to: '/atractivos', get label() { return t("Atractivos") } },
  { to: '/explorar', get label() { return t("Actividades") } },
  { to: '/eventos', get label() { return t("Eventos") } },
  { to: '/servicios', get label() { return t("Servicios") } },
]
