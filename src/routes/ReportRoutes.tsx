import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { ManageReportsPage, MyReportsPage } from './pages'

/** Compatibilidad para los enlaces públicos anteriores de guías y prestadoras. */
export function PanelReportRedirect({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const { pathname, search, hash } = useLocation()
  return (user?.role === 'GUIDE' || user?.role === 'SERVICE_PROVIDER')
    ? <Navigate replace to={{ pathname: `/app${pathname}`, search, hash }} />
    : children
}

/** El guard externo autoriza roles; guías y prestadoras conservan la lista propia. */
export function PanelReportsPage() {
  const { user } = useAuth()
  return (user?.role === 'GUIDE' || user?.role === 'SERVICE_PROVIDER') ? <MyReportsPage /> : <ManageReportsPage />
}
