import { classNames } from '@/utils/format'
import styles from './Skeleton.module.css'

export type SkeletonVariant = 'text' | 'card' | 'row' | 'table'

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
  /**
   * Si es true, el esqueleto es decorativo: no crea región viva ni se anuncia.
   * Las páginas que ya tienen un contador `role="status"` lo usan para no
   * duplicar el anuncio de carga.
   */
  decorative?: boolean
  /** Líneas de metadatos de la tarjeta que se está imitando (1 o 2). */
  metaLines?: 1 | 2
  /** Si la tarjeta real muestra precio. */
  showPrice?: boolean
}

/**
 * Marcador de carga con la forma del contenido que va a llegar.
 *
 * La variante `card` replica la caja de las tarjetas del catálogo (media 4:3,
 * líneas de texto, precio y acción) y `row` la fila del listado de eventos.
 * Así el cambio a contenido real no mueve el resto de la página.
 */
export function Skeleton({
  variant = 'text',
  count = 3,
  label = 'Cargando',
  className,
  visible = true,
  decorative = false,
  metaLines = 1,
  showPrice = true,
}: SkeletonProps) {
  const items = Array.from({ length: count }, (_, index) => index)
  const statusProps =
    decorative || !visible
      ? { 'aria-hidden': true as const }
      : { role: 'status' as const, 'aria-label': label }
  const rootProps = {
    'data-skeleton': visible ? 'visible' : 'hidden',
    ...statusProps,
  }
  const classes = (variantClass: string) =>
    classNames(variantClass, className, !visible && styles.hidden)
  const block = (...modifiers: string[]) =>
    classNames(styles.block, ...modifiers)

  if (variant === 'card') {
    return (
      <div className={classes(styles.cards)} {...rootProps}>
        {items.map((key) => (
          <div key={key} className={styles.card}>
            <div className={block(styles.cardMedia)} />
            <div className={block(styles.cardTitle)} />
            <div
              className={block(
                metaLines === 2 ? styles.cardMetaWide : styles.cardMeta,
              )}
            />
            {showPrice && <div className={block(styles.cardPrice)} />}
            <div className={block(styles.cardAction)} />
          </div>
        ))}
      </div>
    )
  }

  if (variant === 'row') {
    return (
      <div className={classes(styles.listRows)} {...rootProps}>
        {items.map((key) => (
          <div key={key} className={styles.listRow}>
            <div className={block(styles.rowBadge)} />
            <div className={block(styles.rowThumb)} />
            <div className={styles.rowBody}>
              <div className={block(styles.rowTitle)} />
              <div className={block(styles.rowMeta)} />
            </div>
            <div className={block(styles.rowPrice)} />
          </div>
        ))}
      </div>
    )
  }

  if (variant === 'table') {
    return (
      <div className={classes(styles.rows)} {...rootProps}>
        {items.map((key) => (
          <div key={key} className={block(styles.row)} />
        ))}
      </div>
    )
  }

  return (
    <div className={classes(styles.lines)} {...rootProps}>
      {items.map((key) => (
        <div key={key} className={block(styles.line)} />
      ))}
    </div>
  )
}
