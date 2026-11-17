import type { ReactNode } from 'react'
import { useLanguage } from '@/hooks/useLanguage'
import { classNames } from '@/utils/format'
import styles from './DefList.module.css'

export interface DefItem {
  label: string
  value: ReactNode
}

export interface DefListProps {
  items: DefItem[]
  /** En pantallas anchas, dos columnas de pares etiqueta/valor. */
  columns?: 1 | 2
}

/** Lista de pares etiqueta/valor (fichas de datos). */
export function DefList({ items, columns = 2 }: DefListProps) {
  useLanguage()
  return (
    <dl className={classNames(styles.list, columns === 2 && styles.twoColumns)}>
      {items.map((item) => (
        <div key={item.label} className={styles.row}>
          <dt className={styles.label}>{item.label}</dt>
          <dd className={styles.value}>{item.value}</dd>
        </div>
      ))}
    </dl>
  )
}
