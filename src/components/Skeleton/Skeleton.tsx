import { classNames } from '@/utils/format'
import styles from './Skeleton.module.css'

export type SkeletonVariant =
  | 'text'
  | 'card'
  | 'activity-card'
  | 'site-card'
  | 'service-card'
  | 'row'
  | 'table'

export interface SkeletonProps {
  variant?: SkeletonVariant
  /** Bloques a dibujar: líneas, tarjetas o filas según la variante. */
  count?: number
  /** Texto que anuncia el lector de pantalla. */
  label?: string
  className?: string
  /**
   * Si es false, el esqueleto reserva su espacio pero no se pinta ni se anuncia.
   * Permite esperar el retardo sin que la página se recomponga al aparecer.
   */
  visible?: boolean
}

/**
 * Marcador de carga con la forma del contenido que va a llegar.
 *
 * Las variantes de tarjeta y `row` replican la caja de las tarjetas del catálogo y
 * de las filas de eventos (padding, rejilla, medios y líneas de texto) para que
 * el cambio a contenido real no mueva el resto de la página.
 */
export function Skeleton({
  variant = 'text',
  count = 3,
  label = 'Cargando',
  className,
  visible = true,
}: SkeletonProps) {
  const items = Array.from({ length: count }, (_, index) => index)
  const statusProps = visible
    ? { role: 'status' as const, 'aria-label': label }
    : { 'aria-hidden': true as const }
  const classes = (variantClass: string) =>
    classNames(variantClass, className, !visible && styles.hidden)

  const isCard =
    variant === 'card' ||
    variant === 'activity-card' ||
    variant === 'site-card' ||
    variant === 'service-card'

  if (isCard) {
    const isActivity = variant === 'activity-card'
    const hasPrice = variant !== 'site-card'

    return (
      <div className={classes(styles.cards)} {...statusProps}>
        {items.map((key) => (
          <div key={key} className={styles.card}>
            <div className={styles.cardMedia} />
            <div className={styles.cardTitle} />
            <div
              className={isActivity ? styles.cardMetaWide : styles.cardMeta}
            />
            {hasPrice && <div className={styles.cardPrice} />}
            <div className={styles.cardAction} />
          </div>
        ))}
      </div>
    )
  }

  if (variant === 'row') {
    return (
      <div
        className={classes(styles.listRows)}
        {...statusProps}
      >
        {items.map((key) => (
          <div key={key} className={styles.listRow}>
            <div className={styles.rowBadge} />
            <div className={styles.rowThumb} />
            <div className={styles.rowBody}>
              <div className={styles.rowTitle} />
              <div className={styles.rowMeta} />
            </div>
            <div className={styles.rowPrice} />
          </div>
        ))}
      </div>
    )
  }

  if (variant === 'table') {
    return (
      <div
        className={classes(styles.rows)}
        {...statusProps}
      >
        {items.map((key) => (
          <div key={key} className={styles.row} />
        ))}
      </div>
    )
  }

  return (
    <div
      className={classes(styles.lines)}
      {...statusProps}
    >
      {items.map((key) => (
        <div key={key} className={styles.line} />
      ))}
    </div>
  )
}