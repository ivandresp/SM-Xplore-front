import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { TOURIST_HOME } from '@/config/navigation'
import { useAuth } from '@/hooks/useAuth'

/** La entrada espera la sesión restaurada para evitar enviar al turista al catálogo. */
export function HomeRedirect() {
  const { user, isRestoring } = useAuth()
  const { search, hash } = useLocation()
  if (isRestoring) return null
  return <Navigate replace to={{ pathname: user?.role === 'TOURIST' ? TOURIST_HOME : '/explorar', search, hash }} />
}

/** Compatibilidad con marcadores anteriores del panel de turista. */
export function TouristPanelRedirect({ children }: { children: ReactNode }) {
  const { user, isRestoring } = useAuth()
  const { pathname, search, hash, state } = useLocation()
  if (isRestoring) return null
  if (user?.role !== 'TOURIST') return children
  const hasPublicPage = ['/app/perfil', '/app/reportes', '/app/explorar', '/app/mis-reservas'].some((base) => pathname === base || pathname.startsWith(`${base}/`))
  return <Navigate replace to={{ pathname: hasPublicPage ? pathname.slice(4) : TOURIST_HOME, search, hash }} state={state} />
}
