import { useLanguage } from '@/hooks/useLanguage'
import { classNames } from '@/utils/format'
import styles from './LanguageToggle.module.css'

export interface LanguageToggleProps {
  tone?: 'light' | 'dark'
  className?: string
}

/** The visible abbreviation is the current language; the accessible name describes the action. */
export function LanguageToggle({ tone = 'light', className }: LanguageToggleProps) {
  const { language, setLanguage } = useLanguage()
  const label = language === 'es' ? 'Cambiar idioma a inglés' : 'Switch language to Spanish'
  return (
    <button
      type="button"
      className={classNames(styles.toggle, tone === 'dark' && styles.dark, className)}
      onClick={() => setLanguage(language === 'es' ? 'en' : 'es')}
      aria-label={label}
      title={label}
    >
      <span aria-hidden="true">{language.toUpperCase()}</span>
    </button>
  )
}
