import { useLocation } from 'react-router-dom'

/** Mantiene los enlaces y retornos dentro del shell que contiene la pantalla. */
export function useReportsPath(): string {
  const { pathname } = useLocation()
  return pathname.startsWith('/app/') ? '/app/reportes' : '/reportes'
}
