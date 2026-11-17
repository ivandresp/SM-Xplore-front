import { classNames } from '@/utils/format'
import styles from './Logo.module.css'

export interface LogoProps {
  size?: 'md' | 'lg'
}

/** Marca gráfica original, con proporción reservada antes de cargar. */
export function Logo({ size = 'md' }: LogoProps) {
  return (
    <img
      className={classNames(styles.logo, styles[size])}
      src={`${import.meta.env.BASE_URL}SM-Xplore-Icon.png`}
      alt="SM-Xplore"
      width={1447}
      height={1087}
      decoding="async"
      fetchPriority="high"
    />
  )
}
