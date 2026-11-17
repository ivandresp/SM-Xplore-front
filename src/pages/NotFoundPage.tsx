import { Link } from 'react-router-dom'
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
          <Link to="/app">{t("Volver al inicio")}</Link>
        </p>
      }
    >
      <p>{t("Verifica la dirección o regresa al panel principal.")}</p>
    </AuthShell>
  )
}
