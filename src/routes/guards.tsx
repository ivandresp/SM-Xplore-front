import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import type { UserRole } from '@/types'

/** Redirige a `/login` si no hay sesión, recordando la ruta pedida. */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { isAuthenticated, isRestoring } = useAuth()
  const location = useLocation()

  // Con token guardado, la sesión se valida contra `/users/me`: redirigir
  // antes de saberlo expulsaría al usuario en cada recarga.
  if (isRestoring) {
    return null
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  return children
}

/** Devuelve al inicio si el rol del usuario no tiene acceso a la sección. */
export function RequireRole({
  roles,
  children,
}: {
  roles: UserRole[]
  children: ReactNode
}) {
  const { user } = useAuth()

  if (user === null || !roles.includes(user.role)) {
    return <Navigate to="/app" replace />
  }

  return children
}
