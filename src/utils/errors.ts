import { translate as t } from '@/i18n/language'
import { isApiError, isRequestTimeout } from '@/services/httpClient'

const CONNECTION_ERROR =
  'No pudimos conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.'

/**
 * El `detail` del backend llega en inglés y sin salida: aquí se traduce por
 * código estable y nunca se muestra el texto crudo.
 * ms-01 y ms-03 emiten `code`; ms-02, ms-04 y ms-05 caen en las ramas por status.
 */
const CODE_MESSAGES: Record<string, string> = {
  get INVALID_CREDENTIALS() { return t("El correo o la contraseña no son correctos.") },
  get INVALID_FILTER() { return t("Alguno de los filtros no es válido. Revísalos e inténtalo de nuevo.") },
  get UNAUTHORIZED() { return t("La sesión no es válida. Inicia sesión de nuevo.") },
  get ACCESS_DENIED() { return t("Tu cuenta no tiene permiso para realizar esta acción.") },
  get MFA_ENROLLMENT_REQUIRED() { return t("Debes activar la verificación en dos pasos para continuar.") },
  get INVALID_CURRENT_PASSWORD() { return t("La contraseña actual no es correcta.") },
  get EMAIL_ALREADY_EXISTS() { return t("Ya existe una cuenta con ese correo.") },
  get ACCOUNT_NOT_ACTIVE() { return t("La cuenta no está activa. Contacta a un administrador.") },
  // MS01-B8: solo se ven con la contraseña correcta, así que nombran el alta
  // sin convertirse en un oráculo de existencia de cuentas.
  get ACCOUNT_PENDING_REVIEW() { return t("Tu solicitud como guía está en revisión. Podrás iniciar sesión cuando una gestora la apruebe.") },
  get ACCOUNT_REGISTRATION_REJECTED() { return t("Tu solicitud como guía fue rechazada. Revisa el motivo en el correo que te enviamos.") },
  get FORBIDDEN_OPERATION() { return t("La operación no está permitida con esta cuenta.") },
  get INVALID_STATUS_TRANSITION() { return t("La operación no es válida con el estado actual. Recarga la página y vuelve a intentarlo.") },
  get USER_NOT_FOUND() { return t("No se encontró la cuenta.") },
  get REGISTRATION_NOT_FOUND() { return t("No se encontró la solicitud. Recarga la lista y vuelve a intentarlo.") },
  get INVALID_RESET_TOKEN() { return t("El enlace de recuperación no es válido o ya expiró. Solicita uno nuevo.") },
  get MFA_ALREADY_ENABLED() { return t("La verificación en dos pasos ya está activa.") },
  get MFA_NOT_ENABLED() { return t("La verificación en dos pasos no está activa.") },
  get INVALID_MFA_CODE() { return t("El código de verificación no es correcto.") },
  get INVALID_MFA_CHALLENGE() { return t("La verificación expiró. Inicia sesión de nuevo.") },
  get CONCURRENT_UPDATE() { return t("Otra persona modificó este registro. Recarga la página y vuelve a intentarlo.") },
  get DATA_CONFLICT() { return t("El correo, el teléfono, el documento o el NIT ya están registrados. Inicia sesión o usa otros datos.") },
  get VALIDATION_ERROR() { return t("Revisa los datos: hay campos con valores no válidos.") },
  get INVALID_BODY() { return t("La solicitud no es válida. Recarga la página y vuelve a intentarlo.") },
  get INVALID_PARAMETER() { return t("Los parámetros de la solicitud no son válidos.") },
  get DUPLICATE_REVIEW() { return t("Ya registraste una reseña para este ítem.") },
  get REVIEW_ALREADY_REPORTED() { return t("Ya reportaste esta reseña.") },
  get REVIEW_NOT_FOUND() { return t("No se encontró la reseña.") },
  get ANOMALY_NOT_FOUND() { return t("No se encontró la anomalía.") },
  get ANOMALY_ALREADY_RESOLVED() { return t("La anomalía ya estaba resuelta.") },
  get REVIEW_FILTER_UNAVAILABLE() { return t("El filtro de reseñas no está disponible ahora. Vuelve a intentarlo más tarde.") },
}

/**
 * `parseResponse` (services/validate.ts) lanza un `Error` con este prefijo cuando el
 * wire no cuadra con el esquema. No tiene tipo propio porque ese módulo no pertenece a
 * este bloque: aquí se reconoce por el prefijo y un test de `recommendationsApi` fija el
 * formato, así que si allí cambia la redacción el fallo se ve en CI.
 */
const RESPONSE_CONTRACT_PREFIX = 'Respuesta inesperada de '

/**
 * Mensaje de un contrato roto: dice qué pasó, qué hacer y dónde mirar. Es neutro a
 * propósito: hay pantallas sin botón de reintento (preferencias, guardado del perfil).
 * El `detail` del backend nunca se usa aquí porque no es la causa del fallo.
 */
const RESPONSE_CONTRACT_MESSAGE =
  'El servicio devolvió datos en un formato que no reconocemos. Vuelve a intentarlo; si persiste, envía a soporte la hora del fallo y el detalle de la consola del navegador.'

interface ContractDetails {
  label: string
  issues: string
}

function isResponseContractError(error: unknown): error is Error {
  return (
    error instanceof Error &&
    error.message.startsWith(RESPONSE_CONTRACT_PREFIX)
  )
}

/** Parte el mensaje de `parseResponse` en endpoint y issues de zod. */
function readContractDetails(message: string): ContractDetails {
  const rest = message.slice(RESPONSE_CONTRACT_PREFIX.length)
  const separator = rest.indexOf(': ')

  return separator === -1
    ? { label: rest, issues: '' }
    : { label: rest.slice(0, separator), issues: rest.slice(separator + 2) }
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
  if (isRequestTimeout(error)) {
    const seconds = Math.round(error.timeoutMs / 1000)
    return t("El servidor tardó más de {0} s en responder. Espera un momento y vuelve a intentarlo.", [seconds])
  }

  if (isApiError(error)) {
    if (error.code === 'TOO_MANY_ATTEMPTS' || error.code === 'RATE_LIMIT_EXCEEDED') {
      const seconds = error.payload?.retryAfterSeconds
      const lead =
        error.code === 'TOO_MANY_ATTEMPTS'
          ? t("Demasiados intentos.")
          : t("Demasiadas solicitudes.")
      return typeof seconds === 'number'
        ? t("{0} Espera {1} segundos y vuelve a intentarlo.", [lead, seconds])
        : t("{0} Espera un momento y vuelve a intentarlo.", [lead])
    }

    const known = error.code === undefined ? undefined : CODE_MESSAGES[error.code]
    if (known !== undefined) {
      return known
    }

    if (error.status === 401) {
      return t("Necesitas iniciar sesión para ver esta información.")
    }

    if (error.status === 403) {
      return t("Tu cuenta no tiene permiso para ver esta información.")
    }

    if (error.status === 404) {
      return t("No se encontró el recurso solicitado.")
    }

    if (error.status === 405) {
      return t("Esta acción no está disponible en la versión actual del servicio.")
    }

    if (error.status === 409) {
      return t("La operación entra en conflicto con el estado actual. Recarga la página y vuelve a intentarlo.")
    }

    if (error.status === 429) {
      return t("Demasiadas solicitudes. Espera un momento y vuelve a intentarlo.")
    }

    if (error.status === 503) {
      return t("El servicio no está disponible en este momento. Vuelve a intentarlo más tarde.")
    }

    if (error.status >= 500) {
      return t("El backend respondió con un error interno.")
    }

    return t("Revisa los datos enviados: la solicitud no fue aceptada.")
  }

  if (isNetworkFailure(error)) {
    return t(CONNECTION_ERROR)
  }

  if (isResponseContractError(error)) {
    return t(RESPONSE_CONTRACT_MESSAGE)
  }

  return t("Ocurrió un error inesperado. Revisa la consola del navegador.")
}

/** Lo que se escribe en consola: diagnóstico, nunca el `detail` crudo del backend. */
export type ApiErrorLogDetail =
  | { kind: 'timeout'; timeoutMs: number }
  | { kind: 'network'; error: unknown }
  | { kind: 'api'; status: number; code: string | undefined; fieldErrors: Record<string, string> | undefined }
  | { kind: 'contract'; label: string; issues: string; error: Error }
  | { kind: 'unexpected'; error: unknown }

function toLogDetail(error: unknown): ApiErrorLogDetail {
  if (isRequestTimeout(error)) {
    return { kind: 'timeout', timeoutMs: error.timeoutMs }
  }

  if (isApiError(error)) {
    // `ApiError.message` es el `detail` del backend: se omite a propósito.
    return {
      kind: 'api',
      status: error.status,
      code: error.code,
      fieldErrors: error.fieldErrors,
    }
  }

  if (isResponseContractError(error)) {
    const { label, issues } = readContractDetails(error.message)
    return { kind: 'contract', label, issues, error }
  }

  // Mismo criterio que `describeApiError`: un fallo de red no es un bug nuestro.
  if (isNetworkFailure(error)) {
    return { kind: 'network', error }
  }

  return { kind: 'unexpected', error }
}

/**
 * Deja rastro del fallo real en la consola. Se llama desde los `catch` de este bloque
 * (recomendaciones, preferencias y guardado del perfil): sin esto, «Revisa la consola del
 * navegador» apunta a una consola vacía. El resto de pantallas todavía no lo usan.
 */
export function logApiError(error: unknown, context: string): void {
  console.error(`[api] ${context}`, toLogDetail(error))
}
