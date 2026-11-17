import { useLanguage } from '@/hooks/useLanguage'
import { classNames } from '@/utils/format'
import styles from './Avatar.module.css'

export interface AvatarProps {
  /** Nombre del que se toman las iniciales. */
  name: string
  size?: 'sm' | 'md' | 'lg'
  shape?: 'circle' | 'square'
}

function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
}

/** Círculo (o cuadrado redondeado) con las iniciales del usuario. */
export function Avatar({ name, size = 'md', shape = 'circle' }: AvatarProps) {
  useLanguage()
  return (
    <span
      className={classNames(
        styles.avatar,
        styles[size],
        shape === 'square' && styles.square,
      )}
      aria-hidden="true"
    >
      {initialsOf(name)}
    </span>
  )
}
