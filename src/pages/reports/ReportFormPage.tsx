import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { BackButton } from '@/components/BackButton'
import { useMessageState } from '@/hooks/useMessageState'
import { translate as t } from '@/i18n/language'
import { useLanguage } from '@/hooks/useLanguage'
import { useReportsPath } from '@/hooks/useReportsPath'
import { Button } from '@/components/Button'
import { Field } from '@/components/FormField'
import { ImageUploader } from '@/components/ImageUploader'
import { LocationPicker } from '@/components/LocationPicker'
import type { MapPoint } from '@/components/MapPreview/mercator'
import { PageHeader } from '@/components/PageHeader/PageHeader'
import { StateMessage } from '@/components/StateMessage'
import { useFormValidation } from '@/hooks/useFormValidation'
import { securityReportsApi } from '@/services/securityReportsApi'
import { describeApiError } from '@/utils/errors'
import styles from './reports.module.css'

/** El contrato acepta como máximo 10 fotos por reporte (`@Size(max = 10)`). */
const MAX_PHOTOS = 10

/** Alta de reporte con ubicación opcional elegida explícitamente en el mapa. */
export default function ReportFormPage() {
  useLanguage()
  const reportsPath = useReportsPath()
  const navigate = useNavigate()
  const [location, setLocation] = useState<MapPoint | null>(null)

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [photoUrls, setPhotoUrls] = useState<string[]>([])
  const [isUploadingPhotos, setIsUploadingPhotos] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useMessageState<string | null>(null)
  /** Fuerza el foco aunque el mismo mensaje se repita. */
  const [errorNonce, setErrorNonce] = useState(0)
  const errorRef = useRef<HTMLDivElement | null>(null)
  const formRef = useRef<HTMLFormElement>(null)

  // `SecurityReportRequest`: título obligatorio (máx. 200), descripción opcional.
  const form = useFormValidation({
    values: { title },
    validate: (values) =>
      values.title.trim() === '' ? { title: t("Escribe un título.") } : {},
    labels: { get title() { return t("Título") } },
    order: ['title'] as const,
    formRef,
  })

  // Un fallo de envío o de validación puede quedar fuera de pantalla: se lleva
  // el scroll y el foco al mensaje para que se anuncie y se vea.
  const hasError = error !== null
  useEffect(() => {
    if (!hasError) return

    const node = errorRef.current
    if (node === null) return

    node.scrollIntoView?.({ block: 'start', behavior: 'smooth' })
    node.focus()
  }, [hasError, errorNonce])

  function failWith(message: () => string) {
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

      navigate(reportsPath)
    } catch (cause) {
      if (!form.applyValidationErrors(cause)) {
        failWith(() => describeApiError(cause))
      }
    } finally {
      setIsSaving(false)
    }
  }


  return (
    <div className={styles.page}>
      <BackButton to={reportsPath} />

      <PageHeader
        title={t("Nuevo reporte de seguridad")}
        description={t("Cuéntanos qué pasó y dónde. Las gestoras de destino recibirán el aviso.")}
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
              label={t("Título")}
              name="title"
              placeholder={t("Ej: Intento de robo en el muelle")}
              maxLength={200}
              required
              value={title}
              error={form.errorOf('title')}
              onChange={(changeEvent) => setTitle(changeEvent.target.value)}
              onBlur={() => form.markTouched('title')}
            />
          </div>

          <label className={styles.full}>
            <span className={styles.fieldLabel}>{t("¿Qué pasó?")}</span>
            <textarea
              className={styles.textarea}
              placeholder={t("Ej: Dos personas en moto se acercaron a los turistas.")}
              maxLength={2000}
              value={description}
              onChange={(changeEvent) => setDescription(changeEvent.target.value)}
            />
          </label>

          <section className={styles.full} aria-label={t("Ubicación del reporte")}>
            <LocationPicker label={t("Ubicación (opcional)")}
              value={location} onChange={setLocation} disabled={isSaving} />
            <p className={styles.helper}>
              {t("Selecciona en el mapa dónde ocurrió el incidente. Puedes enviar el reporte sin ubicación.")}
            </p>
          </section>

          <div className={styles.full}>
            <ImageUploader
              label={t("Fotos del reporte")}
              folder="sm-xplore/reports"
              value={photoUrls}
              onChange={setPhotoUrls}
              onUploadingChange={setIsUploadingPhotos}
              maxFiles={MAX_PHOTOS}
              hint={t("Opcional. JPG, PNG o WebP; máximo {0} fotos. Si una carga falla, lo que ya escribiste se conserva.", [MAX_PHOTOS])}
            />
          </div>
        </div>

        <div className={styles.actions}>
          <Button
            variant="accent"
            size="lg"
            type="submit"
            loading={isSaving}
            disabled={isUploadingPhotos}
          >
            {t("Enviar reporte")}</Button>
          <Link to={reportsPath}>
            <Button variant="outline" size="lg">
              {t("Cancelar")}</Button>
          </Link>
        </div>

        {isUploadingPhotos && (
          <p className={styles.helper} role="status">
            {t("El envío se habilita cuando terminen de subir las fotos.")}</p>
        )}
      </form>
    </div>
  )
}
