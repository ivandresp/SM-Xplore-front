import { classNames } from '@/utils/format'
import styles from './SierraProfile.module.css'

export interface SierraProfileProps {
  /** Traza que se dibuja sola: solo mientras se esperan datos. */
  animate?: boolean
  className?: string
}

/**
 * Perfil de la ladera de Santa Marta: de la bahía al pico Cristóbal Colón.
 *
 * Es la firma visual de la app y solo aparece una vez por página: en el
 * esqueleto de carga, como divisor y en los estados vacíos. Decorativo: el
 * contenedor que lo usa es quien anuncia la carga.
 */
export function SierraProfile({
  animate = false,
  className,
}: SierraProfileProps) {
  return (
    <svg
      className={classNames(styles.profile, animate && styles.animated, className)}
      viewBox="0 0 240 44"
      preserveAspectRatio="none"
      aria-hidden="true"
      focusable="false"
    >
      <path
        className={styles.area}
        d="M0 40 L0 34 L18 31 L36 27 L52 29 L70 22 L88 24 L106 15 L124 18 L142 10 L162 13 L180 6 L200 9 L220 4 L240 6 L240 40 Z"
      />
      <path
        className={styles.line}
        d="M0 34 L18 31 L36 27 L52 29 L70 22 L88 24 L106 15 L124 18 L142 10 L162 13 L180 6 L200 9 L220 4 L240 6"
      />
      <text className={styles.label} x="1" y="42">
        0 m
      </text>
      <text className={styles.label} x="239" y="42" textAnchor="end">
        5.700 m
      </text>
    </svg>
  )
}
