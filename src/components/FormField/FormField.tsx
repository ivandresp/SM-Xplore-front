import { useId } from 'react'
import type { InputHTMLAttributes, ReactNode } from 'react'
import { SelectField as Combobox } from '@/components/SelectField'
import type { SelectChangeEvent } from '@/components/SelectField'
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
        // aria-live="polite": el error se anuncia sin competir con el resumen
        // del formulario, que es el único role="alert".
        <p
          className={styles.error}
          id={`${fieldId}-error`}
          aria-live="polite"
        >
          {error}
        </p>
      )}
    </div>
  )
}

export interface SelectFieldProps {
  label: string
  hint?: string
  id?: string
  options: SelectOption[]
  /** Error del campo: se anuncia con aria-invalid y aria-describedby. */
  error?: string
  value?: string
  placeholder?: string
  name?: string
  disabled?: boolean
  required?: boolean
  className?: string
  'aria-label'?: string
  'aria-describedby'?: string
  onChange?: (event: SelectChangeEvent) => void
  onBlur?: () => void
}

/**
 * Selector con etiqueta asociada automáticamente.
 *
 * Delega en el combobox ARIA 1.2 de `@/components/SelectField`; se conservan
 * el nombre y la API que ya usaban auth y onboarding, sin `<select>` nativo.
 */
export function SelectField(props: SelectFieldProps) {
  return <Combobox {...props} />
}
