import { Suspense } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { translate as t } from '@/i18n/language'
import { useLanguage } from '@/hooks/useLanguage'
import { Skeleton } from '@/components/Skeleton'
import { TopBar } from '@/components/TopBar'
import { navItemsFor } from '@/config/navigation'
import { ACCOUNT_STATUS_LABELS, ROLE_LABELS } from '@/config/roles'
import { useAuth } from '@/hooks/useAuth'
import styles from './AppLayout.module.css'

function linkClassName({ isActive }: { isActive: boolean }) {
  return isActive ? `${styles.link} ${styles.active}` : styles.link
}

/** Shell del panel de gestión: barra navy + menú lateral según el rol. */
export function AppLayout() {
  useLanguage()
  const { user, logout } = useAuth()
  const { pathname } = useLocation()

  if (user === null) {
    return null
  }

  // En pantallas estrechas la barra lateral no cabe: las mismas secciones
  // viven en el menú móvil de la barra superior.
  const sections = [
    { to: '/app', label: 'Dashboard' },
    ...navItemsFor(user.role).map((item) => ({
      to: item.to,
      label: item.label,
    })),
  ]

  return (
    <div className={styles.shell}>
      <TopBar
        sticky
        tone="dark"
        currentPath={pathname}
        menuLinks={sections}
        right={
          <>
            <span className={styles.role}>
              {user.role === 'SERVICE_PROVIDER' ? (
                <>
                  <span className={styles.providerFull}>{ROLE_LABELS[user.role]}</span>
                  <span className={styles.providerShort}>{t("Prestadora")}</span>
                </>
              ) : ROLE_LABELS[user.role]}
            </span>
            <button
              type="button"
              className={styles.logout}
              onClick={logout}
              aria-label={t("Salir")}
              title={t("Salir")}
            >
              <svg className={styles.logoutIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
                <path d="M9 4H4v16h5M10 12h11m-4-4 4 4-4 4" />
              </svg>
            </button>
          </>
        }
      />

      <div className={styles.body}>
        <aside className={styles.sidebar}>
          <nav className={styles.nav}>
            <NavLink to="/app" end className={linkClassName}>
              Dashboard
            </NavLink>
            {navItemsFor(user.role).map((item) => (
              <NavLink key={item.to} to={item.to} className={linkClassName}>
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className={styles.userBox}>
            <p className={styles.userName}>{user.fullName}</p>
            <p className={styles.userMeta}>
              {ACCOUNT_STATUS_LABELS[user.status]}
            </p>
          </div>
        </aside>

        <main className={styles.content}>
          <Suspense
            fallback={<Skeleton variant="card" count={3} label={t("Cargando la pagina")} />}
          >
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  )
}
