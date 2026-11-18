import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ApiErrorAction } from '@/components/ApiErrorAction'
import { useApiErrorState } from '@/hooks/useApiErrorState'
import { BackButton } from '@/components/BackButton'
import { translate as t } from '@/i18n/language'
import { useLanguage } from '@/hooks/useLanguage'
import { Avatar } from '@/components/Avatar/Avatar'
import { Button } from '@/components/Button'
import { DefList } from '@/components/DefList/DefList'
import type { DefItem } from '@/components/DefList/DefList'
import { PageHeader } from '@/components/PageHeader/PageHeader'
import { Skeleton } from '@/components/Skeleton'
import { StateMessage } from '@/components/StateMessage'
import { servicesApi } from '@/services/servicesApi'
import { usersApi } from '@/services/usersApi'
import { formatCurrency, formatMonthYear } from '@/utils/format'
import type { PublicProfile, ServiceResponse } from '@/types'
import styles from './profile.module.css'

export default function ProviderProfilePage() {
  useLanguage()
  const { providerId } = useParams<{ providerId: string }>()

  const [provider, setProvider] = useState<PublicProfile | null>(null)
  const [services, setServices] = useState<ServiceResponse[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError, errorCause, setErrorFromApi] = useApiErrorState()
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
        const found = await usersApi.getPublicProfile(providerId as string)
        if (cancelled) return
        if (found.role !== 'SERVICE_PROVIDER') {
          setError(() => t("Esa cuenta no es una prestadora de servicios."))
          return
        }
        setProvider(found)

        try {
          const offered = await servicesApi
            .list({ providerId: providerId as string })
            .then((page) => page.content)
          if (!cancelled) setServices(offered)
        } catch {
          if (!cancelled) setServices([])
        }
      } catch (cause) {
        if (!cancelled) setErrorFromApi(cause)
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [providerId, reloadToken, setError, setErrorFromApi])

  function retry() {
    setIsLoading(true)
    setError(null)
    setReloadToken((value) => value + 1)
  }

  if (isLoading) {
    return (
      <div className={styles.page}>
        <Skeleton variant="text" count={6} label={t("Cargando perfil…")} />
      </div>
    )
  }

  if (provider === null) {
    return (
      <section className={styles.page}>
        <BackButton to="/explorar" />
        <StateMessage
          title={t("No se pudo cargar el perfil")}
          description={error ?? t("No se encontró la prestadora.")}
          tone="error"
          action={<ApiErrorAction error={errorCause} onRetry={retry} />}
        />
      </section>
    )
  }

  const profile =
    provider.role === 'SERVICE_PROVIDER' ? provider.profile : null
  const details: DefItem[] = [
    { label: 'NIT', value: profile?.nit ?? '—' },
    { label: t("Tipo de negocio"), value: profile?.businessType ?? '—' },
    { label: t("Sitio web"), value: profile?.websiteUrl ?? '—' },
    {
      label: t("Ubicación"),
      value:
        profile?.latitude != null && profile?.longitude != null
          ? `${profile.latitude}, ${profile.longitude}`
          : '—',
    },
    {
      label: t("Opera desde"),
      value:
        profile?.startOperationDate != null
          ? formatMonthYear(profile.startOperationDate)
          : '—',
    },
  ]

  return (
    <section className={styles.page}>
      <PageHeader
        breadcrumb={[
          { label: t("Inicio"), to: '/explorar' },
          { label: t("Prestadoras") },
          { label: provider.fullName },
        ]}
        title={provider.fullName}
      />

      <div className={styles.layout}>
        <div className={styles.column}>
          <article className={styles.card}>
            <div className={styles.headerCard}>
              <Avatar name={provider.fullName} size="lg" shape="square" />
              <div className={styles.identity}>
                <h2 className={styles.name}>{provider.fullName}</h2>
                {profile?.businessType != null && (
                  <p className={styles.meta}>{profile.businessType}</p>
                )}
                {profile?.startOperationDate != null && (
                  <p className={styles.meta}>
                    {t("Opera desde")}{" "}{formatMonthYear(profile.startOperationDate)}
                  </p>
                )}
              </div>
            </div>
          </article>

          <article className={styles.card}>
            <h2 className={styles.cardTitle}>{t("Sobre la empresa")}</h2>
            <p className={styles.notice}>
              {t("La descripción y las especialidades de la empresa aún no están disponibles.")}</p>
          </article>

          <article className={styles.card}>
            <h2 className={styles.cardTitle}>{t("Servicios que ofrece")}</h2>

            {services.length === 0 ? (
              <p className={styles.empty}>
                {t("Esta prestadora todavía no tiene servicios publicados.")}</p>
            ) : (
              services.map((service) => (
                <div key={service.id} className={styles.listRow}>
                  <span>
                    <span className={styles.listName}>{service.name}</span>
                    <span className={styles.listMeta}>
                      {formatCurrency(service.price)}
                    </span>
                  </span>
                  <Link to={`/servicios/${service.id}`}>
                    <Button variant="outline" size="sm">
                      {t("Ver detalle")}</Button>
                  </Link>
                </div>
              ))
            )}
          </article>
        </div>

        <div className={styles.column}>
          <article className={styles.card}>
            <h2 className={styles.cardTitle}>{t("Ficha de la prestadora")}</h2>
            <DefList items={details} columns={1} />
            <p className={styles.notice}>
              {t("El contacto se coordina al confirmar una reserva.")}</p>
          </article>

          <article className={styles.card}>
            <h2 className={styles.cardTitle}>{t("Reseñas recientes")}</h2>
            <p className={styles.empty}>
              {t("Todavía no hay reseñas de esta prestadora.")}</p>
          </article>
        </div>
      </div>
    </section>
  )
}
