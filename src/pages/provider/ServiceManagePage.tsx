import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useMessageState } from '@/hooks/useMessageState'
import { translate as t } from '@/i18n/language'
import { useLanguage } from '@/hooks/useLanguage'
import { Button } from '@/components/Button'
import { DefList } from '@/components/DefList/DefList'
import type { DefItem } from '@/components/DefList/DefList'
import { Field } from '@/components/FormField'
import { ImageUploader } from '@/components/ImageUploader'
import { PageHeader } from '@/components/PageHeader/PageHeader'
import { Skeleton } from '@/components/Skeleton'
import { SitePhotoGallery } from '@/components/SitePhotoGallery'
import { StateMessage } from '@/components/StateMessage'
import { StatusBadge } from '@/components/StatusBadge/StatusBadge'
import {
  CONTENT_STATUS_LABELS,
  CONTENT_STATUS_TONES,
  serviceTypeLabel,
} from '@/config/roles'
import { servicesApi } from '@/services/servicesApi'
import { describeApiError } from '@/utils/errors'
import { formatCurrency, formatDateTime } from '@/utils/format'
import type { ServiceResponse, UpdateServiceRequest } from '@/types'
import styles from './provider.module.css'

/** `PUT /services/{id}` reemplaza el recurso: hay que reenviar todos los campos. */
function toUpdateBody(service: ServiceResponse): UpdateServiceRequest {
  return {
    name: service.name,
    description: service.description,
    type: service.type,
    categoryId: service.categoryId,
    siteId: service.siteId,
    zoneId: service.zoneId,
    latitude: service.latitude,
    longitude: service.longitude,
    price: service.price,
    maxCapacity: service.maxCapacity,
    photosUrls: service.photosUrls,
    cancellationPolicy: service.cancellationPolicy,
  }
}

export default function ServiceManagePage() {
  useLanguage()
  const { serviceId } = useParams<{ serviceId: string }>()

  const [service, setService] = useState<ServiceResponse | null>(null)
  const [price, setPrice] = useState('')
  const [newPhotoUrls, setNewPhotoUrls] = useState<string[]>([])
  const [photosUploading, setPhotosUploading] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isWorking, setIsWorking] = useState(false)
  const [error, setError] = useMessageState<string | null>(null)
  const [feedback, setFeedback] = useMessageState<string | null>(null)
  const [reloadToken, setReloadToken] = useState(0)

  useEffect(() => {
    if (serviceId === undefined) {
      return
    }

    let cancelled = false

    async function run() {
      setIsLoading(true)
      setError(null)

      try {
        const found = await servicesApi.getById(serviceId as string)
        if (!cancelled) {
          setService(found)
          setPrice(String(found.price))
          setError(null)
        }
      } catch (cause) {
        if (!cancelled) setError(() => describeApiError(cause))
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    void run()

    return () => {
      cancelled = true
    }
  }, [serviceId, reloadToken, setError])

  function retry() {
    setIsLoading(true)
    setError(null)
    setReloadToken((token) => token + 1)
  }

  if (isLoading) {
    return <Skeleton variant="text" count={4} label={t("Cargando servicio…")} />
  }

  if (service === null) {
    return (
      <section>
        <Link to="/app/mis-servicios" className={styles.back}>
          {t("← Volver a mis servicios")}</Link>
        <StateMessage
          title={t("No se pudo cargar el servicio")}
          description={error ?? t("No se encontró el servicio.")}
          tone="error"
          action={<Button onClick={retry}>{t("Reintentar")}</Button>}
        />
      </section>
    )
  }

  const current = service

  const infoItems: DefItem[] = [
    { label: t("Tipo"), value: serviceTypeLabel(current.type) },
    { label: t("Categoría"), value: current.categoryName || '—' },
    { label: t("Atractivo"), value: current.siteName || '—' },
    { label: t("Zona"), value: current.zoneName || '—' },
    { label: t("Precio"), value: formatCurrency(current.price) },
    {
      label: t("Capacidad"),
      value: t('{0} personas', [current.maxCapacity]),
    },
    {
      label: t("Ubicación"),
      value: `${current.latitude}, ${current.longitude}`,
    },
    { label: t("Creado"), value: formatDateTime(current.createdAt) },
  ]

  async function runAction(
    action: () => Promise<ServiceResponse>,
    message: () => string,
  ) {
    setIsWorking(true)
    setError(null)
    setFeedback(null)

    try {
      const updated = await action()
      setService(updated)
      setPrice(String(updated.price))
      setFeedback(message)
    } catch (cause) {
      setError(() => describeApiError(cause))
    } finally {
      setIsWorking(false)
    }
  }

  async function addPhotos() {
    if (photosUploading) {
      setError(() => t("Espera a que terminen de subirse las fotos."))
      return
    }

    if (newPhotoUrls.length === 0) {
      return
    }

    // No hay endpoint de fotos: se reescribe el servicio con la lista ampliada.
    await runAction(async () => {
      const updated = await servicesApi.update(current.id, {
        ...toUpdateBody(current),
        photosUrls: [...current.photosUrls, ...newPhotoUrls],
      })
      setNewPhotoUrls([])
      return updated
    }, () => t("Fotos añadidas."))
  }

  return (
    <section>
      <Link to="/app/mis-servicios" className={styles.back}>
        {t("← Volver a mis servicios")}</Link>

      <PageHeader
        breadcrumb={[
          { label: t("Mis servicios"), to: '/app/mis-servicios' },
          { label: current.name },
        ]}
        title={current.name}
        description={`${serviceTypeLabel(current.type)} · ${formatCurrency(current.price)}`}
        actions={
          <StatusBadge tone={CONTENT_STATUS_TONES[current.status]}>
            {CONTENT_STATUS_LABELS[current.status]}
          </StatusBadge>
        }
      />

      {error !== null && (
        <p className={`${styles.feedback} ${styles.error}`} role="alert">
          {error}
        </p>
      )}
      {feedback !== null && (
        <p className={`${styles.feedback} ${styles.success}`}>{feedback}</p>
      )}

      <div className={styles.layout}>
        <div className={styles.column}>
          <article className={styles.card}>
            <h2 className={styles.cardTitle}>{t("Información del servicio")}</h2>
            <DefList items={infoItems} />

            {current.description !== '' && (
              <p className={styles.meta} style={{ marginTop: '1rem' }}>
                {current.description}
              </p>
            )}

            <h2 className={styles.cardTitle} style={{ marginTop: '1.5rem' }}>
              {t("Fotos")}</h2>
            {current.photosUrls.length === 0 ? (
              <p className={styles.meta}>{t("Todavía no hay fotos.")}</p>
            ) : (
              <SitePhotoGallery
                key={current.id}
                name={current.name}
                photos={current.photosUrls}
              />
            )}
          </article>
        </div>

        <div className={styles.column}>
          <article className={styles.card}>
            <h2 className={styles.cardTitle}>{t("Precio")}</h2>
            <Field
              label={t("Precio por persona (COP)")}
              type="number"
              min={0}
              value={price}
              onChange={(changeEvent) => setPrice(changeEvent.target.value)}
            />
            <div className={styles.actions}>
              <Button
                variant="accent"
                disabled={isWorking || price.trim() === ''}
                onClick={() =>
                  void runAction(
                    () =>
                      servicesApi.update(current.id, {
                        ...toUpdateBody(current),
                        price: Number(price),
                      }),
                    () => t("Precio actualizado."),
                  )
                }
              >
                {t("Cambiar precio")}</Button>
            </div>
          </article>

          <article className={styles.card}>
            <h2 className={styles.cardTitle}>{t("Visibilidad en el catálogo")}</h2>
            <div className={styles.actions}>
              <Button
                variant="primary"
                disabled={isWorking || current.status === 'PUBLISHED'}
                onClick={() =>
                  void runAction(
                    () => servicesApi.changeStatus(current.id, 'PUBLISHED'),
                    () => t("Servicio publicado."),
                  )
                }
              >
                {t("Publicar")}</Button>
              <Button
                variant="outline"
                disabled={isWorking || current.status === 'INACTIVE'}
                onClick={() =>
                  void runAction(
                    () => servicesApi.changeStatus(current.id, 'INACTIVE'),
                    () => t("Servicio retirado del catálogo."),
                  )
                }
              >
                {t("Despublicar")}</Button>
            </div>
          </article>

          <article className={styles.card}>
            <h2 className={styles.cardTitle}>{t("Añadir fotos")}</h2>
            <ImageUploader
              label={t("Nuevas fotos")}
              folder="sm-xplore/services"
              value={newPhotoUrls}
              onChange={setNewPhotoUrls}
              onUploadingChange={setPhotosUploading}
              hint={t("Se suben a Cloudinary y se añaden al servicio al guardar.")}
            />
            <div className={styles.actions}>
              <Button
                variant="outline"
                disabled={
                  isWorking ||
                  photosUploading ||
                  newPhotoUrls.length === 0
                }
                onClick={() => void addPhotos()}
              >
                {isWorking ? t("Guardando…") : t("Guardar fotos")}
              </Button>
            </div>
          </article>
        </div>
      </div>
    </section>
  )
}
