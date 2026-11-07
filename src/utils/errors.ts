import { isApiError } from '@/services/httpClient'

const CONNECTION_ERROR =
  'No se pudo conectar con el backend. Verifica que el gateway esté corriendo en http://127.0.0.1:8088.'

/**
 * El `detail` del backend llega en inglés y sin salida: aquí se traduce por
 * código estable y nunca se muestra el texto crudo.
 */
const CODE_MESSAGES: Record<string, string> = {
  INVALID_CREDENTIALS: 'El correo o la contraseña no son correctos.',
  INVALID_CURRENT_PASSWORD: 'La contraseña actual no es correcta.',
  EMAIL_ALREADY_EXISTS: 'Ya existe una cuenta con ese correo.',
  ACCOUNT_NOT_ACTIVE: 'La cuenta no está activa. Contacta a un administrador.',
  FORBIDDEN_OPERATION: 'La operación no está permitida con esta cuenta.',
  INVALID_STATUS_TRANSITION:
    'La operación no es válida con el estado actual. Recarga la página y vuelve a intentarlo.',
  USER_NOT_FOUND: 'No se encontró la cuenta.',
  INVALID_RESET_TOKEN:
    'El enlace de recuperación no es válido o ya expiró. Solicita uno nuevo.',
  MFA_ALREADY_ENABLED: 'La verificación en dos pasos ya está activa.',
  MFA_NOT_ENABLED: 'La verificación en dos pasos no está activa.',
  INVALID_MFA_CODE: 'El código de verificación no es correcto.',
  INVALID_MFA_CHALLENGE: 'La verificación expiró. Inicia sesión de nuevo.',
  CONCURRENT_UPDATE:
    'Otra persona modificó este registro. Recarga la página y vuelve a intentarlo.',
  DATA_CONFLICT: 'Ya existe un registro con esos datos.',
  VALIDATION_ERROR: 'Revisa los datos: hay campos con valores no válidos.',
  INVALID_BODY:
    'La solicitud no es válida. Recarga la página y vuelve a intentarlo.',
  INVALID_PARAMETER: 'Los parámetros de la solicitud no son válidos.',
  DUPLICATE_REVIEW: 'Ya registraste una reseña para este ítem.',
  REVIEW_ALREADY_REPORTED: 'Ya reportaste esta reseña.',
}

/**
 * `fetch` falla con un `TypeError` de red; cualquier otro error no-HTTP es un bug
 * nuestro y decir «no se pudo conectar» lo esconde.
 */
function isNetworkFailure(error: unknown): boolean {
  return (
    error instanceof TypeError &&
    /fetch|network|load failed|failed to load/i.test(error.message)
  )
}

/** Mensaje legible para los errores devueltos por la API. */
export function describeApiError(error: unknown): string {
  if (isApiError(error)) {
    if (error.code === 'TOO_MANY_ATTEMPTS') {
      const seconds = error.payload?.retryAfterSeconds
      return typeof seconds === 'number'
        ? `Demasiados intentos. Espera ${seconds} segundos y vuelve a intentarlo.`
        : 'Demasiados intentos. Espera un momento y vuelve a intentarlo.'
    }

    const known = error.code === undefined ? undefined : CODE_MESSAGES[error.code]
    if (known !== undefined) {
      return known
    }

    if (error.status === 401) {
      return 'Necesitas iniciar sesión para ver esta información.'
    }

    if (error.status === 403) {
      return 'Tu cuenta no tiene permiso para ver esta información.'
    }

    if (error.status === 404) {
      return 'No se encontró el recurso solicitado.'
    }

    if (error.status === 409) {
      return 'La operación entra en conflicto con el estado actual. Recarga la página y vuelve a intentarlo.'
    }

    if (error.status === 429) {
      return 'Demasiadas solicitudes. Espera un momento y vuelve a intentarlo.'
    }

    if (error.status >= 500) {
      return 'El backend respondió con un error interno.'
    }

    return 'Revisa los datos enviados: la solicitud no fue aceptada.'
  }

  if (isNetworkFailure(error)) {
    return CONNECTION_ERROR
  }

  return 'Ocurrió un error inesperado. Revisa la consola del navegador.'
}
