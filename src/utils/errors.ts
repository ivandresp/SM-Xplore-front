import { isApiError } from '@/services/httpClient'

const CONNECTION_ERROR =
  'No se pudo conectar con el backend. Verifica que el gateway esté corriendo en http://127.0.0.1:8088.'

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

  return CONNECTION_ERROR
}
