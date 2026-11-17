import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { translate as t } from '@/i18n/language'
import { useLanguage } from '@/hooks/useLanguage'
import { Button } from '@/components/Button'
import { Skeleton } from '@/components/Skeleton'
import type { SkeletonVariant } from '@/components/Skeleton'
import { StateMessage } from '@/components/StateMessage'
import { StatusBadge } from '@/components/StatusBadge/StatusBadge'
import {
  ACTIVITY_STATUS_LABELS,
  ACTIVITY_STATUS_TONES,
  CONTENT_STATUS_LABELS,
  CONTENT_STATUS_TONES,
  RESERVATION_STATUS_LABELS,
  RESERVATION_STATUS_TONES,
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
  get TOURIST() { return t("Tus próximas reservas y sugerencias del catálogo.") },
  get GUIDE() { return t("Tus actividades, su estado y las reservas que han recibido.") },
  get SERVICE_PROVIDER() { return t("Tus servicios publicados y su estado.") },
  get DESTINATION_MANAGER() { return t("Reportes de seguridad abiertos y el catálogo de zonas y atractivos.") },
  get ADMIN() { return t("Prestadoras pendientes de aprobación y el estado de las cuentas.") },
}

const RESERVATION_ITEM_LABELS: Record<ReservationItemType, string> = {
  get ACTIVITY() { return t("Actividad") },
  get EVENT() { return t("Evento") },
}

const RECOMMENDATION_LINKS: Record<
  RecommendationItemType,
  { label: string; to: string; action: string }
> = {
  SITE: { get label() { return t("Atractivo") }, to: '/atractivos', get action() { return t("Ver atractivos") } },
  ACTIVITY: { get label() { return t("Actividad") }, to: '/explorar', get action() { return t("Ver actividades") } },
  EVENT: { get label() { return t("Evento") }, to: '/eventos', get action() { return t("Ver eventos") } },
  SERVICE: { get label() { return t("Servicio") }, to: '/servicios', get action() { return t("Ver servicios") } },
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
            get error() { return describeApiError(cause) },
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
  useLanguage()
  if (state.isLoading) {
    return (
      <Skeleton
        variant={skeleton}
        count={skeletonCount}
        label={t("Cargando información del panel")}
      />
    )
  }

  if (state.error !== null) {
    return (
      <StateMessage
        tone="error"
        title={errorTitle}
        description={state.error}
        action={<Button onClick={state.retry}>{t("Reintentar")}</Button>}
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
  useLanguage()
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
    return t("Sin dato")
  }

  const total = result.value.length
  if (total >= ITEM_RESERVATIONS_LIMIT) {
    return t("{0}+ reservas", [ITEM_RESERVATIONS_LIMIT])
  }

  return `${total} ${total === 1 ? t("reserva") : t("reservas")}`
}

type TouristUser = Extract<AuthUser, { role: 'TOURIST' }>
type GuideUser = Extract<AuthUser, { role: 'GUIDE' }>
type ProviderUser = Extract<AuthUser, { role: 'SERVICE_PROVIDER' }>

function TouristDashboard({ user }: { user: TouristUser }) {
  useLanguage()
  const reservations = useLoad('tourist-reservations', () =>
    reservationsApi.listByTourist(user.id, 50),
  )
  const recommendations = useLoad('tourist-recommendations', () =>
    recommendationsApi.list({ limit: 4 }),
  )

  return (
    <div className={styles.grid}>
      <Panel title={t("Próximas reservas")}>
        <Loadable
          state={reservations}
          errorTitle={t("No se pudieron cargar tus reservas")}
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
                  title={t("Sin reservas próximas")}
                  description={t("Cuando reserves una actividad o un evento aparecerá aquí.")}
                  action={
                    <Link className={styles.action} to="/explorar">
                      {t("Explorar actividades")}</Link>
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
                        {reservation.numberOfPeople === 1 ? t("persona") : t("personas")}
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
            {t("Ver todas mis reservas")}</Link>
          <Link className={styles.action} to="/explorar">
            {t("Explorar")}</Link>
        </div>
      </Panel>

      <Panel
        title={t("Recomendado para ti")}
        action={
          <Link className={styles.panelLink} to="/recomendaciones">
            {t("Ver todas")}</Link>
        }
      >
        <Loadable
          state={recommendations}
          errorTitle={t("No se pudieron cargar tus recomendaciones")}
          skeleton="card"
          skeletonCount={4}
        >
          {(data) => {
            const items = data.items.slice(0, 4)

            if (items.length === 0) {
              return (
                <StateMessage
                  title={t("Aún no hay sugerencias")}
                  description={t("Explora el catálogo y vuelve: con tus primeras visitas podremos ordenarlo.")}
                  action={
                    <Link className={styles.action} to="/explorar">
                      {t("Explorar")}</Link>
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
  useLanguage()
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
      <Panel title={t("Mis actividades")}>
        <Loadable
          state={activities}
          errorTitle={t("No se pudieron cargar tus actividades")}
          skeleton="table"
          skeletonCount={3}
        >
          {(items) => {
            if (items.length === 0) {
              return (
                <StateMessage
                  title={t("Todavía no tienes actividades")}
                  description={t("Crea la primera para que los turistas puedan reservarla.")}
                  action={
                    <Link className={styles.action} to="/app/mis-actividades/nueva">
                      {t("Nueva actividad")}</Link>
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
            {t("Mis actividades")}</Link>
          <Link className={styles.action} to="/app/disponibilidad">
            {t("Disponibilidad")}</Link>
        </div>
      </Panel>
    </div>
  )
}

function ProviderDashboard({ user }: { user: ProviderUser }) {
  useLanguage()
  const services = useLoad(`provider-services:${user.id}`, () =>
    servicesApi
      .list({ providerId: user.id, size: MAX_PAGE_SIZE })
      .then((page) => page.content),
  )

  return (
    <div className={styles.grid}>
      <Panel title={t("Mis servicios")}>
        <Loadable
          state={services}
          errorTitle={t("No se pudieron cargar tus servicios")}
          skeleton="table"
          skeletonCount={3}
        >
          {(items) => {
            if (items.length === 0) {
              return (
                <StateMessage
                  title={t("Todavía no tienes servicios")}
                  description={t("Publica tu alojamiento, transporte o alimentación.")}
                  action={
                    <Link className={styles.action} to="/app/mis-servicios/nuevo">
                      {t("Crear servicio")}</Link>
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
                        {service.maxCapacity} {" "}{t("personas")}</p>
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
            {t("Mis servicios")}</Link>
          <Link className={styles.action} to="/app/mis-servicios/nuevo">
            {t("Crear servicio")}</Link>
        </div>
      </Panel>
    </div>
  )
}

/** Una cifra con su etiqueta: el mismo bloque en todas las tarjetas de conteo. */
function Stat({ value, label }: { value: string | number; label: string }) {
  useLanguage()
  return (
    <div className={styles.stat}>
      <p className={styles.statValue}>{value}</p>
      <p className={styles.statLabel}>{label}</p>
    </div>
  )
}

function ManagerDashboard() {
  useLanguage()
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
        title={t("Reportes de seguridad")}
        action={
          <Link className={styles.panelLink} to="/app/reportes">
            {t("Gestionar")}</Link>
        }
      >
        <Loadable
          state={reports}
          errorTitle={t("No se pudieron cargar los reportes")}
          skeleton="text"
          skeletonCount={2}
        >
          {(data) => (
            <div className={styles.stats}>
              <Stat label={t("En curso")} value={cursorCount(data.ongoing)} />
              <Stat label={t("Reportados")} value={cursorCount(data.reported)} />
            </div>
          )}
        </Loadable>
      </Panel>

      <Panel
        title={t("Zonas y atractivos")}
        action={
          <Link className={styles.panelLink} to="/app/zonas">
            {t("Ver zonas")}</Link>
        }
      >
        <Loadable
          state={catalog}
          errorTitle={t("No se pudo cargar el catálogo")}
          skeleton="text"
          skeletonCount={2}
        >
          {(data) => (
            <div className={styles.stats}>
              <Stat label={t("Zonas registradas")} value={data.zones} />
              <Stat label={t("Atractivos registrados")} value={data.sites} />
            </div>
          )}
        </Loadable>

        <p className={styles.note}>
          {t("El catálogo no distingue zonas por gestora: estos son los totales registrados.")}</p>
      </Panel>
    </div>
  )
}

function AdminDashboard() {
  useLanguage()
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
        title={t("Prestadoras pendientes")}
        action={
          <Link className={styles.panelLink} to="/app/usuarios">
            {t("Panel de usuarios")}</Link>
        }
      >
        <Loadable
          state={pending}
          errorTitle={t("No se pudieron cargar las prestadoras pendientes")}
          skeleton="table"
          skeletonCount={3}
        >
          {(page) => (
            <>
              <div className={styles.stats}>
                <Stat label={t("Por aprobar")} value={page.totalElements} />
              </div>

              {page.content.length === 0 ? (
                <StateMessage
                  title={t("No hay prestadoras pendientes")}
                  description={t("Todas las solicitudes de registro están revisadas.")}
                  action={
                    <Link className={styles.action} to="/app/usuarios">
                      {t("Ir a usuarios")}</Link>
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
                          {t("Registro:")}{" "}{formatDate(user.signedUpAt)}
                        </p>
                      </div>
                      <StatusBadge tone="warning">{t("Pendiente")}</StatusBadge>
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
              {t("Revisar prestadora más antigua")}</Link>
          </div>
        )}
      </Panel>

      <Panel
        title={t("Cuentas")}
        action={
          <Link className={styles.panelLink} to="/app/usuarios">
            {t("Ver listado")}</Link>
        }
      >
        <Loadable
          state={accounts}
          errorTitle={t("No se pudo cargar el total de cuentas")}
          skeleton="text"
          skeletonCount={1}
        >
          {(page) => (
            <div className={styles.stats}>
              <Stat label={t("Cuentas registradas")} value={page.totalElements} />
            </div>
          )}
        </Loadable>

        <p className={styles.note}>
          {t("Consulta el desglose por rol con los filtros del panel de usuarios.")}</p>
      </Panel>
    </div>
  )
}

export default function DashboardPage() {
  useLanguage()
  const { user } = useAuth()

  if (user === null) {
    return null
  }

  return (
    <section className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>{t("Hola,")}{" "}{user.fullName}</h1>
        <p className={styles.subtitle}>{ROLE_SUBTITLES[user.role]}</p>
      </header>

      {user.role === 'TOURIST' && <TouristDashboard user={user} />}
      {user.role === 'GUIDE' && <GuideDashboard user={user} />}
      {user.role === 'SERVICE_PROVIDER' && <ProviderDashboard user={user} />}
      {user.role === 'DESTINATION_MANAGER' && <ManagerDashboard />}
      {user.role === 'ADMIN' && <AdminDashboard />}
    </section>
  )
}
