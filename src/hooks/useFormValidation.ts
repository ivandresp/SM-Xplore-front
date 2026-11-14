import { useState } from 'react'
import type { RefObject } from 'react'
import { fieldErrorsFrom, focusFirstInvalid, summaryOf } from '@/utils/formErrors'
import type { FieldErrors } from '@/utils/formErrors'

interface UseFormValidationOptions<K extends string, V> {
  values: V
  /** Errores de cliente derivados de los límites del DTO. */
  validate: (values: V) => FieldErrors<K>
  labels: Record<K, string>
  /** Orden de los campos: decide el foco y el resumen. */
  order: readonly K[]
  formRef: RefObject<HTMLFormElement | null>
}

export interface FormValidation<K extends string> {
  /** Error visible: aparece al salir del campo o tras intentar enviar. */
  errorOf: (field: K) => string | undefined
  markTouched: (field: K) => void
  /** Resumen para el `role="alert"`; solo cuando hay más de un campo con error. */
  summary: string | null
  /** Valida todo. Si hay inválidos, enfoca el primero y devuelve true. */
  blocked: () => boolean
  /** Mapea `ProblemDetail.errors`; devuelve false si el error no es de validación. */
  applyValidationErrors: (error: unknown) => boolean
  clear: () => void
}

/**
 * Estado de validación de un formulario: errores de cliente y de servidor,
 * resumen único y foco al primer campo inválido.
 *
 * Regla: no se marca nada en rojo antes de que el usuario salga del campo o
 * intente enviar. Los mensajes del backend nunca se muestran crudos.
 */
export function useFormValidation<K extends string, V>({
  values,
  validate,
  labels,
  order,
  formRef,
}: UseFormValidationOptions<K, V>): FormValidation<K> {
  const [touched, setTouched] = useState<Partial<Record<K, boolean>>>({})
  const [submitAttempted, setSubmitAttempted] = useState(false)
  const [server, setServer] = useState<FieldErrors<K>>({})
  const [serverSummary, setServerSummary] = useState<string | null>(null)

  const client = validate(values)
  const visible: FieldErrors<K> = {}
  let count = 0

  for (const field of order) {
    const fromServer = server[field]
    if (fromServer !== undefined) {
      visible[field] = fromServer
      count += 1
      continue
    }
    const fromClient = client[field]
    if (fromClient !== undefined && (submitAttempted || touched[field] === true)) {
      visible[field] = fromClient
      count += 1
    }
  }

  return {
    errorOf: (field) => visible[field],
    markTouched: (field) =>
      setTouched((current) =>
        current[field] === true ? current : { ...current, [field]: true },
      ),
    summary: serverSummary ?? (count > 1 ? summaryOf(visible, labels, order) : null),
    blocked: () => {
      setSubmitAttempted(true)
      const first = order.find((field) => client[field] !== undefined)
      if (first === undefined) {
        return false
      }
      focusFirstInvalid(formRef.current, first)
      return true
    },
    applyValidationErrors: (error) => {
      const result = fieldErrorsFrom(error, labels, order)
      if (result === null) {
        return false
      }
      const named = order.filter((field) => result.fields[field] !== undefined)
      setServer(result.fields)
      setSubmitAttempted(true)
      setServerSummary(named.length > 1 ? result.summary : null)
      focusFirstInvalid(formRef.current, result.first)
      return true
    },
    clear: () => {
      setServer({})
      setServerSummary(null)
      setSubmitAttempted(false)
      setTouched({})
    },
  }
}
