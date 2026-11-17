import { useLanguage } from '@/hooks/useLanguage'

/** Keep the lazy route's loading announcement reactive while its module loads. */
export function RouterFallback() {
  const { t } = useLanguage()
  return <p role="status">{t('Preparando tu bienvenida…')}</p>
}
