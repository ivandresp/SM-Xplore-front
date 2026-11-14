import { isApiError } from '@/services/httpClient'

export type FieldErrors<K extends string> = Partial<Record<K, string>>

/** Mensaje por campo. El `detail` del backend va en inglés: nunca se muestra. */
export const INVALID_FIELD = 'Revisa este campo.'

/**
 * Enfoca el campo por su `name`. El combobox guarda el `name` en un input
 * oculto, así que en ese caso se enfoca el trigger visible.
 */
export function focusFirstInvalid(
  form: HTMLFormElement | null,
  name: string,
): void {
  if (form === null) {
    return
  }

  const field = Array.from(form.elements).find(
    (element) => element.getAttribute('name') === name,
  ) as HTMLElement | undefined
  if (field === undefined) {
    return
  }

  const target =
    field instanceof HTMLInputElement && field.type === 'hidden'
      ? field.parentElement?.querySelector<HTMLElement>('[role="combobox"]')
      : field

  ;(target ?? field).focus()
}

/** Resumen del formulario: nombra los campos, sin repetir el detalle de cada uno. */
export function summaryOf<K extends string>(
  fields: FieldErrors<K>,
  labels: Record<K, string>,
  order: readonly K[],
): string {
  const named = order.filter((field) => fields[field] !== undefined)
  return `Revisa los datos: ${named.map((field) => labels[field]).join(', ')}.`
}

/**
 * Traduce los `errors` de `ProblemDetail` (`VALIDATION_ERROR`) a un mapa por
 * campo del formulario. Devuelve `null` si el error no es de validación: en ese
 * caso se muestra el mensaje de `describeApiError`.
 */
export function fieldErrorsFrom<K extends string>(
  error: unknown,
  labels: Record<K, string>,
  order: readonly K[],
): { fields: FieldErrors<K>; summary: string; first: K } | null {
  if (!isApiError(error) || error.code !== 'VALIDATION_ERROR') {
    return null
  }

  const source = error.fieldErrors
  if (source === undefined) {
    return null
  }

  const fields: FieldErrors<K> = {}
  for (const field of order) {
    if (source[field] !== undefined) {
      fields[field] = INVALID_FIELD
    }
  }

  const first = order.find((field) => fields[field] !== undefined)
  if (first === undefined) {
    return null
  }

  return { fields, summary: summaryOf(fields, labels, order), first }
}
