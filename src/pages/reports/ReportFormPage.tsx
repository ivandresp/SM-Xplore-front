import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '@/components/Button'
import { Field } from '@/components/FormField'
import { ImageUploader } from '@/components/ImageUploader'
import { PageHeader } from '@/components/PageHeader/PageHeader'
import { StateMessage } from '@/components/StateMessage'
import { securityReportsApi } from '@/services/securityReportsApi'
import { describeApiError } from '@/utils/errors'
import { useCurrentLocation } from './useCurrentLocation'
import type { LocationStatus } from './useCurrentLocation'
import styles from './reports.module.css'

/** El contrato acepta como máximo 10 fotos por reporte (`@Size(max = 10)`). */
const MAX_PHOTOS = 10

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

  async function handleSubmit(formEvent: FormEvent<HTMLFormElement>) {
    formEvent.preventDefault()

    if (title.trim() === '') {
      setError('El título es obligatorio.')
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
      setError(describeApiError(cause))
    } finally {
      setIsSaving(false)
    }
  }

  const canRetryLocation =
    locationStatus === 'denied' || locationStatus === 'error'
  const isLocating = locationStatus === 'locating'
  const statusMessage =
    locationStatus === 'idle' || locationStatus === 'ready'
      ? null
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

      {error !== null && <StateMessage title={error} tone="error" />}

      <form className={styles.card} onSubmit={handleSubmit} noValidate>
        <div className={styles.grid}>
          <div className={styles.full}>
            <Field
              label="Título"
              placeholder="Ej: Intento de robo en el muelle"
              maxLength={200}
              required
              value={title}
              onChange={(changeEvent) => setTitle(changeEvent.target.value)}
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
                {location === null && (
                  <Button
                    variant="outline"
                    disabled={isLocating}
                    aria-busy={isLocating}
                    onClick={requestLocation}
                  >
                    {isLocating
                      ? 'Consultando…'
                      : canRetryLocation
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

              {location !== null && (
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
            disabled={isSaving || isUploadingPhotos}
          >
            {isSaving ? 'Enviando…' : 'Enviar reporte'}
          </Button>
          <Link to="/reportes">
            <Button variant="outline" size="lg">
              Cancelar
            </Button>
          </Link>
        </div>
      </form>
    </div>
  )
}
