import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/Button'
import { navItemsFor } from '@/config/navigation'
import { ACCOUNT_STATUS_LABELS, ROLE_LABELS } from '@/config/roles'
import { useAuth } from '@/hooks/useAuth'
import { formatDateTime } from '@/utils/format'
import styles from './DashboardPage.module.css'

type BackendState = 'checking' | 'up' | 'down'

/** Comprueba que el backend responda (útil mientras se desarrolla en local). */
function useBackendHealth(): { state: BackendState; retry: () => void } {
  const [state, setState] = useState<BackendState>('checking')
  const [reloadToken, setReloadToken] = useState(0)

  useEffect(() => {
    let cancelled = false

    async function check() {
      try {
        const response = await fetch('/actuator/health')
        if (!cancelled) {
          setState(response.ok ? 'up' : 'down')
        }
      } catch {
        if (!cancelled) {
          setState('down')
        }
      }
    }

    void check()

    return () => {
      cancelled = true
    }
  }, [reloadToken])

  function retry() {
    setState('checking')
    setReloadToken((token) => token + 1)
  }

  return { state, retry }
}

export default function DashboardPage() {
  const { user } = useAuth()
  const { state: backend, retry: retryBackend } = useBackendHealth()

  if (user === null) {
    return null
  }

  const sections = navItemsFor(user.role)

  return (
    <section className={styles.page}>
      <div>
        <h1 className={styles.title}>Hola, {user.fullName}</h1>
        <p className={styles.subtitle}>
          Estás en el panel de {ROLE_LABELS[user.role].toLowerCase()}. Estas son
          las secciones de tu rol.
        </p>
      </div>

      <div className={styles.status}>
        <span>
          <span className={styles.label}>Rol: </span>
          <span className={styles.value}>{ROLE_LABELS[user.role]}</span>
        </span>
        <span>
          <span className={styles.label}>Estado: </span>
          <span className={styles.value}>
            {ACCOUNT_STATUS_LABELS[user.status]}
          </span>
        </span>
        <span>
          <span className={styles.label}>Registro: </span>
          <span className={styles.value}>
            {formatDateTime(user.signedUpAt)}
          </span>
        </span>
        <span>
          <span className={styles.label}>Backend: </span>
          {backend === 'checking' && <span className={styles.value}>…</span>}
          {backend === 'up' && (
            <span className={styles.healthUp}>conectado</span>
          )}
          {backend === 'down' && (
            <>
              <span className={styles.healthDown}>
                sin conexión (http://localhost:8080)
              </span>{' '}
              <Button variant="outline" size="sm" onClick={retryBackend}>
                Reintentar
              </Button>
            </>
          )}
        </span>
      </div>

      <div className={styles.cards}>
        {sections.map((section) => (
          <Link key={section.to} to={section.to} className={styles.card}>
            <h2 className={styles.cardTitle}>{section.label}</h2>
            <p className={styles.cardText}>{section.description}</p>
          </Link>
        ))}
      </div>
    </section>
  )
}
