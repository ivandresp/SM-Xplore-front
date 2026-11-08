import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Button } from '@/components/Button'
import { DefList } from '@/components/DefList/DefList'
import { Field } from '@/components/FormField'
import { PageHeader } from '@/components/PageHeader/PageHeader'
import { Skeleton } from '@/components/Skeleton'
import { StateMessage } from '@/components/StateMessage'
import { StatusBadge } from '@/components/StatusBadge/StatusBadge'
import {
  ACCOUNT_STATUS_LABELS,
  ACCOUNT_STATUS_TONES,
  PROVIDER_STATUS_LABELS,
  PROVIDER_STATUS_TONES,
} from '@/config/roles'
import { usersApi } from '@/services/usersApi'
import { describeApiError } from '@/utils/errors'
import { formatDate } from '@/utils/format'
import type { AdminUserDetail, ProviderRegistrationStatus } from '@/types'
import styles from './admin.module.css'

function statusKey(value: string | null): ProviderRegistrationStatus | null {
  return value !== null && value in PROVIDER_STATUS_LABELS
    ? (value as ProviderRegistrationStatus)
    : null
}

export default function ProviderApprovalPage() {
  const { providerId } = useParams<{ providerId: string }>()

  const [provider, setProvider] = useState<AdminUserDetail | null>(null)
  const [reason, setReason] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isWorking, setIsWorking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [reloadToken, setReloadToken] = useState(0)

  useEffect(() => {
    if (providerId === undefined) {
      return
    }

    let cancelled = false

    async function load() {
      setIsLoading(true)
      setError(null)

      try {
        const found = await usersApi.getById(providerId as string)
        if (!cancelled) {
          setProvider(found)
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
  }, [providerId, reloadToken])

  function retry() {
    setIsLoading(true)
    setError(null)
    setReloadToken((token) => token + 1)
  }

  async function review(decision: 'APROBADO' | 'RECHAZADO') {
    if (provider === null) {
      return
    }

    setIsWorking(true)
    setError(null)
    setFeedback(null)

    try {
      await usersApi.reviewProvider(provider.id, {
        decision,
        reason: reason.trim() || undefined,
      })
      const updated = await usersApi.getById(provider.id)
      setProvider(updated)
      setReason('')
      setFeedback(
        decision === 'APROBADO'
          ? 'Prestadora aprobada: se notificó por correo.'
          : 'Registro rechazado: se notificó por correo.',
      )
    } catch (cause) {
      setError(describeApiError(cause))
    } finally {
      setIsWorking(false)
    }
  }

  if (isLoading) {
    return <Skeleton variant="text" count={4} label="Cargando solicitud…" />
  }

  if (provider === null) {
    return (
      <section>
        <Link to="/app/usuarios" className={styles.back}>
          ← Volver al listado
        </Link>
        <StateMessage
          title="No se pudo cargar la solicitud"
          description={error ?? 'No se encontró la solicitud.'}
          tone="error"
          action={<Button onClick={retry}>Reintentar</Button>}
        />
      </section>
    )
  }

  if (provider.role !== 'SERVICE_PROVIDER') {
    return (
      <section>
        <Link to={`/app/usuarios/${provider.id}`} className={styles.back}>
          ← Volver al detalle
        </Link>
        <p className={`${styles.feedback} ${styles.warning}`} role="alert">
          La cuenta no es una prestadora de servicios. Solo las prestadoras
          tienen registro que aprobar o rechazar.
        </p>
      </section>
    )
  }

  const profile = provider.profile
  const currentStatus = statusKey(profile?.registrationStatus ?? null)
  const isPending = profile?.registrationStatus === 'PENDIENTE'

  return (
    <section>
      <Link to="/app/usuarios" className={styles.back}>
        ← Volver al listado
      </Link>

      <PageHeader
        breadcrumb={[
          { label: 'Usuarios', to: '/app/usuarios' },
          { label: 'Prestadoras' },
          { label: 'Revisión' },
        ]}
        title={provider.fullName}
        description="Revisa los datos de la prestadora y registra la decisión."
        actions={
          <>
            <StatusBadge tone={ACCOUNT_STATUS_TONES[provider.status]}>
              {ACCOUNT_STATUS_LABELS[provider.status]}
            </StatusBadge>
            {currentStatus !== null ? (
              <StatusBadge tone={PROVIDER_STATUS_TONES[currentStatus]}>
                {PROVIDER_STATUS_LABELS[currentStatus]}
              </StatusBadge>
            ) : (
              <StatusBadge tone="neutral">Sin registro</StatusBadge>
            )}
          </>
        }
      />

      {error !== null && (
        <p className={`${styles.feedback} ${styles.error}`} role="alert">
          {error}
        </p>
      )}
      {feedback !== null && (
        <p className={`${styles.feedback} ${styles.success}`} role="status">
          {feedback}
        </p>
      )}

      <article className={styles.card}>
        <h2 className={styles.cardTitle}>Datos de la solicitud</h2>
        <DefList
          items={[
            { label: 'Razón social', value: provider.fullName },
            { label: 'NIT', value: profile?.nit ?? '—' },
            { label: 'Correo', value: provider.email },
            { label: 'Teléfono', value: provider.phone || '—' },
            { label: 'Tipo de negocio', value: profile?.businessType ?? '—' },
            { label: 'Sitio web', value: profile?.websiteUrl ?? '—' },
            {
              label: 'Ubicación',
              value:
                profile?.latitude != null && profile?.longitude != null
                  ? `${profile.latitude}, ${profile.longitude}`
                  : '—',
            },
            {
              label: 'Inicio de operación',
              value: profile?.startOperationDate
                ? formatDate(profile.startOperationDate)
                : '—',
            },
            {
              label: 'Cuenta creada',
              value: formatDate(provider.signedUpAt),
            },
          ]}
        />
      </article>

      <article className={styles.card}>
        <h2 className={styles.cardTitle}>Decisión</h2>
        <p className={styles.description}>
          El motivo queda en la notificación que recibe la prestadora. Aprobar o
          rechazar no cambia el estado de la cuenta.
        </p>
        <div className={styles.form}>
          <Field
            label="Motivo (opcional)"
            maxLength={500}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
          />
        </div>
        <div className={styles.actions}>
          <Button
            variant="primary"
            disabled={isWorking || !isPending}
            onClick={() => void review('APROBADO')}
          >
            Aprobar
          </Button>
          <Button
            variant="outline"
            disabled={isWorking || !isPending}
            onClick={() => void review('RECHAZADO')}
          >
            Rechazar
          </Button>
          {!isPending && (
            <p className={styles.actionsNote}>
              {currentStatus === null
                ? 'La prestadora no tiene un registro que revisar.'
                : `El registro ya está en estado ${PROVIDER_STATUS_LABELS[currentStatus].toLowerCase()}.`}
            </p>
          )}
        </div>
      </article>
    </section>
  )
}
