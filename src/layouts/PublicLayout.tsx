import { Suspense } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import { Button } from '@/components/Button'
import { Footer } from '@/components/Footer'
import { Skeleton } from '@/components/Skeleton'
import { TopBar } from '@/components/TopBar'
import { PUBLIC_NAV } from '@/config/navigation'
import { useAuth } from '@/hooks/useAuth'
import styles from './PublicLayout.module.css'

/** Rutas del catálogo: en los mockups usan barra navy con buscador teal. */
const CATALOG_PREFIXES = [
  '/atractivos',
  '/explorar',
  '/actividades',
  '/eventos',
  '/servicios',
]

/**
 * Shell de las páginas públicas: barra superior con buscador, contenido y pie.
 * El catálogo usa la variante oscura, como en los mockups.
 */
export function PublicLayout() {
  const { isAuthenticated, user } = useAuth()
  const { pathname } = useLocation()

  const isCatalog = CATALOG_PREFIXES.some((prefix) =>
    pathname.startsWith(prefix),
  )

  // El buscador aparece en todo el catálogo público, salvo en login y registro.
  const isAuthPage = pathname === '/login' || pathname === '/registro'

  const links =
    isAuthenticated && user?.role === 'TOURIST'
      ? [
          ...PUBLIC_NAV,
          { to: '/itinerario', label: 'Mis viajes' },
          { to: '/mis-reservas', label: 'Mis reservas' },
        ]
      : PUBLIC_NAV

  return (
    <div className={styles.shell}>
      <TopBar
        tone={isCatalog ? 'dark' : 'light'}
        search={!isAuthPage}
        links={links}
        currentPath={pathname}
        right={
          isAuthenticated ? (
            <>
              {!isCatalog && (
                <Link to="/app">
                  <Button variant="outline" size="sm">
                    Ir al panel
                  </Button>
                </Link>
              )}
              <Link
                to="/perfil"
                className={styles.avatarLink}
                aria-label={`Mi perfil: ${user?.fullName ?? 'tu cuenta'}`}
              >
                <span className={styles.avatar} aria-hidden="true">
                  {user?.fullName.charAt(0).toUpperCase() ?? '?'}
                </span>
              </Link>
            </>
          ) : isCatalog ? (
            <Link to="/login" className={styles.sessionLink}>
              Iniciar sesión
            </Link>
          ) : (
            <Link to="/registro">
              <Button variant="outline">Crear cuenta</Button>
            </Link>
          )
        }
      />

      <main className={styles.main}>
        <Suspense
          fallback={<Skeleton variant="card" count={3} label="Cargando la pagina" />}
        >
          <Outlet />
        </Suspense>
      </main>

      <Footer />
    </div>
  )
}
