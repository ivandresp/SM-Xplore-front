import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/Button'
import { Chip } from '@/components/Chip'
import { DataTable } from '@/components/DataTable/DataTable'
import type { Column } from '@/components/DataTable/DataTable'
import { PageHeader } from '@/components/PageHeader/PageHeader'
import { Pagination } from '@/components/Pagination/Pagination'
import { StateMessage } from '@/components/StateMessage'
import { StatusBadge } from '@/components/StatusBadge/StatusBadge'
import { registrationsApi } from '@/services/registrationsApi'
import { describeApiError } from '@/utils/errors'
import { formatDate } from '@/utils/format'
import type {
  QueueableRegistrationStatus,
  RegistrationRole,
  RegistrationSummary,
} from '@/types'
import styles from './registrations.module.css'

const PAGE_SIZE = 10
/** `RegistrationReviewRequest.java:9`: `@Size(max = 500)`. */
const REASON_MAX_LENGTH = 500

interface RoleTab {
  role: RegistrationRole
  label: string
  /** Plural en minúscula para los textos de vacío. */
  many: string
}

const ROLE_TABS: RoleTab[] = [
  { role: 'GUIDE', label: 'Guías', many: 'guías' },
  { role: 'SERVICE_PROVIDER', label: 'Prestadoras', many: 'prestadoras' },
]

/**
 * `GET /registrations` responde 400 si se pide `APROBADO`: solo se consultan
 * las que esperan decisión. Se aprueba o rechaza desde la cola de pendientes.
 */
const STATUS_OPTIONS: Array<{
  value: QueueableRegistrationStatus
  label: string
}> = [
  { value: 'PENDIENTE', label: 'Pendientes' },
  { value: 'RECHAZADO', label: 'Rechazadas' },
]

const STATUS_LABELS: Record<QueueableRegistrationStatus, string> = {
  PENDIENTE: 'Pendiente',
  RECHAZADO: 'Rechazada',
}

const STATUS_TONES: Record<QueueableRegistrationStatus, 'warning' | 'danger'> =
  {
    PENDIENTE: 'warning',
    RECHAZADO: 'danger',
  }

export default function RegistrationsQueuePage() {
  const [role, setRole] = useState<RegistrationRole>('GUIDE')
  const [status, setStatus] = useState<QueueableRegistrationStatus>('PENDIENTE')
  const [page, setPage] = useState(1)

  const [rows, setRows] = useState<RegistrationSummary[]>([])
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)

  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)

  const [rejecting, setRejecting] = useState<RegistrationSummary | null>(null)
  const [reason, setReason] = useState('')
  const [isWorking, setIsWorking] = useState(false)
  const [reloadToken, setReloadToken] = useState(0)

  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const statusSelectRef = useRef<HTMLSelectElement | null>(null)
  /**
   * Una mutación fallida no invalida la caché de 30 s de `httpClient`; la
   * recarga manual la salta con `_=<marca>` y se limpia al leer bien.
   */
  const cacheBusterRef = useRef<number | undefined>(undefined)

  useEffect(() => {
    let cancelled = false

    async function load() {
      setIsLoading(true)
      setLoadError(null)

      try {
        const result = await registrationsApi.list({
          role,
          status,
          page: page - 1,
          size: PAGE_SIZE,
          cacheBust: cacheBusterRef.current,
        })
        cacheBusterRef.current = undefined

        if (!cancelled) {
          setRows(result.content)
          setTotal(result.total)
          setTotalPages(Math.max(1, result.totalPages))
        }
      } catch (cause) {
        if (!cancelled) {
          setRows([])
          setTotal(0)
          setTotalPages(1)
          setLoadError(describeApiError(cause))
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
  }, [role, status, page, reloadToken])

  /**
   * El panel se abre debajo de la tabla: hay que llevar el foco y la vista al
   * motivo, o en pantallas pequeñas queda fuera del pliegue.
   */
  useEffect(() => {
    if (rejecting === null) {
      return
    }
    const field = textareaRef.current
    if (field === null) {
      return
    }
    field.focus()
    if (typeof field.scrollIntoView === 'function') {
      field.scrollIntoView({ block: 'center' })
    }
  }, [rejecting])

  function closeRejection(restoreTrigger: boolean) {
    const trigger =
      rejecting === null
        ? null
        : document.getElementById(`rechazar-${rejecting.id}`)
    setRejecting(null)
    setReason('')
    if (restoreTrigger) {
      trigger?.focus()
    }
  }

  function retry() {
    setIsLoading(true)
    setLoadError(null)
    cacheBusterRef.current = Date.now()
    setReloadToken((token) => token + 1)
  }

  function changeRole(next: RegistrationRole) {
    setRole(next)
    setPage(1)
    setRejecting(null)
    setReason('')
    setFeedback(null)
    setActionError(null)
  }

  function changeStatus(next: QueueableRegistrationStatus) {
    setStatus(next)
    setPage(1)
    setRejecting(null)
    setReason('')
    setFeedback(null)
    setActionError(null)
  }

  /**
   * `POST /registrations/{id}/review`. El motivo solo viaja al rechazar: el
   * backend responde 400 con `errors.reason` si falta.
   */
  async function review(
    row: RegistrationSummary,
    decision: 'APROBADO' | 'RECHAZADO',
    rejectionReason = '',
  ) {
    setIsWorking(true)
    setActionError(null)
    setFeedback(null)

    try {
      await registrationsApi.review(
        row.id,
        decision === 'RECHAZADO'
          ? { decision, reason: rejectionReason.trim() }
          : { decision },
      )
      // El backend no confirma la entrega del correo: no se promete.
      // Y solo el guía queda sin poder entrar; la prestadora sigue activa.
      const aviso = `Aviso por correo a ${row.email}; revisa la bandeja de entrada.`
      setFeedback(
        decision === 'APROBADO'
          ? `Solicitud de ${row.fullName} aprobada. ${aviso}`
          : row.role === 'SERVICE_PROVIDER'
            ? `Solicitud de ${row.fullName} rechazada con motivo. ${aviso} El perfil no se publica en el catálogo y la cuenta sigue activa.`
            : `Solicitud de ${row.fullName} rechazada con motivo. ${aviso}`,
      )
      setRejecting(null)
      setReason('')
      // El filtro de estado siempre existe: es el punto estable de vuelta.
      statusSelectRef.current?.focus()
      // Si era la última fila visible, la página actual quedaría vacía: se
      // retrocede una antes de recargar.
      if (rows.length <= 1 && page > 1) {
        setPage(page - 1)
      } else {
        setReloadToken((token) => token + 1)
      }
    } catch (cause) {
      setActionError(describeApiError(cause))
    } finally {
      setIsWorking(false)
    }
  }

  const tab = ROLE_TABS.find((item) => item.role === role) ?? ROLE_TABS[0]
  const identificationHeader = role === 'GUIDE' ? 'Licencia' : 'NIT'

  const columns: Column<RegistrationSummary>[] = [
    {
      header: 'Solicitante',
      render: (row) => (
        <div>
          <p className={styles.name}>{row.fullName}</p>
          <p className={styles.email}>{row.email}</p>
        </div>
      ),
    },
    {
      header: identificationHeader,
      render: (row) => row.license ?? row.nit ?? '—',
    },
    {
      header: 'Solicitud',
      render: (row) => formatDate(row.signedUpAt),
    },
    {
      header: 'Estado',
      render: (row) => (
        <StatusBadge
          tone={
            STATUS_TONES[
              row.registrationStatus === 'RECHAZADO' ? 'RECHAZADO' : 'PENDIENTE'
            ]
          }
        >
          {
            STATUS_LABELS[
              row.registrationStatus === 'RECHAZADO' ? 'RECHAZADO' : 'PENDIENTE'
            ]
          }
        </StatusBadge>
      ),
    },
    {
      header: 'Acciones',
      align: 'right',
      render: (row) => (
        <div className={styles.rowActions}>
          <Button
            variant="outline"
            size="sm"
            disabled={isWorking || row.registrationStatus !== 'PENDIENTE'}
            onClick={() => void review(row, 'APROBADO')}
          >
            Aprobar
          </Button>
          <Button
            id={`rechazar-${row.id}`}
            variant="outline"
            size="sm"
            disabled={isWorking || row.registrationStatus !== 'PENDIENTE'}
            aria-expanded={rejecting?.id === row.id}
            aria-controls={
              rejecting?.id === row.id ? 'motivo-rechazo' : undefined
            }
            onClick={() => {
              if (rejecting?.id === row.id) {
                closeRejection(true)
                return
              }
              setRejecting(row)
              setReason('')
              setActionError(null)
              setFeedback(null)
            }}
          >
            Rechazar
          </Button>
        </div>
      ),
    },
  ]

  const emptyMessage =
    status === 'PENDIENTE'
      ? `No hay ${tab.many} pendientes de revisión.`
      : `No hay ${tab.many} rechazadas.`

  const reasonTrimmed = reason.trim()

  return (
    <section>
      <PageHeader
        breadcrumb={[{ label: 'Solicitudes' }, { label: tab.label }]}
        title="Solicitudes de alta"
        description="Revisa las altas de guías y prestadoras: aprueba o rechaza con motivo."
        meta={`${total} ${total === 1 ? 'solicitud' : 'solicitudes'}`}
      />

      <div className={styles.toolbar}>
        <div className={styles.tabs} role="group" aria-label="Tipo de solicitud">
          {ROLE_TABS.map((item) => (
            <Chip
              key={item.role}
              selected={role === item.role}
              onClick={() => changeRole(item.role)}
            >
              {item.label}
            </Chip>
          ))}
        </div>

        <label className={styles.filter}>
          <span className={styles.filterLabel}>Estado</span>
          <select
            ref={statusSelectRef}
            className={styles.select}
            value={status}
            onChange={(event) =>
              changeStatus(event.target.value as QueueableRegistrationStatus)
            }
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {actionError !== null && (
        <div className={styles.actionError}>
          <p className={styles.error} role="alert">
            {actionError}
          </p>
          <Button onClick={retry}>Vuelve a cargar la lista</Button>
        </div>
      )}
      {feedback !== null && (
        <p className={styles.success} role="status">
          {feedback}
        </p>
      )}

      {loadError !== null ? (
        <StateMessage
          title="No se pudieron cargar las solicitudes"
          description={loadError}
          tone="error"
          action={<Button onClick={retry}>Vuelve a cargar la lista</Button>}
        />
      ) : (
        <>
          <DataTable
            columns={columns}
            rows={rows}
            rowKey={(row) => row.id}
            isLoading={isLoading}
            loadingMessage="Cargando solicitudes…"
            emptyMessage={emptyMessage}
          />

          {/* El panel viaja pegado a la tabla, antes del paginador, para que
              el botón Rechazar y su motivo no se separen. */}
          {rejecting !== null && (
            <article
              className={styles.panel}
              aria-labelledby="motivo-titulo"
            >
              <h2 className={styles.panelTitle} id="motivo-titulo">
                Rechazar la solicitud de {rejecting.fullName}
              </h2>
              <p className={styles.panelText}>
                El motivo es obligatorio y viaja en el aviso por correo de la
                decisión.
              </p>
              {rejecting.role === 'SERVICE_PROVIDER' && (
                <p className={styles.panelText}>
                  La prestadora sigue activa y podrá iniciar sesión; su perfil no
                  se publica en el catálogo.
                </p>
              )}

              <label className={styles.panelLabel} htmlFor="motivo-rechazo">
                Motivo del rechazo
              </label>
              <textarea
                ref={textareaRef}
                id="motivo-rechazo"
                className={styles.textarea}
                rows={3}
                maxLength={REASON_MAX_LENGTH}
                value={reason}
                aria-describedby="motivo-ayuda"
                onChange={(event) => setReason(event.target.value)}
              />
              <p className={styles.panelHint} id="motivo-ayuda">
                {reasonTrimmed.length}/{REASON_MAX_LENGTH} caracteres ·
                obligatorio
              </p>

              <div className={styles.panelActions}>
                <Button
                  variant="outline"
                  disabled={isWorking || reasonTrimmed === ''}
                  onClick={() => void review(rejecting, 'RECHAZADO', reason)}
                >
                  Confirmar rechazo
                </Button>
                <Button
                  variant="outline"
                  onClick={() => closeRejection(true)}
                >
                  Cancelar
                </Button>
              </div>
            </article>
          )}

          {total > PAGE_SIZE && (
            <Pagination
              page={page}
              totalPages={totalPages}
              onChange={setPage}
            />
          )}
        </>
      )}
    </section>
  )
}
