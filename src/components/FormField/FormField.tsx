import { useId } from 'react'
import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
} from 'react'
import { classNames } from '@/utils/format'
import styles from './FormField.module.css'

interface SelectOption {
  value: string
  label: string
}

export interface FieldProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'id'> {
  label: string
  hint?: string
  id?: string
  /** Contenido al final del campo (p. ej. "Mostrar" en la contraseña). */
  trailing?: ReactNode
  /** Error del campo: se anuncia con aria-invalid y aria-describedby. */
  error?: string
}

/**
 * Ids estables para `aria-describedby`: la pista y el error se suman a
 * cualquier descripción que ya traiga el campo.
 */
function describedBy(
  fieldId: string,
  hint: string | undefined,
  error: string | undefined,
  existing: string | undefined,
): string | undefined {
  const ids = [
    existing ?? '',
    hint === undefined ? '' : `${fieldId}-hint`,
    error === undefined ? '' : `${fieldId}-error`,
  ].filter((id) => id !== '')

  return ids.length === 0 ? undefined : ids.join(' ')
}

/** Campo de texto con etiqueta asociada automáticamente. */
export function Field({
  label,
  hint,
  id,
  trailing,
  error,
  ...input
}: FieldProps) {
  const generatedId = useId()
  const fieldId = id ?? generatedId

  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor={fieldId}>
        {label}
      </label>
      <div className={styles.controlWrap}>
        <input
          id={fieldId}
          {...input}
          className={classNames(styles.control, input.className)}
          aria-invalid={error === undefined ? undefined : true}
          aria-describedby={describedBy(
            fieldId,
            hint,
            error,
            input['aria-describedby'],
          )}
        />
        {trailing !== undefined && (
          <span className={styles.trailing}>{trailing}</span>
        )}
      </div>
      {hint !== undefined && (
        <p className={styles.hint} id={`${fieldId}-hint`}>
          {hint}
        </p>
      )}
      {error !== undefined && (
        <p className={styles.error} id={`${fieldId}-error`}>
          {error}
        </p>
      )}
    </div>
  )
}

export interface SelectFieldProps
  extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'id'> {
  label: string
  hint?: string
  id?: string
  options: SelectOption[]
  /** Error del campo: se anuncia con aria-invalid y aria-describedby. */
  error?: string
}

/** Selector con etiqueta asociada automáticamente. */
export function SelectField({
  label,
  hint,
  id,
  options,
  error,
  ...select
}: SelectFieldProps) {
  const generatedId = useId()
  const fieldId = id ?? generatedId

  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor={fieldId}>
        {label}
      </label>
      <select
        id={fieldId}
        {...select}
        className={classNames(styles.control, select.className)}
        aria-invalid={error === undefined ? undefined : true}
        aria-describedby={describedBy(
          fieldId,
          hint,
          error,
          select['aria-describedby'],
        )}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {hint !== undefined && (
        <p className={styles.hint} id={`${fieldId}-hint`}>
          {hint}
        </p>
      )}
      {error !== undefined && (
        <p className={styles.error} id={`${fieldId}-error`}>
          {error}
        </p>
      )}
    </div>
  )
}
