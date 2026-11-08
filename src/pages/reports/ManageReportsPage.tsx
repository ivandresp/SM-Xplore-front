import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/Button'
import { Chip } from '@/components/Chip'
import { PageHeader } from '@/components/PageHeader/PageHeader'
import { Skeleton } from '@/components/Skeleton'
import { StateMessage } from '@/components/StateMessage'
import { StatusBadge } from '@/components/StatusBadge/StatusBadge'
import { REPORT_STATUS_LABELS, REPORT_STATUS_TONES } from '@/config/roles'
import { securityReportsApi } from '@/services/securityReportsApi'
import { describeApiError } from '@/utils/errors'
import { formatRelativeTime } from '@/utils/format'
import { MAX_PAGE_SIZE } from '@/types/common'
import type {
  SecurityReportCounts,
  SecurityReportResponse,
  SecurityReportStatus,
} from '@/types'
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
  const [reloadToken, setReloadToken] = useState(0)
  const [counts, setCounts] = useState<SecurityReportCounts | null>(null)

  useEffect(() => {
    let cancelled = false

    async function run() {
      try {
        // Los totales vienen del servidor: no dependen de la página cargada.
        void securityReportsApi
          .counts()
          .then((totals) => {
            if (!cancelled) setCounts(totals)
          })
          .catch(() => {
            if (!cancelled) setCounts(null)
          })

        // El listado global exige estado; se piden los tres y se combinan.
        const results = await Promise.allSettled(
          STATUSES.map((status) =>
            securityReportsApi.list({ status, size: MAX_PAGE_SIZE }),
          ),
        )

        if (cancelled) return

        const rejections = results.filter((result) => result.status === 'rejected')
        if (rejections.length === results.length) {
          throw rejections[0].reason
        }

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
  }, [reloadToken])

  function retry() {
    setIsLoading(true)
    setError(null)
    setReloadToken((value) => value + 1)
  }

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
      setCounts((current) =>
        current === null
          ? current
          : {
              ...current,
              ONGOING: Math.max(0, current.ONGOING - 1),
              REPORTED: current.REPORTED + 1,
            },
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
      setCounts((current) =>
        current === null
          ? current
          : {
              ...current,
              REPORTED: Math.max(0, current.REPORTED - 1),
              SOLVED: current.SOLVED + 1,
            },
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
        breadcrumb={[{ label: 'Reportes' }, { label: 'Reportes de seguridad' }]}
        title="Reportes de seguridad"
        description="Estado de los reportes de la ciudad y los más recientes."
      />

      {error !== null && (
        <StateMessage
          title="No se pudieron cargar los reportes"
          description={error}
          tone="error"
          action={<Button onClick={retry}>Reintentar</Button>}
        />
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

      <div className={styles.summary}>
        <ul className={styles.legend}>
          <li className={styles.legendItem}>
            <span className={`${styles.dot} ${styles.dotWarning}`} />
            En curso ({counts?.ONGOING ?? '—'})
          </li>
          <li className={styles.legendItem}>
            <span className={`${styles.dot} ${styles.dotInfo}`} />
            Reportados ({counts?.REPORTED ?? '—'})
          </li>
          <li className={styles.legendItem}>
            <span className={`${styles.dot} ${styles.dotSuccess}`} />
            Resueltos ({counts?.SOLVED ?? '—'})
          </li>
        </ul>
      </div>

      <article className={styles.card}>
        <h2 className={styles.cardTitle}>Reportes recientes</h2>

          {isLoading && (
            <Skeleton variant="table" count={3} label="Cargando reportes…" />
          )}

          {!isLoading && error === null && filtered.length === 0 && (
            <StateMessage
              title="No hay reportes en este estado."
              action={
                filterIndex !== 0 ? (
                  <Button variant="outline" onClick={() => setFilterIndex(0)}>
                    Ver todos
                  </Button>
                ) : undefined
              }
            />
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
    </section>
  )
}
