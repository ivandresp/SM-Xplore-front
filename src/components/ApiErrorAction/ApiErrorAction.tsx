import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/Button'
import type { ButtonProps } from '@/components/Button'
import { useAuth } from '@/hooks/useAuth'
import { useLanguage } from '@/hooks/useLanguage'
import { clearToken } from '@/services/authToken'
import { isApiError } from '@/services/httpClient'

interface ApiErrorActionProps {
  error: unknown
  onRetry: () => void
  variant?: ButtonProps['variant']
  size?: ButtonProps['size']
  disabled?: boolean
}

function SessionExitButton({ variant, size }: Pick<ApiErrorActionProps, 'variant' | 'size'>) {
  const { t } = useLanguage()
  const { logout } = useAuth()
  const navigate = useNavigate()
  const [isLeaving, setIsLeaving] = useState(false)

  async function exitSession() {
    if (isLeaving) return
    setIsLeaving(true)
    try {
      await logout()
    } catch {
      // El servidor puede rechazar el cierre porque la sesión ya venció.
    } finally {
      clearToken()
      navigate('/login', { replace: true })
    }
  }

  return <Button variant={variant} size={size} loading={isLeaving} onClick={() => void exitSession()}>{t('Cerrar sesión')}</Button>
}

/** Un 401 requiere volver a autenticarse; los demás errores conservan el reintento. */
export function ApiErrorAction({ error, onRetry, variant, size, disabled }: ApiErrorActionProps) {
  const { t } = useLanguage()
  if (isApiError(error) && error.status === 401) {
    return <SessionExitButton variant={variant} size={size} />
  }
  return <Button variant={variant} size={size} disabled={disabled} onClick={onRetry}>{t('Reintentar')}</Button>
}
