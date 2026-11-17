import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { classNames } from '@/utils/format'
import styles from './PageHeader.module.css'

export interface Crumb {
  label: string
  to?: string
}

export interface PageHeaderProps {
  /** Ruta de migas; el último elemento se muestra como texto. */
  breadcrumb?: Crumb[]
  title: string
  /** Texto junto al título (p. ej. "248 usuarios"). */
  meta?: string
  description?: string
  /** Botones u acciones alineados a la derecha. */
  actions?: ReactNode
  actionsClassName?: string
  /** Títulos en DM Serif Display (páginas de catálogo, como en los mockups). */
  serif?: boolean
}

/** Encabezado de pantalla del panel: migas, título, metadatos y acciones. */
export function PageHeader({
  breadcrumb,
  title,
  meta,
  description,
  actions,
  actionsClassName,
  serif = false,
}: PageHeaderProps) {
  return (
    <div className={styles.wrapper}>
      <div>
        {breadcrumb !== undefined && breadcrumb.length > 0 && (
          <ol className={styles.breadcrumb}>
            {breadcrumb.map((crumb, index) => (
              <li key={crumb.label} className={styles.crumb}>
                {crumb.to !== undefined && index < breadcrumb.length - 1 ? (
                  <Link to={crumb.to}>{crumb.label}</Link>
                ) : (
                  crumb.label
                )}
                {index < breadcrumb.length - 1 && (
                  <span className={styles.crumbSeparator}> / </span>
                )}
              </li>
            ))}
          </ol>
        )}

        <div className={styles.heading}>
          <h1 className={classNames(styles.title, serif && styles.serif)}>
            {title}
          </h1>
          {meta !== undefined && <span className={styles.meta}>{meta}</span>}
        </div>

        {description !== undefined && (
          <p className={styles.description}>{description}</p>
        )}
      </div>

      {actions !== undefined && <div className={classNames(styles.actions, actionsClassName)}>{actions}</div>}
    </div>
  )
}
