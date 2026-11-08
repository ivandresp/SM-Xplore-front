import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Button } from '@/components/Button'
import { DefList } from '@/components/DefList/DefList'
import type { DefItem } from '@/components/DefList/DefList'
import { Field } from '@/components/FormField'
import { PageHeader } from '@/components/PageHeader/PageHeader'
import { Skeleton } from '@/components/Skeleton'
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
  const { serviceId } = useParams<{ serviceId: string }>()

  const [service, setService] = useState<ServiceResponse | null>(null)
  const [price, setPrice] = useState('')
  const [photos, setPhotos] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isWorking, setIsWorking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)
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
        if (!cancelled) setError(describeApiError(cause))
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    void run()

    return () => {
      cancelled = true
    }
  }, [serviceId, reloadToken])

  function retry() {
    setIsLoading(true)
    setError(null)
    setReloadToken((token) => token + 1)
  }

  if (isLoading) {
    return <Skeleton variant="text" count={4} label="Cargando servicio…" />
  }

  if (service === null) {
    return (
      <section>
        <Link to="/app/mis-servicios" className={styles.back}>
          ← Volver a mis servicios
        </Link>
        <StateMessage
          title="No se pudo cargar el servicio"
          description={error ?? 'No se encontró el servicio.'}
          tone="error"
          action={<Button onClick={retry}>Reintentar</Button>}
        />
      </section>
    )
  }

  const current = service

  const infoItems: DefItem[] = [
    { label: 'Tipo', value: serviceTypeLabel(current.type) },
    { label: 'Categoría', value: current.categoryName || '—' },
    { label: 'Atractivo', value: current.siteName || '—' },
    { label: 'Zona', value: current.zoneName || '—' },
    { label: 'Precio', value: formatCurrency(current.price) },
    {
      label: 'Capacidad',
      value: `${current.maxCapacity} personas`,
    },
    {
      label: 'Ubicación',
      value: `${current.latitude}, ${current.longitude}`,
    },
    { label: 'Creado', value: formatDateTime(current.createdAt) },
  ]

  async function runAction(
    action: () => Promise<ServiceResponse>,
    message: string,
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
      setError(describeApiError(cause))
    } finally {
      setIsWorking(false)
    }
  }

  async function addPhotos() {
    const photosUrls = photos
      .split('\n')
      .map((url) => url.trim())
      .filter((url) => url !== '')

    if (photosUrls.length === 0) {
      return
    }

    // No hay endpoint de fotos: se reescribe el servicio con la lista ampliada.
    await runAction(async () => {
      const updated = await servicesApi.update(current.id, {
        ...toUpdateBody(current),
        photosUrls: [...current.photosUrls, ...photosUrls],
      })
      setPhotos('')
      return updated
    }, 'Fotos añadidas.')
  }

  return (
    <section>
      <Link to="/app/mis-servicios" className={styles.back}>
        ← Volver a mis servicios
      </Link>

      <PageHeader
        breadcrumb={[
          { label: 'Mis servicios', to: '/app/mis-servicios' },
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
            <h2 className={styles.cardTitle}>Información del servicio</h2>
            <DefList items={infoItems} />

            {current.description !== '' && (
              <p className={styles.meta} style={{ marginTop: '1rem' }}>
                {current.description}
              </p>
            )}

            <h2 className={styles.cardTitle} style={{ marginTop: '1.5rem' }}>
              Fotos
            </h2>
            {current.photosUrls.length === 0 ? (
              <p className={styles.meta}>Todavía no hay fotos.</p>
            ) : (
              <ul className={styles.photoList}>
                {current.photosUrls.map((url) => (
                  <li key={url} className={styles.photo}>
                    {url}
                  </li>
                ))}
              </ul>
            )}

            <p className={styles.notice}>
              No existe un endpoint para editar solo un campo: el precio y las
              fotos se guardan reescribiendo el servicio completo.
            </p>
          </article>
        </div>

        <div className={styles.column}>
          <article className={styles.card}>
            <h2 className={styles.cardTitle}>Precio</h2>
            <Field
              label="Precio por persona (COP)"
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
                    'Precio actualizado.',
                  )
                }
              >
                Cambiar precio
              </Button>
            </div>
          </article>

          <article className={styles.card}>
            <h2 className={styles.cardTitle}>Visibilidad en el catálogo</h2>
            <div className={styles.actions}>
              <Button
                variant="primary"
                disabled={isWorking || current.status === 'PUBLISHED'}
                onClick={() =>
                  void runAction(
                    () => servicesApi.changeStatus(current.id, 'PUBLISHED'),
                    'Servicio publicado.',
                  )
                }
              >
                Publicar
              </Button>
              <Button
                variant="outline"
                disabled={isWorking || current.status === 'INACTIVE'}
                onClick={() =>
                  void runAction(
                    () => servicesApi.changeStatus(current.id, 'INACTIVE'),
                    'Servicio retirado del catálogo.',
                  )
                }
              >
                Despublicar
              </Button>
            </div>
          </article>

          <article className={styles.card}>
            <h2 className={styles.cardTitle}>Añadir fotos</h2>
            <textarea
              className={styles.textarea}
              placeholder={'https://…/foto-1.jpg\nhttps://…/foto-2.jpg'}
              value={photos}
              onChange={(changeEvent) => setPhotos(changeEvent.target.value)}
            />
            <p className={styles.helper}>Una URL por línea.</p>
            <div className={styles.actions}>
              <Button
                variant="outline"
                disabled={isWorking || photos.trim() === ''}
                onClick={() => void addPhotos()}
              >
                Añadir fotos
              </Button>
            </div>
          </article>
        </div>
      </div>
    </section>
  )
}
