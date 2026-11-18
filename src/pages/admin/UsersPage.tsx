import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ApiErrorAction } from '@/components/ApiErrorAction'
import { useApiErrorState } from '@/hooks/useApiErrorState'
import { translate as t } from '@/i18n/language'
import { useLanguage } from '@/hooks/useLanguage'
import { Avatar } from '@/components/Avatar/Avatar'
import { Button } from '@/components/Button'
import { Chip } from '@/components/Chip'
import { DataTable } from '@/components/DataTable/DataTable'
import type { Column } from '@/components/DataTable/DataTable'
import { PageHeader } from '@/components/PageHeader/PageHeader'
import { Pagination } from '@/components/Pagination/Pagination'
import { SearchInput } from '@/components/SearchInput/SearchInput'
import { SelectField } from '@/components/SelectField'
import { StateMessage } from '@/components/StateMessage'
import { StatusBadge } from '@/components/StatusBadge/StatusBadge'
import {
  ACCOUNT_STATUS_LABELS,
  ACCOUNT_STATUS_TONES,
  PROVIDER_STATUS_LABELS,
  PROVIDER_STATUS_TONES,
  ROLE_LABELS,
} from '@/config/roles'
import { isSearchReady } from '@/config/search'
import { usersApi } from '@/services/usersApi'
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
  { get label() { return t("Todos") } },
  { get label() { return t("Turistas") }, role: 'TOURIST' },
  { get label() { return t("Guías") }, role: 'GUIDE' },
  { get label() { return t("Prestadoras") }, role: 'SERVICE_PROVIDER' },
  { get label() { return t("Gestoras") }, role: 'DESTINATION_MANAGER' },
  { label: 'Admin', role: 'ADMIN' },
]

const STATUS_FILTERS: Array<{ value: '' | UserStatus; label: string }> = [
  { value: '', get label() { return t("Todos los estados") } },
  { value: 'ACTIVO', get label() { return t("Activos") } },
  { value: 'BLOQUEADO', get label() { return t("Bloqueados") } },
  { value: 'SUSPENDIDO', get label() { return t("Suspendidos") } },
  { value: 'ELIMINADO', get label() { return t("Eliminados") } },
]

const PROVIDER_FILTERS: Array<{
  value: '' | ProviderRegistrationStatus
  label: string
}> = [
  { value: '', get label() { return t("Prestadoras: todas") } },
  { value: 'PENDIENTE', get label() { return t("Prestadoras pendientes") } },
  { value: 'APROBADO', get label() { return t("Prestadoras aprobadas") } },
  { value: 'RECHAZADO', get label() { return t("Prestadoras rechazadas") } },
]

/** Las prestadoras se revisan en su pantalla de solicitud. */
function detailPathFor(user: AdminUserSummary): string {
  return user.role === 'SERVICE_PROVIDER'
    ? `/app/usuarios/prestadoras/${user.id}`
    : `/app/usuarios/${user.id}`
}

export default function UsersPage() {
  useLanguage()
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
  const [error, setError, errorCause, setErrorFromApi] = useApiErrorState()
  const [page, setPage] = useState(1)
  const [reloadToken, setReloadToken] = useState(0)

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!isSearchReady(term)) return
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
          setErrorFromApi(cause)
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
  }, [role, status, providerStatus, sort, debouncedTerm, page, reloadToken, setError, setErrorFromApi])

  function retry() {
    setIsLoading(true)
    setError(null)
    setReloadToken((token) => token + 1)
  }

  const columns: Column<AdminUserSummary>[] = [
    {
      header: t("Usuario"),
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
      header: t("Rol"),
      render: (user) => ROLE_LABELS[user.role],
    },
    {
      header: t("Estado"),
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
      header: t("Registro"),
      render: (user) => formatDate(user.signedUpAt),
    },
    {
      header: t("Acciones"),
      align: 'right',
      render: (user) => (
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate(detailPathFor(user))}
        >
          {t("Ver")}</Button>
      ),
    },
  ]

  return (
    <section>
      <PageHeader
        breadcrumb={[{ label: t("Usuarios") }, { label: t("Listado") }]}
        title={t("Usuarios registrados")}
        meta={`${total} ${total === 1 ? t("usuario") : t("usuarios")}`}
        actions={
          <Button onClick={() => navigate('/app/usuarios/nuevo')}>
            {t("Crear usuario")}</Button>
        }
      />

      <div className={styles.toolbar}>
        <div className={styles.search}>
          <SearchInput
            label={t("Buscar por nombre o correo")}
            placeholder={t("Buscar por nombre o correo…")}
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

        <div className={styles.sortGroup}>
          <SelectField
            className={styles.sort}
            aria-label={t("Filtrar por estado de la cuenta")}
            options={STATUS_FILTERS}
            value={status}
            onChange={(event) => {
              setStatus(event.target.value as '' | UserStatus)
              setPage(1)
            }}
          />

          <SelectField
            className={styles.sort}
            aria-label={t("Filtrar por estado de la prestadora")}
            options={PROVIDER_FILTERS}
            value={providerStatus}
            onChange={(event) => {
              setProviderStatus(
                event.target.value as '' | ProviderRegistrationStatus,
              )
              setPage(1)
            }}
          />

          <SelectField
            className={styles.sort}
            aria-label={t("Ordenar")}
            options={[
              { value: 'recent', label: t("Ordenar: más recientes") },
              { value: 'oldest', label: t("Ordenar: más antiguos") },
            ]}
            value={sort}
            onChange={(event) => {
              setSort(event.target.value as 'recent' | 'oldest')
              setPage(1)
            }}
          />
        </div>
      </div>

      {error !== null ? (
        <StateMessage
          title={t("No se pudieron cargar los usuarios")}
          description={error}
          tone="error"
          action={<ApiErrorAction error={errorCause} onRetry={retry} />}
        />
      ) : (
        <DataTable
          columns={columns}
          rows={users}
          rowKey={(user) => user.id}
          isLoading={isLoading}
          loadingMessage={t("Cargando usuarios…")}
          emptyMessage={t("No hay usuarios que coincidan con los filtros.")}
          emptyAction={
            <Button onClick={() => navigate('/app/usuarios/nuevo')}>
              {t("Crear usuario")}</Button>
          }
        />
      )}

      {error === null && (
        <Pagination page={page} totalPages={totalPages} onChange={setPage} />
      )}
    </section>
  )
}
