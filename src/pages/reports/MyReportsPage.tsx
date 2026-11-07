import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Avatar } from '@/components/Avatar/Avatar'
import { Button } from '@/components/Button'
import { Chip } from '@/components/Chip'
import { PageHeader } from '@/components/PageHeader/PageHeader'
import { StatusBadge } from '@/components/StatusBadge/StatusBadge'
import { REPORT_STATUS_LABELS, REPORT_STATUS_TONES } from '@/config/roles'
import { useAuth } from '@/hooks/useAuth'
import { securityReportsApi } from '@/services/securityReportsApi'
import { describeApiError } from '@/utils/errors'
import { formatRelativeTime } from '@/utils/format'
import type { SecurityReportResponse, SecurityReportStatus } from '@/types'
import styles from './reports.module.css'

type SortOrder = 'recent' | 'oldest'

const FILTERS: Array<{ label: string; status?: SecurityReportStatus }> = [
  { label: 'Todos' },
  { label: 'En curso', status: 'ONGOING' },
  { label: 'Reportados', status: 'REPORTED' },
  { label: 'Resueltos', status: 'SOLVED' },
]

/** Reportes del propio usuario. El feed comunitario es solo para gestoras y admins. */
export default function MyReportsPage() {
  const { user } = useAuth()

  const [reports, setReports] = useState<SecurityReportResponse[]>([])
  const [comments, setComments] = useState<Record<string, number>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filterIndex, setFilterIndex] = useState(0)
  const [sort, setSort] = useState<SortOrder>('recent')

  const userId = user?.id

  useEffect(() => {
    if (userId === undefined) {
      return
    }

    let cancelled = false

    async function run() {
      try {
        const page = await securityReportsApi.listByUser(userId as string)
        if (cancelled) return

        const mine = page.content
        setReports(mine)
        setError(null)

        const counts = await Promise.allSettled(
          mine.map((report) => securityReportsApi.listComments(report.id)),
        )

        if (!cancelled) {
          const map: Record<string, number> = {}
          counts.forEach((result, index) => {
            map[mine[index].id] =
              result.status === 'fulfilled' ? result.value.content.length : 0
          })
          setComments(map)
        }
      } catch (cause) {
        if (!cancelled) {
          setReports([])
          setError(describeApiError(cause))
        }
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    void run()

    return () => {
      cancelled = true
    }
  }, [userId])

  const filtered = useMemo(() => {
    const status = FILTERS[filterIndex]?.status

    return reports
      .filter((report) => status === undefined || report.status === status)
      .sort((a, b) => {
        const diff =
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        return sort === 'recent' ? -diff : diff
      })
  }, [reports, filterIndex, sort])

  return (
    <div className={styles.page}>
      <PageHeader
        title="Mis reportes de seguridad"
        meta={`${filtered.length} ${filtered.length === 1 ? 'reporte' : 'reportes'}`}
        description="Lo que has reportado a las autoridades de destino."
        actions={
          <Link to="/reportes/nuevo">
            <Button variant="accent">Nuevo reporte</Button>
          </Link>
        }
      />

      {error !== null && (
        <p className={`${styles.feedback} ${styles.error}`} role="alert">
          {error}
        </p>
      )}

      {reports.length > 0 && (
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

          <select
            className={styles.sort}
            value={sort}
            onChange={(changeEvent) =>
              setSort(changeEvent.target.value as SortOrder)
            }
            aria-label="Ordenar"
          >
            <option value="recent">Ordenar: más recientes</option>
            <option value="oldest">Ordenar: más antiguos</option>
          </select>
        </div>
      )}

      {isLoading && <p className={styles.state}>Cargando reportes…</p>}

      {!isLoading && reports.length === 0 && error === null && (
        <p className={styles.state}>
          Todavía no has reportado nada.{' '}
          <Link to="/reportes/nuevo">Crea el primer reporte</Link>.
        </p>
      )}

      <div className={styles.feed}>
        {filtered.map((report) => (
          <article key={report.id} className={styles.card}>
            <div className={styles.head}>
              <div className={styles.author}>
                <Avatar name={report.user.name} />
                <div>
                  <p className={styles.authorName}>{report.user.name}</p>
                  <p className={styles.authorMeta}>
                    {formatRelativeTime(report.createdAt)}
                    {report.location !== null &&
                      ` · ${report.location.latitude}, ${report.location.longitude}`}
                  </p>
                </div>
              </div>

              <StatusBadge tone={REPORT_STATUS_TONES[report.status]}>
                {REPORT_STATUS_LABELS[report.status]}
              </StatusBadge>
            </div>

            <p className={styles.text}>{report.title}</p>
            {report.description !== null && report.description !== '' && (
              <p className={styles.helper}>{report.description}</p>
            )}

            {report.photosUrls.length > 0 && (
              <div className={styles.photo}>
                {report.photosUrls.length}{' '}
                {report.photosUrls.length === 1 ? 'foto' : 'fotos'}: el
                navegador no muestra las URLs, el backend no aloja archivos
              </div>
            )}

            <div className={styles.footer}>
              <span>
                {comments[report.id] ?? 0}{' '}
                {(comments[report.id] ?? 0) === 1 ? 'respuesta' : 'respuestas'}
              </span>
              <Link to={`/reportes/${report.id}`} className={styles.linkButton}>
                Ver detalle y responder
              </Link>
            </div>
          </article>
        ))}
      </div>

      <div className={styles.feed}>
        <p className={styles.notice}>
          El diseño muestra "Reportes de la comunidad" con tipo (incidente /
          avistamiento) y confirmaciones. El backend no tiene tipo de reporte,
          confirmaciones ni feed comunitario: esta pantalla lista tus propios
          reportes.
        </p>
      </div>
    </div>
  )
}
