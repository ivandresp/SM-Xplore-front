import { classNames } from '@/utils/format'
import styles from './Skeleton.module.css'

export type SkeletonVariant = 'text' | 'card' | 'table'

export interface SkeletonProps {
  variant?: SkeletonVariant
  /** Bloques a dibujar: líneas, tarjetas o filas según la variante. */
  count?: number
  /** Texto que anuncia el lector de pantalla. */
  label?: string
  className?: string
}

/** Marcador de carga con la forma del contenido que va a llegar. */
export function Skeleton({
  variant = 'text',
  count = 3,
  label = 'Cargando',
  className,
}: SkeletonProps) {
  const items = Array.from({ length: count }, (_, index) => index)

  if (variant === 'card') {
    return (
      <div
        className={classNames(styles.cards, className)}
        role="status"
        aria-label={label}
      >
        {items.map((key) => (
          <div key={key} className={styles.card} />
        ))}
      </div>
    )
  }

  if (variant === 'table') {
    return (
      <div
        className={classNames(styles.rows, className)}
        role="status"
        aria-label={label}
      >
        {items.map((key) => (
          <div key={key} className={styles.row} />
        ))}
      </div>
    )
  }

  return (
    <div
      className={classNames(styles.lines, className)}
      role="status"
      aria-label={label}
    >
      {items.map((key) => (
        <div key={key} className={styles.line} />
      ))}
    </div>
  )
}
