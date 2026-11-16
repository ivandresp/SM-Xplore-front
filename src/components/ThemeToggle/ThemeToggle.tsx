import { useTheme } from '@/hooks/useTheme'
import type { ThemeMode } from '@/context/theme-context'
import { classNames } from '@/utils/format'
import styles from './ThemeToggle.module.css'

const MODE_LABELS: Record<ThemeMode, string> = {
  light: 'claro',
  dark: 'oscuro',
  system: 'sistema',
}

export interface ThemeToggleProps {
  /** `dark` para la barra navy del panel. */
  tone?: 'light' | 'dark'
  className?: string
}

/** Botón de ciclo: sistema -> claro -> oscuro -> sistema. */
export function ThemeToggle({ tone = 'light', className }: ThemeToggleProps) {
  const { mode, cycle } = useTheme()
  const label = MODE_LABELS[mode]

  return (
    <button
      type="button"
      className={classNames(styles.toggle, tone === 'dark' && styles.dark, className)}
      onClick={cycle}
      aria-label={`Tema ${label}. Cambiar tema`}
      title={`Tema: ${label}`}
    >
      {mode === 'system' && (
        <svg className={styles.icon} viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="8" />
          <path d="M12 4a8 8 0 0 1 0 16Z" fill="currentColor" stroke="none" />
        </svg>
      )}
      {mode === 'light' && (
        <svg className={styles.icon} viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
        </svg>
      )}
      {mode === 'dark' && (
        <svg className={styles.icon} viewBox="0 0 24 24" aria-hidden="true">
          <path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z" />
        </svg>
      )}
    </button>
  )
}
