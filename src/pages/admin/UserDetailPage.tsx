import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Avatar } from '@/components/Avatar/Avatar'
import { Button } from '@/components/Button'
import { DefList } from '@/components/DefList/DefList'
import { Field } from '@/components/FormField'
import { PageHeader } from '@/components/PageHeader/PageHeader'
import { SelectField } from '@/components/SelectField'
import { Skeleton } from '@/components/Skeleton'
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
import { formatDate, formatDateTime } from '@/utils/format'
import type {
  AdminUserDetail,
  ChangeUserRoleRequest,
  ProviderRegistrationStatus,
  UserRole,
  UserStatus,
} from '@/types'
import styles from './admin.module.css'

const STATUS_OPTIONS = (['ACTIVO', 'BLOQUEADO', 'SUSPENDIDO'] as const).map(
  (status) => ({ value: status, label: ACCOUNT_STATUS_LABELS[status] }),
)

const ROLE_OPTIONS = (
  Object.entries(ROLE_LABELS) as Array<[UserRole, string]>
).map(([value, label]) => ({ value, label }))

function profileItems(user: AdminUserDetail) {
  const items: Array<{ label: string; value: string }> = []
  const add = (label: string, value: string | number | null | undefined) => {
    if (value === null || value === undefined || value === '') {
      return
    }
    items.push({ label, value: String(value) })
  }

  if (user.profile === null) {
    return items
  }

  switch (user.role) {
    case 'TOURIST': {
      const profile = user.profile
      add('Documento', [profile.dniType, profile.dniNumber].filter(Boolean).join(' '))
      add('Idioma preferido', profile.preferredLanguage)
      add('Nacimiento', profile.birthDate && formatDate(profile.birthDate))
      add('Nacionalidad', profile.nationality)
      break
    }
    case 'GUIDE': {
      const profile = user.profile
      add('Documento', [profile.dniType, profile.dniNumber].filter(Boolean).join(' '))
      add('Licencia', profile.license)
      add(
        'Opera desde',
        profile.startOperationDate && formatDate(profile.startOperationDate),
      )
      break
    }
    case 'SERVICE_PROVIDER': {
      const profile = user.profile
      add('NIT', profile.nit)
      add('Tipo de negocio', profile.businessType)
      add(
        'Registro',
        profile.registrationStatus === null
          ? null
          : (PROVIDER_STATUS_LABELS[
              profile.registrationStatus as ProviderRegistrationStatus
            ] ?? profile.registrationStatus),
      )
      add('Sitio web', profile.websiteUrl)
      add(
        'Ubicación',
        profile.latitude !== null && profile.longitude !== null
          ? `${profile.latitude}, ${profile.longitude}`
          : null,
      )
      add(
        'Opera desde',
        profile.startOperationDate && formatDate(profile.startOperationDate),
      )
      break
    }
    case 'DESTINATION_MANAGER': {
      const profile = user.profile
      add('NIT', profile.nit)
      add(
        'Opera desde',
        profile.startOperationDate && formatDate(profile.startOperationDate),
      )
      break
    }
    case 'ADMIN': {
      const profile = user.profile
      add('Documento', [profile.dniType, profile.dniNumber].filter(Boolean).join(' '))
      add('Último acceso', profile.lastAccessDate && formatDateTime(profile.lastAccessDate))
      break
    }
  }

  return items
}

export default function UserDetailPage() {
  const { userId } = useParams<{ userId: string }>()
  const navigate = useNavigate()

  const [user, setUser] = useState<AdminUserDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isWorking, setIsWorking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [reloadToken, setReloadToken] = useState(0)

  const [nextStatus, setNextStatus] = useState<UserStatus>('ACTIVO')
  const [statusReason, setStatusReason] = useState('')
  const [nextRole, setNextRole] = useState<UserRole>('TOURIST')
  const [dniType, setDniType] = useState('')
  const [dniNumber, setDniNumber] = useState('')
  const [license, setLicense] = useState('')
  const [nit, setNit] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => {
    if (userId === undefined) {
      return
    }

    let cancelled = false

    async function load() {
      setIsLoading(true)
      setError(null)

      try {
        const found = await usersApi.getById(userId as string)
        if (!cancelled) {
          setUser(found)
          setNextStatus(
            found.status === 'ELIMINADO' ? 'ACTIVO' : found.status,
          )
          setNextRole(found.role)
        }
      } catch (cause) {
        if (!cancelled) {
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
  }, [userId, reloadToken])

  function retry() {
    setIsLoading(true)
    setError(null)
    setReloadToken((token) => token + 1)
  }

  async function refresh() {
    if (userId === undefined) {
      return
    }

    try {
      const found = await usersApi.getById(userId)
      setUser(found)
    } catch {
      // El refresco es best-effort: la acción ya se confirmó.
    }
  }

  async function run(action: () => Promise<unknown>, message: string) {
    setIsWorking(true)
    setError(null)
    setFeedback(null)

    try {
      await action()
      setFeedback(message)
      await refresh()
    } catch (cause) {
      setError(describeApiError(cause))
    } finally {
      setIsWorking(false)
    }
  }

  if (isLoading) {
    return <Skeleton variant="text" count={4} label="Cargando usuario…" />
  }

  if (user === null) {
    return (
      <section>
        <Link to="/app/usuarios" className={styles.back}>
          ← Volver al listado
        </Link>
        <StateMessage
          title="No se pudo cargar el usuario"
          description={error ?? 'No se encontró el usuario.'}
          tone="error"
          action={<Button onClick={retry}>Reintentar</Button>}
        />
      </section>
    )
  }

  const isDeleted = user.status === 'ELIMINADO'
  const needsDni = nextRole === 'TOURIST' || nextRole === 'GUIDE'
  const needsLicense = nextRole === 'GUIDE'
  const needsNit =
    nextRole === 'SERVICE_PROVIDER' || nextRole === 'DESTINATION_MANAGER'
  const roleReady =
    nextRole !== user.role &&
    (!needsDni || (dniType.trim() !== '' && dniNumber.trim() !== '')) &&
    (!needsLicense || license.trim() !== '') &&
    (!needsNit || nit.trim() !== '')
  const providerStatus =
    user.role === 'SERVICE_PROVIDER'
      ? (user.profile?.registrationStatus ?? null)
      : null

  return (
    <section>
      <Link to="/app/usuarios" className={styles.back}>
        ← Volver al listado
      </Link>

      <PageHeader
        breadcrumb={[{ label: 'Usuarios', to: '/app/usuarios' }, { label: 'Detalle' }]}
        title={user.fullName}
        description={user.email}
        actions={
          <>
            <StatusBadge tone={ACCOUNT_STATUS_TONES[user.status]}>
              {ACCOUNT_STATUS_LABELS[user.status]}
            </StatusBadge>
            <StatusBadge tone="info">{ROLE_LABELS[user.role]}</StatusBadge>
            {providerStatus !== null &&
              (providerStatus in PROVIDER_STATUS_LABELS ? (
                <StatusBadge
                  tone={
                    PROVIDER_STATUS_TONES[
                      providerStatus as ProviderRegistrationStatus
                    ]
                  }
                >
                  {PROVIDER_STATUS_LABELS[
                    providerStatus as ProviderRegistrationStatus
                  ]}
                </StatusBadge>
              ) : (
                <StatusBadge tone="neutral">{providerStatus}</StatusBadge>
              ))}
          </>
        }
      />

      {error !== null && (
        <p className={`${styles.feedback} ${styles.error}`} role="alert">
          {error}
        </p>
      )}
      {feedback !== null && (
        <p className={`${styles.feedback} ${styles.success}`} role="success">
          {feedback}
        </p>
      )}

      <article className={styles.card}>
        <div className={styles.userCell}>
          <Avatar name={user.fullName} />
          <div>
            <p className={styles.userName}>{user.fullName}</p>
            <p className={styles.userEmail}>{user.phone || 'Sin teléfono'}</p>
          </div>
        </div>

        <DefList
          items={[
            { label: 'Identificador', value: user.id },
            { label: 'Correo', value: user.email },
            { label: 'Registro', value: formatDateTime(user.signedUpAt) },
            ...profileItems(user),
          ]}
        />
      </article>

      {isDeleted && (
        <article className={styles.card}>
          <h2 className={styles.cardTitle}>Cuenta eliminada</h2>
          <p className={`${styles.feedback} ${styles.warning}`}>
            La cuenta fue anonimizada y no puede reactivarse: no admite cambios
            de estado, rol ni contraseña.
          </p>
        </article>
      )}

      {user.role === 'SERVICE_PROVIDER' && (
        <article className={styles.card}>
          <h2 className={styles.cardTitle}>Registro de prestadora</h2>
          <p className={styles.description}>
            La aprobación se gestiona en la ficha de la prestadora, donde queda
            el motivo de la decisión.
          </p>
          <Link to={`/app/usuarios/prestadoras/${user.id}`}>
            <Button variant="outline">Revisar prestadora</Button>
          </Link>
        </article>
      )}

      {!isDeleted && (
        <article className={styles.card}>
          <h2 className={styles.cardTitle}>Estado de la cuenta</h2>
          <p className={styles.description}>
            El cambio de estado no borra la cuenta. Para darla de baja usa la
            eliminación.
          </p>
          <div className={styles.form}>
            <SelectField
              label="Nuevo estado"
              options={STATUS_OPTIONS}
              value={nextStatus}
              onChange={(event) => setNextStatus(event.target.value as UserStatus)}
            />
            <Field
              label="Motivo (opcional)"
              maxLength={500}
              value={statusReason}
              onChange={(event) => setStatusReason(event.target.value)}
              hint="Se guarda en la auditoría del cambio."
            />
            <Button
              variant="primary"
              disabled={isWorking || nextStatus === user.status}
              onClick={() =>
                void run(
                  () =>
                    usersApi.changeStatus(user.id, {
                      status: nextStatus as 'ACTIVO' | 'BLOQUEADO' | 'SUSPENDIDO',
                      reason: statusReason.trim() || undefined,
                    }),
                  `Estado actualizado a ${ACCOUNT_STATUS_LABELS[nextStatus].toLowerCase()}.`,
                )
              }
            >
              Aplicar estado
            </Button>
          </div>
        </article>
      )}

      {!isDeleted && (
        <article className={styles.card}>
          <h2 className={styles.cardTitle}>Cambiar rol</h2>
          <p className={styles.description}>
            Cada rol exige datos propios. Al convertir en prestadora, su registro
            vuelve a quedar pendiente de aprobación.
          </p>
          <div className={styles.form}>
            <SelectField
              label="Nuevo rol"
              options={ROLE_OPTIONS}
              value={nextRole}
              onChange={(event) => setNextRole(event.target.value as UserRole)}
            />
            {needsDni && (
              <>
                <Field
                  label="Tipo de documento"
                  maxLength={20}
                  value={dniType}
                  onChange={(event) => setDniType(event.target.value)}
                />
                <Field
                  label="Número de documento"
                  maxLength={30}
                  value={dniNumber}
                  onChange={(event) => setDniNumber(event.target.value)}
                />
              </>
            )}
            {needsLicense && (
              <Field
                label="Licencia"
                maxLength={50}
                value={license}
                onChange={(event) => setLicense(event.target.value)}
              />
            )}
            {needsNit && (
              <Field
                label="NIT"
                maxLength={30}
                value={nit}
                onChange={(event) => setNit(event.target.value)}
              />
            )}
            <Button
              variant="primary"
              disabled={isWorking || !roleReady}
              onClick={() => {
                const payload: ChangeUserRoleRequest = { role: nextRole }
                if (needsDni) {
                  payload.dniType = dniType.trim()
                  payload.dniNumber = dniNumber.trim()
                }
                if (needsLicense) {
                  payload.license = license.trim()
                }
                if (needsNit) {
                  payload.nit = nit.trim()
                }

                void run(async () => {
                  const updated = await usersApi.changeRole(user.id, payload)
                  setUser(updated)
                  setNextRole(updated.role)
                }, `Rol actualizado a ${ROLE_LABELS[nextRole]}.`)
              }}
            >
              Cambiar rol
            </Button>
          </div>
        </article>
      )}

      {!isDeleted && (
        <article className={styles.card}>
          <h2 className={styles.cardTitle}>Restablecer contraseña</h2>
          <p className={styles.description}>
            Se envía un enlace de recuperación al correo del usuario. Nunca se
            escribe una contraseña desde aquí.
          </p>
          <div className={styles.actions}>
            <Button
              variant="accent"
              disabled={isWorking}
              onClick={() =>
                void run(
                  () => usersApi.requestPasswordReset(user.id),
                  'Enlace de recuperación enviado al correo del usuario.',
                )
              }
            >
              Enviar enlace
            </Button>
          </div>
        </article>
      )}

      {!isDeleted && (
        <article className={styles.card}>
          <h2 className={styles.cardTitle}>Eliminar cuenta</h2>
          <p className={`${styles.feedback} ${styles.warning}`}>
            La eliminación anonimiza el correo y los datos de la cuenta. No se
            puede deshacer.
          </p>
          <label className={styles.actionsNote}>
            <input
              type="checkbox"
              checked={confirmDelete}
              onChange={(event) => setConfirmDelete(event.target.checked)}
            />{' '}
            Entiendo que la cuenta no podrá recuperarse.
          </label>
          <div className={styles.actions}>
            <Button
              variant="outlineAccent"
              disabled={isWorking || !confirmDelete}
              onClick={() =>
                void run(async () => {
                  await usersApi.remove(user.id)
                  navigate('/app/usuarios', { replace: true })
                }, 'Cuenta eliminada.')
              }
            >
              Eliminar cuenta
            </Button>
          </div>
        </article>
      )}
    </section>
  )
}
