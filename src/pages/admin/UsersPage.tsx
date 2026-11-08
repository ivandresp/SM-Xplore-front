import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Avatar } from '@/components/Avatar/Avatar'
import { Button } from '@/components/Button'
import { Chip } from '@/components/Chip'
import { DataTable } from '@/components/DataTable/DataTable'
import type { Column } from '@/components/DataTable/DataTable'
import { PageHeader } from '@/components/PageHeader/PageHeader'
import { Pagination } from '@/components/Pagination/Pagination'
import { SearchInput } from '@/components/SearchInput/SearchInput'
import { StateMessage } from '@/components/StateMessage'
import { StatusBadge } from '@/components/StatusBadge/StatusBadge'
import {
  ACCOUNT_STATUS_LABELS,
  ACCOUNT_STATUS_TONES,
  PROVIDER_STATUS_LABELS,
  PROVIDER_STATUS_TONES,
  ROLE_LABELS,
} from '@/config/roles'
import { usersApi } from '@/services/usersApi'
import { describeApiError } from '@/utils/errors'
import { formatDate } from '@/utils/format'
import type {
  AdminUserSummary,
  ProviderRegistrationStatus,
  UserRole,
  UserStatus,
} from '@/types'
import styles from './admin.module.css'

const PAGE_SIZE = 10

const ROLE_FILTERS: Array<{ label: string; role?: UserRole }> = [
  { label: 'Todos' },
  { label: 'Turistas', role: 'TOURIST' },
  { label: 'Guías', role: 'GUIDE' },
  { label: 'Prestadoras', role: 'SERVICE_PROVIDER' },
  { label: 'Gestoras', role: 'DESTINATION_MANAGER' },
  { label: 'Admin', role: 'ADMIN' },
]

const STATUS_FILTERS: Array<{ value: '' | UserStatus; label: string }> = [
  { value: '', label: 'Todos los estados' },
  { value: 'ACTIVO', label: 'Activos' },
  { value: 'BLOQUEADO', label: 'Bloqueados' },
  { value: 'SUSPENDIDO', label: 'Suspendidos' },
  { value: 'ELIMINADO', label: 'Eliminados' },
]

const PROVIDER_FILTERS: Array<{
  value: '' | ProviderRegistrationStatus
  label: string
}> = [
  { value: '', label: 'Prestadoras: todas' },
  { value: 'PENDIENTE', label: 'Prestadoras pendientes' },
  { value: 'APROBADO', label: 'Prestadoras aprobadas' },
  { value: 'RECHAZADO', label: 'Prestadoras rechazadas' },
]

/** Las prestadoras se revisan en su pantalla de solicitud. */
function detailPathFor(user: AdminUserSummary): string {
  return user.role === 'SERVICE_PROVIDER'
    ? `/app/usuarios/prestadoras/${user.id}`
    : `/app/usuarios/${user.id}`
}

export default function UsersPage() {
  const navigate = useNavigate()

  const [term, setTerm] = useState('')
  const [debouncedTerm, setDebouncedTerm] = useState('')
  const [role, setRole] = useState<UserRole | undefined>(undefined)
  const [status, setStatus] = useState<'' | UserStatus>('')
  const [providerStatus, setProviderStatus] = useState<
    '' | ProviderRegistrationStatus
  >('')
  const [sort, setSort] = useState<'recent' | 'oldest'>('recent')
  const [users, setUsers] = useState<AdminUserSummary[]>([])
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [reloadToken, setReloadToken] = useState(0)

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedTerm(term)
      setPage(1)
    }, 350)
    return () => clearTimeout(timer)
  }, [term])

  useEffect(() => {
    let cancelled = false

    async function load() {
      setIsLoading(true)
      setError(null)

      try {
        const result = await usersApi.list({
          q: debouncedTerm.trim() === '' ? undefined : debouncedTerm.trim(),
          role,
          status: status === '' ? undefined : status,
          providerStatus: providerStatus === '' ? undefined : providerStatus,
          sortBy: 'signedUpAt',
          sortOrder: sort === 'recent' ? 'DESC' : 'ASC',
          page: page - 1,
          size: PAGE_SIZE,
        })

        if (!cancelled) {
          setUsers(result.content)
          setTotal(result.totalElements)
          setTotalPages(Math.max(1, result.totalPages))
        }
      } catch (cause) {
        if (!cancelled) {
          setUsers([])
          setTotal(0)
          setError(describeApiError(cause))
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [role, status, providerStatus, sort, debouncedTerm, page, reloadToken])

  function retry() {
    setIsLoading(true)
    setError(null)
    setReloadToken((token) => token + 1)
  }

  const columns: Column<AdminUserSummary>[] = [
    {
      header: 'Usuario',
      render: (user) => (
        <div className={styles.userCell}>
          <Avatar name={user.fullName} />
          <div>
            <p className={styles.userName}>{user.fullName}</p>
            <p className={styles.userEmail}>{user.email}</p>
          </div>
        </div>
      ),
    },
    {
      header: 'Rol',
      render: (user) => ROLE_LABELS[user.role],
    },
    {
      header: 'Estado',
      render: (user) => (
        <div>
          <StatusBadge tone={ACCOUNT_STATUS_TONES[user.status]}>
            {ACCOUNT_STATUS_LABELS[user.status]}
          </StatusBadge>
          {user.providerStatus !== null && (
            <StatusBadge tone={PROVIDER_STATUS_TONES[user.providerStatus]}>
              {PROVIDER_STATUS_LABELS[user.providerStatus]}
            </StatusBadge>
          )}
        </div>
      ),
    },
    {
      header: 'Registro',
      render: (user) => formatDate(user.signedUpAt),
    },
    {
      header: 'Acciones',
      align: 'right',
      render: (user) => (
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate(detailPathFor(user))}
        >
          Ver
        </Button>
      ),
    },
  ]

  return (
    <section>
      <PageHeader
        breadcrumb={[{ label: 'Usuarios' }, { label: 'Listado' }]}
        title="Usuarios registrados"
        meta={`${total} ${total === 1 ? 'usuario' : 'usuarios'}`}
        actions={
          <Button onClick={() => navigate('/app/usuarios/nuevo')}>
            Crear usuario
          </Button>
        }
      />

      <div className={styles.toolbar}>
        <div className={styles.search}>
          <SearchInput
            label="Buscar por nombre o correo"
            placeholder="Buscar por nombre o correo…"
            value={term}
            onChange={setTerm}
          />
        </div>

        <div className={styles.chips}>
          {ROLE_FILTERS.map((filter) => (
            <Chip
              key={filter.label}
              selected={role === filter.role}
              onClick={() => {
                setRole(filter.role)
                setPage(1)
              }}
            >
              {filter.label}
            </Chip>
          ))}
        </div>

        <select
          className={styles.sort}
          value={status}
          onChange={(event) => {
            setStatus(event.target.value as '' | UserStatus)
            setPage(1)
          }}
          aria-label="Filtrar por estado de la cuenta"
        >
          {STATUS_FILTERS.map((option) => (
            <option key={option.label} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <select
          className={styles.sort}
          value={providerStatus}
          onChange={(event) => {
            setProviderStatus(
              event.target.value as '' | ProviderRegistrationStatus,
            )
            setPage(1)
          }}
          aria-label="Filtrar por estado de la prestadora"
        >
          {PROVIDER_FILTERS.map((option) => (
            <option key={option.label} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <select
          className={styles.sort}
          value={sort}
          onChange={(event) => {
            setSort(event.target.value as 'recent' | 'oldest')
            setPage(1)
          }}
          aria-label="Ordenar"
        >
          <option value="recent">Ordenar: más recientes</option>
          <option value="oldest">Ordenar: más antiguos</option>
        </select>
      </div>

      {error !== null ? (
        <StateMessage
          title="No se pudieron cargar los usuarios"
          description={error}
          tone="error"
          action={<Button onClick={retry}>Reintentar</Button>}
        />
      ) : (
        <DataTable
          columns={columns}
          rows={users}
          rowKey={(user) => user.id}
          isLoading={isLoading}
          loadingMessage="Cargando usuarios…"
          emptyMessage="No hay usuarios que coincidan con los filtros."
          emptyAction={
            <Button onClick={() => navigate('/app/usuarios/nuevo')}>
              Crear usuario
            </Button>
          }
        />
      )}

      {error === null && (
        <Pagination page={page} totalPages={totalPages} onChange={setPage} />
      )}
    </section>
  )
}
