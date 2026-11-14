import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '@/components/Button'
import { Field } from '@/components/FormField'
import { ImageUploader } from '@/components/ImageUploader'
import { PageHeader } from '@/components/PageHeader/PageHeader'
import { StateMessage } from '@/components/StateMessage'
import { useFormValidation } from '@/hooks/useFormValidation'
import { securityReportsApi } from '@/services/securityReportsApi'
import { describeApiError } from '@/utils/errors'
import { useCurrentLocation } from './useCurrentLocation'
import type { LocationStatus } from './useCurrentLocation'
import styles from './reports.module.css'

/** El contrato acepta como máximo 10 fotos por reporte (`@Size(max = 10)`). */
const MAX_PHOTOS = 10

/** Fallos de lectura cuando ya había una ubicación válida: se conserva. */
const KEPT_LOCATION_MESSAGES: Record<'denied' | 'error' | 'unsupported', string> = {
  denied:
    'No diste permiso de ubicación. Mantendremos la ubicación anterior.',
  error:
    'No pudimos actualizar la ubicación. Mantendremos la ubicación anterior.',
  unsupported:
    'Este navegador no expone la ubicación. Mantendremos la ubicación anterior.',
}

/** Lo que se lee mientras no hay coordenadas. `idle` y `ready` tienen su propio texto. */
const LOCATION_MESSAGES: Record<
  Exclude<LocationStatus, 'idle' | 'ready'>,
  { text: string; tone: 'info' | 'error' }
> = {
  locating: { text: 'Consultando ubicación…', tone: 'info' },
  denied: {
    text: 'No diste permiso de ubicación. Puedes enviar el reporte sin ella.',
    tone: 'error',
  },
  unsupported: {
    text: 'Este navegador no expone la ubicación. Puedes enviar el reporte sin ella.',
    tone: 'error',
  },
  error: {
    text: 'No pudimos obtener la ubicación. Puedes enviar el reporte sin ella o volver a intentarlo.',
    tone: 'error',
  },
}

/**
 * Alta de un reporte de seguridad.
 *
 * La ubicación sale del navegador, nunca de campos escritos a mano: el contrato
 * (`SecurityReportRequest`) no la exige, así que un fallo de geolocalización no
 * bloquea el envío. Las fotos las sube `ImageUploader` a Cloudinary y solo sus
 * URLs viajan en `photosUrls`.
 */
export default function ReportFormPage() {
  const navigate = useNavigate()
  const {
    status: locationStatus,
    location,
    request: requestLocation,
    clear: clearLocation,
  } = useCurrentLocation()

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [photoUrls, setPhotoUrls] = useState<string[]>([])
  const [isUploadingPhotos, setIsUploadingPhotos] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  /** Fuerza el foco aunque el mismo mensaje se repita. */
  const [errorNonce, setErrorNonce] = useState(0)
  const errorRef = useRef<HTMLDivElement | null>(null)
  const formRef = useRef<HTMLFormElement>(null)

  // `SecurityReportRequest`: título obligatorio (máx. 200), descripción opcional.
  const form = useFormValidation({
    values: { title },
    validate: (values) =>
      values.title.trim() === '' ? { title: 'Escribe un título.' } : {},
    labels: { title: 'Título' },
    order: ['title'] as const,
    formRef,
  })

  // Un fallo de envío o de validación puede quedar fuera de pantalla: se lleva
  // el scroll y el foco al mensaje para que se anuncie y se vea.
  useEffect(() => {
    if (error === null) return

    const node = errorRef.current
    if (node === null) return

    node.scrollIntoView?.({ block: 'start', behavior: 'smooth' })
    node.focus()
  }, [error, errorNonce])

  function failWith(message: string) {
    setError(message)
    setErrorNonce((nonce) => nonce + 1)
  }

  async function handleSubmit(formEvent: FormEvent<HTMLFormElement>) {
    formEvent.preventDefault()

    if (form.blocked()) {
      return
    }

    setIsSaving(true)
    setError(null)

    try {
      // El autor lo toma el backend del token de sesión. Los campos opcionales
      // se omiten (no se envían como `null`) para respetar el DTO.
      await securityReportsApi.create({
        title: title.trim(),
        description: description.trim(),
        ...(location === null ? {} : { location }),
        ...(photoUrls.length === 0 ? {} : { photosUrls: photoUrls }),
      })

      navigate('/reportes')
    } catch (cause) {
      if (!form.applyValidationErrors(cause)) {
        failWith(describeApiError(cause))
      }
    } finally {
      setIsSaving(false)
    }
  }

  const isLocating = locationStatus === 'locating'
  const hasLocation = location !== null
  const statusMessage =
    locationStatus === 'idle' || locationStatus === 'ready'
      ? null
      : locationStatus === 'locating'
        ? LOCATION_MESSAGES.locating
        : hasLocation
          ? {
              text: KEPT_LOCATION_MESSAGES[locationStatus],
              tone: 'error' as const,
            }
          : LOCATION_MESSAGES[locationStatus]

  return (
    <div className={styles.page}>
      <Link to="/reportes" className={styles.back}>
        ← Volver a mis reportes
      </Link>

      <PageHeader
        title="Nuevo reporte de seguridad"
        description="Cuéntanos qué pasó y dónde. Las gestoras de destino recibirán el aviso."
      />

      {error !== null && (
        <div ref={errorRef} className={styles.errorAnchor} tabIndex={-1}>
          <StateMessage title={error} tone="error" />
        </div>
      )}

      <form className={styles.card} onSubmit={handleSubmit} noValidate ref={formRef}>
        <div className={styles.grid}>
          <div className={styles.full}>
            <Field
              label="Título"
              name="title"
              placeholder="Ej: Intento de robo en el muelle"
              maxLength={200}
              required
              value={title}
              error={form.errorOf('title')}
              onChange={(changeEvent) => setTitle(changeEvent.target.value)}
              onBlur={() => form.markTouched('title')}
            />
          </div>

          <label className={styles.full}>
            <span className={styles.fieldLabel}>¿Qué pasó?</span>
            <textarea
              className={styles.textarea}
              placeholder="Ej: Dos personas en moto se acercaron a los turistas."
              maxLength={2000}
              value={description}
              onChange={(changeEvent) => setDescription(changeEvent.target.value)}
            />
          </label>

          <section className={styles.full} aria-labelledby="report-location-label">
            <div className={styles.locationBox}>
              <span className={styles.fieldLabel} id="report-location-label">
                Ubicación (opcional)
              </span>
              <p className={styles.helper}>
                Se toma del navegador, no se escribe a mano. Puedes enviar el
                reporte sin ubicación.
              </p>

              {location !== null && (
                <p className={styles.locationCoords}>
                  {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
                </p>
              )}

              <div className={styles.locationActions}>
                {!hasLocation && (
                  <Button
                    variant="outline"
                    disabled={isLocating}
                    aria-busy={isLocating}
                    onClick={requestLocation}
                  >
                    {isLocating
                      ? 'Consultando…'
                      : locationStatus === 'denied' || locationStatus === 'error'
                        ? 'Reintentar'
                        : 'Usar mi ubicación actual'}
                  </Button>
                )}

                {location !== null && (
                  <>
                    <Button variant="outline" onClick={requestLocation}>
                      Volver a consultar
                    </Button>
                    <Button variant="outline" onClick={clearLocation}>
                      Quitar ubicación
                    </Button>
                  </>
                )}
              </div>

              {statusMessage !== null && (
                <p
                  className={
                    statusMessage.tone === 'error'
                      ? `${styles.locationStatus} ${styles.locationStatusError}`
                      : styles.locationStatus
                  }
                  role="status"
                  aria-live="polite"
                >
                  {statusMessage.text}
                </p>
              )}

              {hasLocation && locationStatus === 'ready' && (
                <p className={styles.locationStatus} role="status">
                  Ubicación lista: se adjuntará al enviar el reporte.
                </p>
              )}
            </div>
          </section>

          <div className={styles.full}>
            <ImageUploader
              label="Fotos del reporte"
              folder="sm-xplore/reports"
              value={photoUrls}
              onChange={setPhotoUrls}
              onUploadingChange={setIsUploadingPhotos}
              maxFiles={MAX_PHOTOS}
              hint={`Opcional. JPG, PNG o WebP; máximo ${MAX_PHOTOS} fotos. Si una carga falla, lo que ya escribiste se conserva.`}
            />
          </div>
        </div>

        <div className={styles.actions}>
          <Button
            variant="accent"
            size="lg"
            type="submit"
            loading={isSaving}
            disabled={isUploadingPhotos || isLocating}
          >
            Enviar reporte
          </Button>
          <Link to="/reportes">
            <Button variant="outline" size="lg">
              Cancelar
            </Button>
          </Link>
        </div>

        {(isUploadingPhotos || isLocating) && (
          <p className={styles.helper} role="status">
            El envío se habilita cuando terminen las fotos y la ubicación.
          </p>
        )}
      </form>
    </div>
  )
}
