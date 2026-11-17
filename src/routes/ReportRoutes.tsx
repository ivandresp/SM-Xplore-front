import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { ManageReportsPage, MyReportsPage } from './pages'

/** Compatibilidad para los enlaces públicos anteriores de los guías. */
export function GuideReportRedirect({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const { pathname, search, hash } = useLocation()
  return user?.role === 'GUIDE'
    ? <Navigate replace to={{ pathname: `/app${pathname}`, search, hash }} />
    : children
}

/** El guard externo autoriza roles; el guía conserva la lista propia. */
export function PanelReportsPage() {
  const { user } = useAuth()
  return user?.role === 'GUIDE' ? <MyReportsPage /> : <ManageReportsPage />
}
