import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
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
import { describeApiError } from '@/utils/errors'
import { formatCurrency, formatDate } from '@/utils/format'
import type { ReservationSummaryResponse, ReservationStatus } from '@/types'
import tableStyles from '@/pages/admin/admin.module.css'
import styles from '@/pages/reservations/reservations.module.css'

const FILTERS: Array<{ label: string; statuses?: ReservationStatus[] }> = [
  { label: 'Todas' },
  { label: 'Confirmadas', statuses: ['CONFIRMED'] },
  { label: 'Canceladas', statuses: ['CANCELLED'] },
  { label: 'No asistió', statuses: ['NO_SHOW'] },
  { label: 'Asistió', statuses: ['COMPLETED'] },
]

interface Row {
  reservation: ReservationSummaryResponse
  entry: CatalogEntry | undefined
}

export default function ReceivedReservationsPage() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [rows, setRows] = useState<Row[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
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
      setError(describeApiError(cause))
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
      header: 'Reserva',
      render: (row) => (
        <div>
          <p className={tableStyles.userName}>
            {row.entry?.name ?? 'Ítem reservado'}
          </p>
          <p className={tableStyles.userEmail}>#{row.reservation.code}</p>
        </div>
      ),
    },
    {
      header: 'Fecha',
      render: (row) => formatDate(row.reservation.bookedFor),
    },
    {
      header: 'Personas',
      render: (row) => row.reservation.numberOfPeople,
    },
    {
      header: 'Total',
      align: 'right',
      render: (row) => formatCurrency(row.reservation.total),
    },
    {
      header: 'Estado',
      render: (row) => (
        <StatusBadge tone={RESERVATION_STATUS_TONES[row.reservation.status]}>
          {RESERVATION_STATUS_LABELS[row.reservation.status]}
        </StatusBadge>
      ),
    },
    {
      header: 'Acciones',
      align: 'right',
      render: (row) => (
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            navigate(`/app/reservas-recibidas/${row.reservation.id}`)
          }
        >
          Ver
        </Button>
      ),
    },
  ]

  return (
    <section>
      <PageHeader
        breadcrumb={[{ label: 'Reservas' }, { label: 'Recibidas' }]}
        title="Reservas recibidas"
        actions={
          <div className={tableStyles.search}>
            <SearchInput
              label="Buscar por actividad o código"
              placeholder="Buscar por actividad o código…"
              value={term}
              onChange={setTerm}
            />
          </div>
        }
      />

      {!canList ? (
        <p className={styles.notice}>
          Las reservas recibidas son para guías y prestadoras. Además, los
          servicios no son reservables, así que una prestadora solo recibe
          reservas de sus actividades.{' '}
          <Link to="/app/mis-servicios">Ver mis servicios</Link>
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
              title="No se pudieron cargar las reservas recibidas"
              description={error}
              tone="error"
              action={<Button onClick={() => void load()}>Reintentar</Button>}
            />
          ) : (
            <DataTable
              columns={columns}
              rows={filtered}
              rowKey={(row) => row.reservation.id}
              isLoading={isLoading}
              loadingMessage="Cargando reservas recibidas…"
              emptyMessage="No tienes reservas recibidas con estos filtros."
            />
          )}

          <p className={styles.notice}>
            Datos reales de{' '}
            <code>
              {role === 'GUIDE'
                ? '/reservations/guides/{id}'
                : '/reservations/providers/{id}'}
            </code>
            . Solo se puede confirmar asistencia o marcar no-show desde el
            detalle.
          </p>
        </>
      )}
    </section>
  )
}
