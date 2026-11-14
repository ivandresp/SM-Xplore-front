import type { ButtonHTMLAttributes } from 'react'
import { classNames } from '@/utils/format'
import styles from './Button.module.css'

/**
 * `primary`: la acción que cierra la tarea, una por vista.
 * `accent`: énfasis secundario de la misma vista; nunca para reintentar ni borrar.
 * `outline`/`outlineAccent`: acciones de apoyo.
 */
export type ButtonVariant = 'primary' | 'accent' | 'outline' | 'outlineAccent'

export type ButtonSize = 'sm' | 'md' | 'lg'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  /** Ocupa todo el ancho disponible. */
  block?: boolean
  /** Bloquea el doble submit y lo anuncia con `aria-busy`. */
  loading?: boolean
}

export function Button({
  variant = 'primary',
  size = 'md',
  block = false,
  loading = false,
  disabled = false,
  className,
  type = 'button',
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      type={type}
      className={classNames(
        styles.button,
        styles[variant],
        styles[size],
        block && styles.block,
        className,
      )}
      aria-busy={loading || undefined}
      disabled={disabled || loading}
    >
      {loading && <span className={styles.spinner} aria-hidden="true" />}
      {children}
    </button>
  )
}
