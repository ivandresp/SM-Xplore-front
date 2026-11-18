import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { translate as t } from '@/i18n/language'
import { useLanguage } from '@/hooks/useLanguage'
import { ApiErrorAction } from '@/components/ApiErrorAction'
import { useApiErrorState } from '@/hooks/useApiErrorState'
import { Button } from '@/components/Button'
import { Chip } from '@/components/Chip'
import { DataTable } from '@/components/DataTable/DataTable'
import type { Column } from '@/components/DataTable/DataTable'
import { PageHeader } from '@/components/PageHeader/PageHeader'
import { SearchInput } from '@/components/SearchInput/SearchInput'
import { StateMessage } from '@/components/StateMessage'
import { StatusBadge } from '@/components/StatusBadge/StatusBadge'
import {
  RESERVATION_STATUS_LABELS,
  RESERVATION_STATUS_TONES,
} from '@/config/roles'
import { useAuth } from '@/hooks/useAuth'
import { loadCatalogLookup } from '@/services/catalogLookup'
import type { CatalogEntry } from '@/services/catalogLookup'
import { itemOf, reservationsApi } from '@/services/reservationsApi'
import { formatCurrency, formatDate } from '@/utils/format'
import type { ReservationSummaryResponse, ReservationStatus } from '@/types'
import tableStyles from '@/pages/admin/admin.module.css'
import styles from '@/pages/reservations/reservations.module.css'

const FILTERS: Array<{ label: string; statuses?: ReservationStatus[] }> = [
  { get label() { return t("Todas") } },
  { get label() { return t("Confirmadas") }, statuses: ['CONFIRMED'] },
  { get label() { return t("Canceladas") }, statuses: ['CANCELLED'] },
  { get label() { return t("No asistió") }, statuses: ['NO_SHOW'] },
  { get label() { return t("Asistió") }, statuses: ['COMPLETED'] },
]

interface Row {
  reservation: ReservationSummaryResponse
  entry: CatalogEntry | undefined
}

export default function ReceivedReservationsPage() {
  useLanguage()
  const { user } = useAuth()
  const navigate = useNavigate()

  const [rows, setRows] = useState<Row[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError, errorCause, setErrorFromApi] = useApiErrorState()
  const [filterIndex, setFilterIndex] = useState(0)
  const [term, setTerm] = useState('')

  const userId = user?.id
  const role = user?.role
  const canList = role === 'GUIDE' || role === 'SERVICE_PROVIDER'

  async function load() {
    if (userId === undefined || role === undefined) {
      return
    }

    setIsLoading(true)
    setError(null)

    // Guías y prestadoras ven sus reservas recibidas; cada uno tiene su ruta.
    if (!canList) {
      setRows([])
      setIsLoading(false)
      return
    }

    try {
      const [received, catalog] = await Promise.all([
        role === 'GUIDE'
          ? reservationsApi.listByGuide(userId, { limit: 200 })
          : reservationsApi.listByProvider(userId, { limit: 200 }),
        loadCatalogLookup(),
      ])

      setRows(
        [...received]
          .sort(
            (a, b) =>
              new Date(b.bookedAt).getTime() - new Date(a.bookedAt).getTime(),
          )
          .map((reservation) => ({
            reservation,
            entry: catalog.get(itemOf(reservation).itemId),
          })),
      )
    } catch (cause) {
      setRows([])
      setErrorFromApi(cause)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, role])

  const filtered = useMemo(() => {
    const statuses = FILTERS[filterIndex]?.statuses
    const needle = term.trim().toLowerCase()

    return rows.filter((row) => {
      if (statuses !== undefined && !statuses.includes(row.reservation.status)) {
        return false
      }

      if (needle === '') {
        return true
      }

      return (
        (row.entry?.name.toLowerCase().includes(needle) ?? false) ||
        row.reservation.code.toLowerCase().includes(needle)
      )
    })
  }, [rows, filterIndex, term])

  const columns: Column<Row>[] = [
    {
      header: t("Reserva"),
      render: (row) => (
        <div>
          <p className={tableStyles.userName}>
            {row.entry?.name ?? t("Ítem reservado")}
          </p>
          <p className={tableStyles.userEmail}>#{row.reservation.code}</p>
        </div>
      ),
    },
    {
      header: t("Fecha"),
      render: (row) => formatDate(row.reservation.bookedFor),
    },
    {
      header: t("Personas"),
      render: (row) => row.reservation.numberOfPeople,
    },
    {
      header: 'Total',
      align: 'right',
      render: (row) => formatCurrency(row.reservation.total),
    },
    {
      header: t("Estado"),
      render: (row) => (
        <StatusBadge tone={RESERVATION_STATUS_TONES[row.reservation.status]}>
          {RESERVATION_STATUS_LABELS[row.reservation.status]}
        </StatusBadge>
      ),
    },
    {
      header: t("Acciones"),
      align: 'right',
      render: (row) => (
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            navigate(`/app/reservas-recibidas/${row.reservation.id}`)
          }
        >
          {t("Ver")}</Button>
      ),
    },
  ]

  return (
    <section>
      <PageHeader
        breadcrumb={[{ label: t("Reservas") }, { label: t("Recibidas") }]}
        title={t("Reservas recibidas")}
        actions={
          <div className={tableStyles.search}>
            <SearchInput
              label={t("Buscar por actividad o código")}
              placeholder={t("Buscar por actividad o código…")}
              value={term}
              onChange={setTerm}
            />
          </div>
        }
      />

      {!canList ? (
        <p className={styles.notice}>
          {t("Las reservas recibidas son para guías y prestadoras. Además, los servicios no son reservables, así que una prestadora solo recibe reservas de sus actividades.")}{' '}
          <Link to="/app/mis-servicios">{t("Ver mis servicios")}</Link>
        </p>
      ) : (
        <>
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

          {error !== null ? (
            <StateMessage
              title={t("No se pudieron cargar las reservas recibidas")}
              description={error}
              tone="error"
              action={<ApiErrorAction error={errorCause} onRetry={() => void load()} />}
            />
          ) : (
            <DataTable
              columns={columns}
              rows={filtered}
              rowKey={(row) => row.reservation.id}
              isLoading={isLoading}
              loadingMessage={t("Cargando reservas recibidas…")}
              emptyMessage={t("No tienes reservas recibidas con estos filtros.")}
            />
          )}

          <p className={styles.notice}>
            {t("Datos reales de")}{' '}
            <code>
              {role === 'GUIDE'
                ? '/reservations/guides/{id}'
                : '/reservations/providers/{id}'}
            </code>
            {t(". Solo se puede confirmar asistencia o marcar no-show desde el detalle.")}</p>
        </>
      )}
    </section>
  )
}
