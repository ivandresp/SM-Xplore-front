import { useNavigate } from 'react-router-dom'
import type { To } from 'react-router-dom'
import { Button } from '@/components/Button'
import { useLanguage } from '@/hooks/useLanguage'
import { translate as t } from '@/i18n/language'
import styles from './BackButton.module.css'

/** Regresa al destino de la pantalla, incluso si el detalle se abrió directamente. */
export function BackButton({ to }: { to: To }) {
  useLanguage()
  const navigate = useNavigate()
  return (
    <Button variant="accent" className={styles.backButton} onClick={() => navigate(to)}>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
        <path d="m12 19-7-7 7-7M5 12h14" />
      </svg>
      {t('Volver')}
    </Button>
  )
}
