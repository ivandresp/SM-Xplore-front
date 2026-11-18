import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { translate as t } from '@/i18n/language'
import { useLanguage } from '@/hooks/useLanguage'
import { useReportsPath } from '@/hooks/useReportsPath'
import { Avatar } from '@/components/Avatar/Avatar'
import { ApiErrorAction } from '@/components/ApiErrorAction'
import { Button } from '@/components/Button'
import { Chip } from '@/components/Chip'
import { FilterBar } from '@/components/FilterBar'
import { PageHeader } from '@/components/PageHeader/PageHeader'
import { SelectField } from '@/components/SelectField'
import { Skeleton } from '@/components/Skeleton'
import { StateMessage } from '@/components/StateMessage'
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
  { get label() { return t("Ver todos") } },
  { get label() { return t("En curso") }, status: 'ONGOING' },
  { get label() { return t("Reportados") }, status: 'REPORTED' },
  { get label() { return t("Resueltos") }, status: 'SOLVED' },
]

/** Reportes del propio usuario. El feed comunitario es solo para gestoras y admins. */
export default function MyReportsPage() {
  useLanguage()
  const reportsPath = useReportsPath()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [reports, setReports] = useState<SecurityReportResponse[]>([])
  const [comments, setComments] = useState<Record<string, number>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<unknown>(null)
  const [filterIndex, setFilterIndex] = useState(0)
  const [sort, setSort] = useState<SortOrder>('recent')
  const [reloadToken, setReloadToken] = useState(0)

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
          setError(() => cause)
        }
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    void run()

    return () => {
      cancelled = true
    }
  }, [userId, reloadToken, setError])

  function retry() {
    setIsLoading(true)
    setError(null)
    setReloadToken((value) => value + 1)
  }

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
        title={t("Mis reportes de seguridad")}
        meta={`${filtered.length} ${filtered.length === 1 ? 'reporte' : 'reportes'}`}
        description={t("Lo que has reportado a las autoridades de destino.")}
      />

      {error !== null && (
        <StateMessage
          title={t("No se pudieron cargar tus reportes")}
          description={describeApiError(error)}
          tone="error"
          action={<ApiErrorAction error={error} onRetry={retry} />}
        />
      )}

      <div className={styles.reportFilters}>
      <FilterBar
        actions={
          <Button variant="accent" className={styles.newReportButton}
            aria-label={t("Nuevo reporte")} title={t("Nuevo reporte")}
            onClick={() => navigate(`${reportsPath}/nuevo`)}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true" focusable="false">
              <path d="M12 5v14M5 12h14" />
            </svg>
          </Button>
        }
        activeFilters={[
          ...(filterIndex === 0 ? [] : [{ key: 'status', label: t("Estado"), value: FILTERS[filterIndex].label }]),
          ...(sort === 'recent' ? [] : [{ key: 'sort', label: t("Ordenar por fecha"), value: t("Más antiguos") }]),
        ]}
        onRemoveFilter={key => key === 'status' ? setFilterIndex(0) : setSort('recent')}
        onClearFilters={() => { setFilterIndex(0); setSort('recent') }}
        resultSummary={isLoading ? t("Cargando reportes…") : `${filtered.length} ${filtered.length === 1 ? t("reporte") : t("reportes")}`}>
        <div className={styles.reportStatusFilters} role="group" aria-label={t("Estado")}>
          {FILTERS.map((filter, index) => (
            <Chip key={filter.label} selected={filterIndex === index}
              onClick={() => setFilterIndex(index)}>{filter.label}</Chip>
          ))}
        </div>
        <SelectField label={t("Ordenar por fecha")}
          options={[
            { value: 'recent', label: t("Más recientes") },
            { value: 'oldest', label: t("Más antiguos") },
          ]}
          value={sort}
          onChange={event => setSort(event.target.value as SortOrder)} />
      </FilterBar>
      </div>

      {isLoading && (
        <Skeleton variant="table" count={3} label={t("Cargando reportes…")} />
      )}

      {!isLoading && reports.length === 0 && error === null && (
        <StateMessage
          title={t("Todavía no has reportado nada")}
          description={t("Cuéntanos qué pasó y dónde; las gestoras de destino recibirán el aviso.")}
          action={
            <Link to={`${reportsPath}/nuevo`}>
              <Button variant="accent">{t("Crear el primer reporte")}</Button>
            </Link>
          }
        />
      )}

      {!isLoading && reports.length > 0 && filtered.length === 0 && (
        <StateMessage
          title={t("No tienes reportes en este estado.")}
          action={
            <Button variant="outline" onClick={() => setFilterIndex(0)}>
              {t("Ver todos")}</Button>
          }
        />
      )}

      <div className={styles.feed}>
        {filtered.map((report) => (
          <article key={report.id} className={styles.card}>
            <div className={styles.head}>
              <div className={styles.author}>
                <Avatar name={report.user.name} />
                <div>
                  <p className={styles.authorName}>{report.user.name}</p>
                  <div className={`${styles.authorMeta} ${styles.cardMeta}`}>
                    <span>{formatRelativeTime(report.createdAt)}</span>
                    <StatusBadge tone={REPORT_STATUS_TONES[report.status]}>
                      {REPORT_STATUS_LABELS[report.status]}
                    </StatusBadge>
                  </div>
                </div>
              </div>

            </div>

            <p className={styles.text}>{report.title}</p>
            {report.description !== null && report.description !== '' && (
              <p className={styles.helper}>{report.description}</p>
            )}

            {report.photosUrls.length > 0 && (
              <div className={styles.photo}>
                {report.photosUrls.length}{' '}
                {report.photosUrls.length === 1 ? t("foto adjunta") : t("fotos adjuntas")}
              </div>
            )}

            <div className={styles.footer}>
              <Button variant="outline" size="sm"
                aria-label={t((comments[report.id] ?? 0) === 1 ? 'Ver {0} respuesta' : 'Ver {0} respuestas', [comments[report.id] ?? 0])}
                onClick={() => navigate(`${reportsPath}/${report.id}#comentarios`)}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
                  <path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8v.5Z" />
                </svg>
                {comments[report.id] ?? 0}
              </Button>
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}
