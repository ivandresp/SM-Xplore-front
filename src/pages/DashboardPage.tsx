import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/Button'
import { Skeleton } from '@/components/Skeleton'
import type { SkeletonVariant } from '@/components/Skeleton'
import { StateMessage } from '@/components/StateMessage'
import { StatusBadge } from '@/components/StatusBadge/StatusBadge'
import {
  ACCOUNT_STATUS_LABELS,
  ACTIVITY_STATUS_LABELS,
  ACTIVITY_STATUS_TONES,
  CONTENT_STATUS_LABELS,
  CONTENT_STATUS_TONES,
  RESERVATION_STATUS_LABELS,
  RESERVATION_STATUS_TONES,
  ROLE_LABELS,
} from '@/config/roles'
import { useAuth } from '@/hooks/useAuth'
import { activitiesApi } from '@/services/activitiesApi'
import { recommendationsApi } from '@/services/recommendationsApi'
import { reservationsApi } from '@/services/reservationsApi'
import { securityReportsApi } from '@/services/securityReportsApi'
import { servicesApi } from '@/services/servicesApi'
import { sitesApi } from '@/services/sitesApi'
import { usersApi } from '@/services/usersApi'
import { zonesApi } from '@/services/zonesApi'
import { describeApiError } from '@/utils/errors'
import { formatCurrency, formatDate, formatDateTime } from '@/utils/format'
import { MAX_PAGE_SIZE } from '@/types/common'
import type {
  AuthUser,
  RecommendationItemType,
  ReservationItemType,
  ReservationSummaryResponse,
  UserRole,
} from '@/types'
import styles from './DashboardPage.module.css'

/** El backend acota las listas cortas a 200; por encima del tope se marca «+». */
const ITEM_RESERVATIONS_LIMIT = 100

const ROLE_SUBTITLES: Record<UserRole, string> = {
  TOURIST: 'Tus próximas reservas y sugerencias del catálogo.',
  GUIDE: 'Tus actividades, su estado y las reservas que han recibido.',
  SERVICE_PROVIDER: 'Tus servicios publicados y su estado.',
  DESTINATION_MANAGER:
    'Reportes de seguridad abiertos y el catálogo de zonas y atractivos.',
  ADMIN: 'Prestadoras pendientes de aprobación y el estado de las cuentas.',
}

const RESERVATION_ITEM_LABELS: Record<ReservationItemType, string> = {
  ACTIVITY: 'Actividad',
  EVENT: 'Evento',
}

const RECOMMENDATION_LINKS: Record<
  RecommendationItemType,
  { label: string; to: string; action: string }
> = {
  SITE: { label: 'Atractivo', to: '/atractivos', action: 'Ver atractivos' },
  ACTIVITY: { label: 'Actividad', to: '/explorar', action: 'Ver actividades' },
  EVENT: { label: 'Evento', to: '/eventos', action: 'Ver eventos' },
  SERVICE: { label: 'Servicio', to: '/servicios', action: 'Ver servicios' },
}

interface LoadState<T> {
  data: T | null
  isLoading: boolean
  error: string | null
  retry: () => void
}

/**
 * Carga independiente por bloque: cada tarjeta tiene su esqueleto, su error y
 * su reintento, así que un fallo no tumba el resto del panel.
 */
function useLoad<T>(key: string, load: () => Promise<T>): LoadState<T> {
  const loader = useRef(load)
  const [attempt, setAttempt] = useState(0)
  const [result, setResult] = useState<{
    key: string
    data: T | null
    error: string | null
  } | null>(null)

  useEffect(() => {
    loader.current = load
  })

  const requestKey = `${key}#${attempt}`

  useEffect(() => {
    let cancelled = false

    loader.current().then(
      (data) => {
        if (!cancelled) {
          setResult({ key: requestKey, data, error: null })
        }
      },
      (cause: unknown) => {
        if (!cancelled) {
          setResult({
            key: requestKey,
            data: null,
            error: describeApiError(cause),
          })
        }
      },
    )

    return () => {
      cancelled = true
    }
  }, [requestKey])

  const current = result !== null && result.key === requestKey ? result : null

  return {
    data: current?.data ?? null,
    isLoading: current === null,
    error: current?.error ?? null,
    retry: () => setAttempt((value) => value + 1),
  }
}

interface LoadableProps<T> {
  state: LoadState<T>
  errorTitle: string
  skeleton?: SkeletonVariant
  skeletonCount?: number
  children: (data: T) => ReactNode
}

/** Esqueleto, error con reintento o contenido, según el estado del bloque. */
function Loadable<T>({
  state,
  errorTitle,
  skeleton = 'card',
  skeletonCount = 2,
  children,
}: LoadableProps<T>) {
  if (state.isLoading) {
    return (
      <Skeleton
        variant={skeleton}
        count={skeletonCount}
        label="Cargando información del panel"
      />
    )
  }

  if (state.error !== null) {
    return (
      <StateMessage
        tone="error"
        title={errorTitle}
        description={state.error}
        action={<Button onClick={state.retry}>Reintentar</Button>}
      />
    )
  }

  return state.data === null ? null : <>{children(state.data)}</>
}

function Panel({
  title,
  action,
  children,
}: {
  title: string
  action?: ReactNode
  children: ReactNode
}) {
  return (
    <section className={styles.panel}>
      <div className={styles.panelHead}>
        <h2 className={styles.panelTitle}>{title}</h2>
        {action}
      </div>
      {children}
    </section>
  )
}

/** Recuento de una página por cursor: ms-02 no devuelve total. */
function cursorCount(page: { content: unknown[]; hasNext: boolean }): string {
  return page.hasNext ? `${page.content.length}+` : String(page.content.length)
}

function receivedReservationsLabel(
  result: PromiseSettledResult<ReservationSummaryResponse[]> | undefined,
): string {
  if (result === undefined) {
    return '…'
  }

  if (result.status === 'rejected') {
    return 'Sin dato'
  }

  const total = result.value.length
  if (total >= ITEM_RESERVATIONS_LIMIT) {
    return `${ITEM_RESERVATIONS_LIMIT}+ reservas`
  }

  return `${total} ${total === 1 ? 'reserva' : 'reservas'}`
}

type TouristUser = Extract<AuthUser, { role: 'TOURIST' }>
type GuideUser = Extract<AuthUser, { role: 'GUIDE' }>
type ProviderUser = Extract<AuthUser, { role: 'SERVICE_PROVIDER' }>

function TouristDashboard({ user }: { user: TouristUser }) {
  const reservations = useLoad('tourist-reservations', () =>
    reservationsApi.listByTourist(user.id, 50),
  )
  const recommendations = useLoad('tourist-recommendations', () =>
    recommendationsApi.list({ limit: 4 }),
  )

  return (
    <div className={styles.grid}>
      <Panel title="Próximas reservas">
        <Loadable
          state={reservations}
          errorTitle="No se pudieron cargar tus reservas"
          skeleton="table"
          skeletonCount={3}
        >
          {(items) => {
            const upcoming = items
              .filter(
                (reservation) =>
                  reservation.status === 'CONFIRMED' &&
                  new Date(reservation.itemStartsAt).getTime() >= Date.now(),
              )
              .sort(
                (a, b) =>
                  new Date(a.itemStartsAt).getTime() -
                  new Date(b.itemStartsAt).getTime(),
              )
              .slice(0, 4)

            if (upcoming.length === 0) {
              return (
                <StateMessage
                  title="Sin reservas próximas"
                  description="Cuando reserves una actividad o un evento aparecerá aquí."
                  action={
                    <Link className={styles.action} to="/explorar">
                      Explorar actividades
                    </Link>
                  }
                />
              )
            }

            return (
              <ul className={styles.list}>
                {upcoming.map((reservation) => (
                  <li key={reservation.id} className={styles.item}>
                    <div className={styles.itemMain}>
                      <Link
                        className={styles.itemLink}
                        to={`/mis-reservas/${reservation.id}`}
                      >
                        {reservation.code} ·{' '}
                        {RESERVATION_ITEM_LABELS[reservation.itemType]}
                      </Link>
                      <p className={styles.itemMeta}>
                        {formatDateTime(reservation.itemStartsAt)} ·{' '}
                        {reservation.numberOfPeople}{' '}
                        {reservation.numberOfPeople === 1 ? 'persona' : 'personas'}
                      </p>
                    </div>
                    <StatusBadge
                      tone={RESERVATION_STATUS_TONES[reservation.status]}
                    >
                      {RESERVATION_STATUS_LABELS[reservation.status]}
                    </StatusBadge>
                  </li>
                ))}
              </ul>
            )
          }}
        </Loadable>

        <div className={styles.actions}>
          <Link className={styles.action} to="/mis-reservas">
            Ver todas mis reservas
          </Link>
          <Link className={styles.action} to="/explorar">
            Explorar
          </Link>
        </div>
      </Panel>

      <Panel
        title="Recomendado para ti"
        action={
          <Link className={styles.panelLink} to="/recomendaciones">
            Ver todas
          </Link>
        }
      >
        <Loadable
          state={recommendations}
          errorTitle="No se pudieron cargar tus recomendaciones"
          skeleton="card"
          skeletonCount={4}
        >
          {(data) => {
            const items = data.items.slice(0, 4)

            if (items.length === 0) {
              return (
                <StateMessage
                  title="Aún no hay sugerencias"
                  description="Explora el catálogo y vuelve: con tus primeras visitas podremos ordenarlo."
                  action={
                    <Link className={styles.action} to="/explorar">
                      Explorar
                    </Link>
                  }
                />
              )
            }

            return (
              <ul className={styles.recList}>
                {items.map((item) => {
                  const meta = RECOMMENDATION_LINKS[item.itemType]

                  return (
                    <li key={`${item.itemType}-${item.itemId}`} className={styles.rec}>
                      <p className={styles.recKind}>{meta.label}</p>
                      <p className={styles.recName}>{item.name}</p>
                      <p className={styles.itemMeta}>{item.reason}</p>
                      <Link className={styles.itemLink} to={meta.to}>
                        {meta.action}
                      </Link>
                    </li>
                  )
                })}
              </ul>
            )
          }}
        </Loadable>
      </Panel>
    </div>
  )
}

function GuideDashboard({ user }: { user: GuideUser }) {
  const activities = useLoad(`guide-activities:${user.id}`, () =>
    // El backend ya filtra por guía y devuelve también los borradores propios.
    activitiesApi.list({ guideId: user.id, size: MAX_PAGE_SIZE }).then((page) =>
      [...page.content].sort(
        (a, b) =>
          new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
      ),
    ),
  )

  const counted = (activities.data ?? []).slice(0, 3)
  const counts = useLoad(
    `guide-counts:${counted.map((activity) => activity.id).join(',')}`,
    () =>
      // Tres consultas como máximo, en paralelo y aisladas entre sí.
      Promise.allSettled(
        counted.map((activity) =>
          reservationsApi.listByItem({
            itemType: 'ACTIVITY',
            itemId: activity.id,
            limit: ITEM_RESERVATIONS_LIMIT,
          }),
        ),
      ),
  )

  return (
    <div className={styles.grid}>
      <Panel title="Mis actividades">
        <Loadable
          state={activities}
          errorTitle="No se pudieron cargar tus actividades"
          skeleton="table"
          skeletonCount={3}
        >
          {(items) => {
            if (items.length === 0) {
              return (
                <StateMessage
                  title="Todavía no tienes actividades"
                  description="Crea la primera para que los turistas puedan reservarla."
                  action={
                    <Link className={styles.action} to="/app/mis-actividades/nueva">
                      Nueva actividad
                    </Link>
                  }
                />
              )
            }

            return (
              <ul className={styles.list}>
                {items.slice(0, 5).map((activity, index) => (
                  <li key={activity.id} className={styles.item}>
                    <div className={styles.itemMain}>
                      <Link
                        className={styles.itemLink}
                        to={`/app/mis-actividades/${activity.id}`}
                      >
                        {activity.name}
                      </Link>
                      <p className={styles.itemMeta}>
                        {formatDate(activity.startsAt)} ·{' '}
                        {formatCurrency(activity.price)}
                      </p>
                    </div>
                    <div className={styles.itemSide}>
                      <StatusBadge tone={ACTIVITY_STATUS_TONES[activity.status]}>
                        {ACTIVITY_STATUS_LABELS[activity.status]}
                      </StatusBadge>
                      {index < 3 && (
                        <span className={styles.itemNote}>
                          {receivedReservationsLabel(counts.data?.[index])}
                        </span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )
          }}
        </Loadable>

        <div className={styles.actions}>
          <Link className={styles.action} to="/app/mis-actividades">
            Mis actividades
          </Link>
          <Link className={styles.action} to="/app/disponibilidad">
            Disponibilidad
          </Link>
        </div>
      </Panel>
    </div>
  )
}

function ProviderDashboard({ user }: { user: ProviderUser }) {
  const services = useLoad(`provider-services:${user.id}`, () =>
    servicesApi
      .list({ providerId: user.id, size: MAX_PAGE_SIZE })
      .then((page) => page.content),
  )

  return (
    <div className={styles.grid}>
      <Panel title="Mis servicios">
        <Loadable
          state={services}
          errorTitle="No se pudieron cargar tus servicios"
          skeleton="table"
          skeletonCount={3}
        >
          {(items) => {
            if (items.length === 0) {
              return (
                <StateMessage
                  title="Todavía no tienes servicios"
                  description="Publica tu alojamiento, transporte o alimentación."
                  action={
                    <Link className={styles.action} to="/app/mis-servicios/nuevo">
                      Crear servicio
                    </Link>
                  }
                />
              )
            }

            return (
              <ul className={styles.list}>
                {items.slice(0, 6).map((service) => (
                  <li key={service.id} className={styles.item}>
                    <div className={styles.itemMain}>
                      <Link
                        className={styles.itemLink}
                        to={`/app/mis-servicios/${service.id}`}
                      >
                        {service.name}
                      </Link>
                      <p className={styles.itemMeta}>
                        {formatCurrency(service.price)} ·{' '}
                        {service.maxCapacity} personas
                      </p>
                    </div>
                    <StatusBadge tone={CONTENT_STATUS_TONES[service.status]}>
                      {CONTENT_STATUS_LABELS[service.status]}
                    </StatusBadge>
                  </li>
                ))}
              </ul>
            )
          }}
        </Loadable>

        <div className={styles.actions}>
          <Link className={styles.action} to="/app/mis-servicios">
            Mis servicios
          </Link>
          <Link className={styles.action} to="/app/mis-servicios/nuevo">
            Crear servicio
          </Link>
        </div>
      </Panel>
    </div>
  )
}

/** Una cifra con su etiqueta: el mismo bloque en todas las tarjetas de conteo. */
function Stat({ value, label }: { value: string | number; label: string }) {
  return (
    <div className={styles.stat}>
      <p className={styles.statValue}>{value}</p>
      <p className={styles.statLabel}>{label}</p>
    </div>
  )
}

function ManagerDashboard() {
  const reports = useLoad('manager-reports', async () => {
    const [ongoing, reported] = await Promise.all([
      securityReportsApi.list({ status: 'ONGOING', size: 100 }),
      securityReportsApi.list({ status: 'REPORTED', size: 100 }),
    ])
    return { ongoing, reported }
  })

  const catalog = useLoad('manager-catalog', async () => {
    const [zones, sites] = await Promise.all([zonesApi.list(), sitesApi.list()])
    return { zones: zones.length, sites: sites.content.length }
  })

  return (
    <div className={styles.grid}>
      <Panel
        title="Reportes de seguridad"
        action={
          <Link className={styles.panelLink} to="/app/reportes">
            Gestionar
          </Link>
        }
      >
        <Loadable
          state={reports}
          errorTitle="No se pudieron cargar los reportes"
          skeleton="text"
          skeletonCount={2}
        >
          {(data) => (
            <div className={styles.stats}>
              <Stat label="En curso" value={cursorCount(data.ongoing)} />
              <Stat label="Reportados" value={cursorCount(data.reported)} />
            </div>
          )}
        </Loadable>
      </Panel>

      <Panel
        title="Zonas y atractivos"
        action={
          <Link className={styles.panelLink} to="/app/zonas">
            Ver zonas
          </Link>
        }
      >
        <Loadable
          state={catalog}
          errorTitle="No se pudo cargar el catálogo"
          skeleton="text"
          skeletonCount={2}
        >
          {(data) => (
            <div className={styles.stats}>
              <Stat label="Zonas registradas" value={data.zones} />
              <Stat label="Atractivos registrados" value={data.sites} />
            </div>
          )}
        </Loadable>

        <p className={styles.note}>
          El catálogo no distingue zonas por gestora: estos son los totales
          registrados.
        </p>
      </Panel>
    </div>
  )
}

function AdminDashboard() {
  const pending = useLoad('admin-pending', () =>
    usersApi.list({
      providerStatus: 'PENDIENTE',
      sortBy: 'signedUpAt',
      sortOrder: 'ASC',
      size: 5,
    }),
  )
  const accounts = useLoad('admin-accounts', () => usersApi.list({ size: 1 }))

  return (
    <div className={styles.grid}>
      <Panel
        title="Prestadoras pendientes"
        action={
          <Link className={styles.panelLink} to="/app/usuarios">
            Panel de usuarios
          </Link>
        }
      >
        <Loadable
          state={pending}
          errorTitle="No se pudieron cargar las prestadoras pendientes"
          skeleton="table"
          skeletonCount={3}
        >
          {(page) => (
            <>
              <div className={styles.stats}>
                <Stat label="Por aprobar" value={page.totalElements} />
              </div>

              {page.content.length === 0 ? (
                <StateMessage
                  title="No hay prestadoras pendientes"
                  description="Todas las solicitudes de registro están revisadas."
                  action={
                    <Link className={styles.action} to="/app/usuarios">
                      Ir a usuarios
                    </Link>
                  }
                />
              ) : (
                <ul className={styles.list}>
                  {page.content.map((user) => (
                    <li key={user.id} className={styles.item}>
                      <div className={styles.itemMain}>
                        <Link
                          className={styles.itemLink}
                          to={`/app/usuarios/prestadoras/${user.id}`}
                        >
                          {user.fullName}
                        </Link>
                        <p className={styles.itemMeta}>
                          Registro: {formatDate(user.signedUpAt)}
                        </p>
                      </div>
                      <StatusBadge tone="warning">Pendiente</StatusBadge>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </Loadable>

        {pending.data !== null && pending.data.content.length > 0 && (
          <div className={styles.actions}>
            <Link
              className={styles.action}
              to={`/app/usuarios/prestadoras/${pending.data.content[0].id}`}
            >
              Revisar prestadora más antigua
            </Link>
          </div>
        )}
      </Panel>

      <Panel
        title="Cuentas"
        action={
          <Link className={styles.panelLink} to="/app/usuarios">
            Ver listado
          </Link>
        }
      >
        <Loadable
          state={accounts}
          errorTitle="No se pudo cargar el total de cuentas"
          skeleton="text"
          skeletonCount={1}
        >
          {(page) => (
            <div className={styles.stats}>
              <Stat label="Cuentas registradas" value={page.totalElements} />
            </div>
          )}
        </Loadable>

        <p className={styles.note}>
          El listado no devuelve totales por rol: el desglose se consulta con
          los filtros del panel de usuarios.
        </p>
      </Panel>
    </div>
  )
}

export default function DashboardPage() {
  const { user } = useAuth()

  if (user === null) {
    return null
  }

  return (
    <section className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Hola, {user.fullName}</h1>
        <p className={styles.subtitle}>{ROLE_SUBTITLES[user.role]}</p>
        <p className={styles.meta}>
          {ROLE_LABELS[user.role]} · {ACCOUNT_STATUS_LABELS[user.status]} ·
          Registro: {formatDateTime(user.signedUpAt)}
        </p>
      </header>

      {user.role === 'TOURIST' && <TouristDashboard user={user} />}
      {user.role === 'GUIDE' && <GuideDashboard user={user} />}
      {user.role === 'SERVICE_PROVIDER' && <ProviderDashboard user={user} />}
      {user.role === 'DESTINATION_MANAGER' && <ManagerDashboard />}
      {user.role === 'ADMIN' && <AdminDashboard />}
    </section>
  )
}
