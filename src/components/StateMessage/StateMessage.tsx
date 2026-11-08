import type { ReactNode } from 'react'
import { classNames } from '@/utils/format'
import styles from './StateMessage.module.css'

export interface StateMessageProps {
  title: string
  description?: string
  /** `error` lo anuncia como alerta y lo pinta en rojo. */
  tone?: 'neutral' | 'error'
  /** Acción de salida: reintentar, limpiar filtros, ir a otra pantalla. */
  action?: ReactNode
}

/** Bloque de estado para errores y vacíos, siempre con una salida. */
export function StateMessage({
  title,
  description,
  tone = 'neutral',
  action,
}: StateMessageProps) {
  return (
    <div
      className={classNames(styles.state, tone === 'error' && styles.error)}
      role={tone === 'error' ? 'alert' : undefined}
    >
      <p className={styles.title}>{title}</p>
      {description !== undefined && (
        <p className={styles.description}>{description}</p>
      )}
      {action !== undefined && <div className={styles.action}>{action}</div>}
    </div>
  )
}
