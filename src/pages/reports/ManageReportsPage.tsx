import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/Button'
import { Chip } from '@/components/Chip'
import { PageHeader } from '@/components/PageHeader/PageHeader'
import { StatusBadge } from '@/components/StatusBadge/StatusBadge'
import { REPORT_STATUS_LABELS, REPORT_STATUS_TONES } from '@/config/roles'
import { securityReportsApi } from '@/services/securityReportsApi'
import { describeApiError } from '@/utils/errors'
import { formatRelativeTime } from '@/utils/format'
import type { SecurityReportResponse, SecurityReportStatus } from '@/types'
import styles from './reports.module.css'

const STATUSES: SecurityReportStatus[] = ['ONGOING', 'REPORTED', 'SOLVED']

const FILTERS: Array<{ label: string; status?: SecurityReportStatus }> = [
  { label: 'Todos' },
  { label: 'En curso', status: 'ONGOING' },
  { label: 'Reportados', status: 'REPORTED' },
  { label: 'Resueltos', status: 'SOLVED' },
]

export default function ManageReportsPage() {
  const [reports, setReports] = useState<SecurityReportResponse[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isWorking, setIsWorking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [filterIndex, setFilterIndex] = useState(0)

  useEffect(() => {    let cancelled = false

    async function run() {
      try {
        // El listado global exige estado; se piden los tres y se combinan.
        const results = await Promise.allSettled(
          STATUSES.map((status) => securityReportsApi.list({ status })),
        )

        if (cancelled) return

        const byId = new Map<string, SecurityReportResponse>()
        results.forEach((result) => {
          if (result.status === 'fulfilled') {
            for (const report of result.value.content) {
              byId.set(report.id, report)
            }
          }
        })

        setReports(
          [...byId.values()].sort(
            (a, b) =>
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
          ),
        )
        setError(null)
      } catch (cause) {
        if (!cancelled) setError(describeApiError(cause))
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    void run()

    return () => {
      cancelled = true
    }
  }, [])

  const counts = useMemo(() => {
    const map: Record<SecurityReportStatus, number> = {
      ONGOING: 0,
      REPORTED: 0,
      SOLVED: 0,
    }

    for (const report of reports) {
      map[report.status] += 1
    }

    return map
  }, [reports])

  const filtered = useMemo(() => {
    const status = FILTERS[filterIndex]?.status
    return reports.filter(
      (report) => status === undefined || report.status === status,
    )
  }, [reports, filterIndex])

  async function close(reportId: string) {
    setIsWorking(true)
    setError(null)
    setFeedback(null)

    try {
      const updated = await securityReportsApi.close(reportId)
      setReports((current) =>
        current.map((report) => (report.id === updated.id ? updated : report)),
      )
      setFeedback('Reporte cerrado y marcado como reportado.')
    } catch (cause) {
      setError(describeApiError(cause))
    } finally {
      setIsWorking(false)
    }
  }

  async function solve(reportId: string) {
    setIsWorking(true)
    setError(null)
    setFeedback(null)

    try {
      const updated = await securityReportsApi.solve(reportId)
      setReports((current) =>
        current.map((report) => (report.id === updated.id ? updated : report)),
      )
      setFeedback('Reporte marcado como resuelto.')
    } catch (cause) {
      setError(describeApiError(cause))
    } finally {
      setIsWorking(false)
    }
  }

  return (
    <section>
      <PageHeader
        breadcrumb={[{ label: 'Reportes' }, { label: 'Mapa de incidentes' }]}
        title="Mapa de incidentes"
        description="Distribución de reportes de seguridad por zona."
      />

      {error !== null && (
        <p className={`${styles.feedback} ${styles.error}`} role="alert">
          {error}
        </p>
      )}
      {feedback !== null && (
        <p className={`${styles.feedback} ${styles.success}`}>{feedback}</p>
      )}

      <div className={styles.filters}>
        {FILTERS.map((filter, index) => (
          <Chip
            key={filter.label}
            selected={filterIndex === index}
            onClick={() => setFilterIndex(index)}
          >
            {filter.label}
          </Chip>
        ))}
      </div>

      <div className={styles.layout}>
        <article className={styles.card}>
          <div className={styles.map}>
            Mapa de Santa Marta — el diseño usa este marcador y el backend no
            tiene consultas por zona ni servicio de mapas
          </div>

          <ul className={styles.legend}>
            <li className={styles.legendItem}>
              <span className={`${styles.dot} ${styles.dotWarning}`} />
              En curso ({counts.ONGOING})
            </li>
            <li className={styles.legendItem}>
              <span className={`${styles.dot} ${styles.dotInfo}`} />
              Reportados ({counts.REPORTED})
            </li>
            <li className={styles.legendItem}>
              <span className={`${styles.dot} ${styles.dotSuccess}`} />
              Resueltos ({counts.SOLVED})
            </li>
          </ul>

          <p className={styles.notice}>
            El diseño separa "Incidentes" y "Avistamientos": el backend no tiene
            tipo de reporte, solo estado (en curso → reportado → resuelto).
          </p>
        </article>

        <article className={styles.card}>
          <h2 className={styles.cardTitle}>Reportes recientes</h2>

          {isLoading && <p className={styles.helper}>Cargando reportes…</p>}

          {!isLoading && filtered.length === 0 && (
            <p className={styles.helper}>No hay reportes en este estado.</p>
          )}

          <div className={styles.recent}>
            {filtered.slice(0, 8).map((report) => (
              <div key={report.id} className={styles.recentItem}>
                <StatusBadge tone={REPORT_STATUS_TONES[report.status]}>
                  {REPORT_STATUS_LABELS[report.status]}
                </StatusBadge>
                <p className={styles.recentTitle}>
                  <Link to={`/app/reportes/${report.id}`}>
                    {report.title.length > 60
                      ? `${report.title.slice(0, 60)}…`
                      : report.title}
                  </Link>
                </p>
                <p className={styles.recentMeta}>
                  {report.user.name} · {formatRelativeTime(report.createdAt)}
                </p>

                {report.status === 'ONGOING' && (
                  <div className={styles.actions}>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={isWorking}
                      onClick={() => void close(report.id)}
                    >
                      Cerrar reporte
                    </Button>
                  </div>
                )}

                {report.status === 'REPORTED' && (
                  <div className={styles.actions}>
                    <Button
                      variant="primary"
                      size="sm"
                      disabled={isWorking}
                      onClick={() => void solve(report.id)}
                    >
                      Resolver
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </article>
      </div>
    </section>
  )
}
