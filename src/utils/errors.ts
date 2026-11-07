import { isApiError } from '@/services/httpClient'

const CONNECTION_ERROR =
  'No se pudo conectar con el backend. Verifica que el gateway esté corriendo en http://127.0.0.1:8088.'

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
    if (error.status === 404) {
      return 'No se encontró el recurso solicitado.'
    }

    if (error.status === 409) {
      return `Conflicto: ${error.message}`
    }

    if (error.status >= 500) {
      return 'El backend respondió con un error interno.'
    }

    return error.message
  }

  if (isNetworkFailure(error)) {
    return CONNECTION_ERROR
  }

  return 'Ocurrió un error inesperado. Revisa la consola del navegador.'
}
