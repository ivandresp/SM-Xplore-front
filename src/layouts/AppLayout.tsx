import { Suspense } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
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
  const { user, logout } = useAuth()

  if (user === null) {
    return null
  }

  return (
    <div className={styles.shell}>
      <TopBar
        tone="dark"
        badge="Panel de gestión"
        right={
          <>
            <span className={styles.role}>{ROLE_LABELS[user.role]}</span>
            <button
              type="button"
              className={styles.logout}
              onClick={logout}
            >
              Salir
            </button>
            <span className={styles.avatar} aria-hidden="true" />
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
            fallback={
              <p className={styles.routeLoading} role="status">
                Cargando…
              </p>
            }
          >
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  )
}
