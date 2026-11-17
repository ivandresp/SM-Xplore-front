import { Suspense } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import { translate as t } from '@/i18n/language'
import { useLanguage } from '@/hooks/useLanguage'
import { Button } from '@/components/Button'
import { Footer } from '@/components/Footer'
import { LogoutButton } from '@/components/LogoutButton'
import { Skeleton } from '@/components/Skeleton'
import { TopBar } from '@/components/TopBar'
import { navItemsFor, PUBLIC_NAV, TOURIST_HOME } from '@/config/navigation'
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
  useLanguage()
  const { isAuthenticated, user, logout } = useAuth()
  const isTourist = isAuthenticated && user?.role === 'TOURIST'
  const { pathname } = useLocation()

  const isCatalog = CATALOG_PREFIXES.some((prefix) =>
    pathname.startsWith(prefix),
  )
  const isExploreSection = isCatalog || ['/itinerario', '/mis-reservas'].some(
    (base) => pathname === base || pathname.startsWith(`${base}/`),
  )

  // El buscador aparece en todo el catálogo público, salvo en login y registro.
  const isAuthPage = pathname === '/login' || pathname === '/registro'

  // `/actividades/:id` es el detalle del catálogo de actividades, que vive en
  // `/explorar`: sin el alias el header perdería la ruta activa en el detalle.
  const links = (
    isTourist
      ? isExploreSection
        ? [
            { to: TOURIST_HOME, label: t('Home') },
            ...PUBLIC_NAV,
            { to: '/itinerario', label: t('Mis viajes') },
            { to: '/mis-reservas', label: t('Mis reservas') },
          ]
        : navItemsFor('TOURIST').map(({ to, label }) => ({ to, label }))
      : PUBLIC_NAV
  ).map((link) =>
    link.to === '/explorar' ? { ...link, aliases: ['/actividades'] } : link,
  )

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
              {!isCatalog && !isTourist && (
                <Link to="/app">
                  <Button variant="outline" size="sm">
                    {t("Ir al panel")}</Button>
                </Link>
              )}
              <Link
                to="/perfil"
                className={styles.avatarLink}
                aria-label={t("Mi perfil: {0}", [user?.fullName ?? t('tu cuenta')])}
              >
                <span className={styles.avatar} aria-hidden="true">
                  {user?.fullName.charAt(0).toUpperCase() ?? '?'}
                </span>
              </Link>
              {isTourist && <LogoutButton onClick={logout} tone={isCatalog ? 'dark' : 'light'} />}
            </>
          ) : isCatalog ? (
            <Link to="/login" className={styles.sessionLink}>
              {t("Iniciar sesión")}</Link>
          ) : (
            <Link to={pathname === '/registro' ? '/login' : '/registro'}>
              <Button variant="outline">
                {pathname === '/registro' ? t("Iniciar sesión") : t("Crear cuenta")}
              </Button>
            </Link>
          )
        }
      />

      <main className={styles.main}>
        <Suspense
          fallback={<Skeleton variant="card" count={3} label={t("Cargando la pagina")} />}
        >
          <Outlet />
        </Suspense>
      </main>

      <Footer />
    </div>
  )
}
