import { useEffect, useId, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { classNames } from '@/utils/format'
import { Skeleton } from '@/components/Skeleton'
import styles from './DataTable.module.css'

export interface Column<T> {
  header: ReactNode
  render: (row: T) => ReactNode
  /** Alinea el contenido a la derecha (acciones, importes…). */
  align?: 'left' | 'right'
  className?: string
}

export interface DataTableProps<T> {
  columns: Column<T>[]
  rows: T[]
  rowKey: (row: T) => string
  /** Mensaje cuando no hay filas. */
  emptyMessage?: string
  /** Acción de salida cuando no hay filas (crear, limpiar filtros…). */
  emptyAction?: ReactNode
  /** Mientras la primera carga está en curso. */
  isLoading?: boolean
  loadingMessage?: string
  /** Nombre accesible de la región desplazable. */
  label?: string
}

/**
 * Detecta si el contenedor desborda en horizontal. Sin esto la tabla ancha
 * se recorta sin aviso en móvil; el aviso solo aparece cuando hace falta.
 */
function useHorizontalOverflow(rowCount: number) {
  const ref = useRef<HTMLDivElement>(null)
  const [scrollable, setScrollable] = useState(false)

  useEffect(() => {
    const element = ref.current

    if (element === null) {
      return
    }

    function measure() {
      if (element === null) {
        return
      }
      setScrollable(element.scrollWidth > element.clientWidth + 1)
    }

    measure()
    window.addEventListener('resize', measure)

    if (typeof ResizeObserver === 'undefined') {
      return () => window.removeEventListener('resize', measure)
    }

    const observer = new ResizeObserver(measure)
    observer.observe(element)

    return () => {
      observer.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [rowCount])

  return { ref, scrollable }
}

/** Tabla de datos con encabezado, carga y estado vacío. */
export function DataTable<T>({
  columns,
  rows,
  rowKey,
  emptyMessage = 'Sin resultados.',
  emptyAction,
  isLoading = false,
  loadingMessage = 'Cargando…',
  label = 'Tabla de datos',
}: DataTableProps<T>) {
  const hintId = useId()
  const { ref, scrollable } = useHorizontalOverflow(rows.length)

  if (isLoading) {
    return (
      <div className={styles.wrapper}>
        <Skeleton
          variant="table"
          count={5}
          label={loadingMessage}
          className={styles.skeleton}
        />
      </div>
    )
  }

  return (
    <>
      {scrollable && (
        <p id={hintId} className={styles.hint}>
          Desliza la tabla en horizontal para ver todas las columnas.
        </p>
      )}

      <div
        ref={ref}
        className={styles.wrapper}
        role="region"
        aria-label={label}
        aria-describedby={scrollable ? hintId : undefined}
        tabIndex={0}
      >
        <table className={styles.table}>
          <thead>
            <tr>
              {columns.map((column, index) => (
                <th
                  key={index}
                  className={classNames(
                    column.align === 'right' && styles.alignRight,
                    column.className,
                  )}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td className={styles.empty} colSpan={columns.length}>
                  {emptyMessage}
                  {emptyAction !== undefined && (
                    <div className={styles.emptyAction}>{emptyAction}</div>
                  )}
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={rowKey(row)}>
                  {columns.map((column, index) => (
                    <td
                      key={index}
                      className={classNames(
                        column.align === 'right' && styles.alignRight,
                        column.className,
                      )}
                    >
                      {column.render(row)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  )
}