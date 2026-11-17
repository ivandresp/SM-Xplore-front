import { useLanguage } from '@/hooks/useLanguage'
import { classNames } from '@/utils/format'
import styles from './LogoutButton.module.css'

export interface LogoutButtonProps {
  onClick: () => void | Promise<void>
  tone?: 'light' | 'dark'
}

/** Acción de cierre de sesión compartida por los dos shells. */
export function LogoutButton({ onClick, tone = 'light' }: LogoutButtonProps) {
  const { t } = useLanguage()
  return (
    <button type="button" className={classNames(styles.button, tone === 'dark' && styles.dark)} onClick={onClick} aria-label={t('Salir')} title={t('Salir')}>
      <svg className={styles.icon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
        <path d="M9 4H4v16h5M10 12h11m-4-4 4 4-4 4" />
      </svg>
    </button>
  )
}
