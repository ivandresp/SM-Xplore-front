import { BackButton } from '@/components/BackButton'
import { translate as t } from '@/i18n/language'
import { useLanguage } from '@/hooks/useLanguage'
import { AuthShell } from './auth/AuthShell'

export default function NotFoundPage() {
  useLanguage()
  return (
    <AuthShell
      title={t("Página no encontrada")}
      subtitle={t("La ruta que buscas no existe o no tienes acceso a ella.")}
      footer={
        <p>
          <BackButton to="/app" />
        </p>
      }
    >
      <p>{t("Verifica la dirección o regresa al panel principal.")}</p>
    </AuthShell>
  )
}
