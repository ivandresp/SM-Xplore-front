import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '@/components/Button'
import { Field } from '@/components/FormField'
import { PageHeader } from '@/components/PageHeader/PageHeader'
import { StateMessage } from '@/components/StateMessage'
import { securityReportsApi } from '@/services/securityReportsApi'
import { describeApiError } from '@/utils/errors'
import styles from './reports.module.css'

export default function ReportFormPage() {
  const navigate = useNavigate()

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [latitude, setLatitude] = useState('')
  const [longitude, setLongitude] = useState('')
  const [photos, setPhotos] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [locationNote, setLocationNote] = useState<string | null>(null)

  function useMyLocation() {
    if (!('geolocation' in navigator)) {
      setLocationNote('Este navegador no expone la ubicación.')
      return
    }

    setLocationNote('Consultando ubicación…')

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLatitude(String(position.coords.latitude.toFixed(6)))
        setLongitude(String(position.coords.longitude.toFixed(6)))
        setLocationNote('Ubicación tomada del navegador.')
      },
      () => setLocationNote('No se pudo obtener la ubicación.'),
    )
  }

  async function handleSubmit(formEvent: FormEvent<HTMLFormElement>) {
    formEvent.preventDefault()

    if (title.trim() === '') {
      setError('El título es obligatorio.')
      return
    }

    setIsSaving(true)
    setError(null)

    try {
      const photosUrls = photos
        .split('\n')
        .map((url) => url.trim())
        .filter((url) => url !== '')

      const hasLocation = latitude.trim() !== '' && longitude.trim() !== ''

      // El autor lo toma el backend del token de sesión.
      await securityReportsApi.create({
        title: title.trim(),
        description: description.trim(),
        location: hasLocation
          ? {
              latitude: Number(latitude),
              longitude: Number(longitude),
            }
          : undefined,
        photosUrls: photosUrls.length > 0 ? photosUrls : undefined,
      })

      navigate('/reportes')
    } catch (cause) {
      setError(describeApiError(cause))
    } finally {
      setIsSaving(false)
    }
  }

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

          <Field
            label="Latitud (opcional)"
            inputMode="decimal"
            placeholder="11.2404"
            value={latitude}
            onChange={(changeEvent) => setLatitude(changeEvent.target.value)}
          />
          <Field
            label="Longitud (opcional)"
            inputMode="decimal"
            placeholder="-74.1990"
            value={longitude}
            onChange={(changeEvent) => setLongitude(changeEvent.target.value)}
          />

          <div className={styles.full}>
            <Button variant="outline" onClick={useMyLocation}>
              Usar mi ubicación actual
            </Button>
            {locationNote !== null && (
              <p className={styles.helper}>{locationNote}</p>
            )}
          </div>

          <label className={styles.full}>
            <span className={styles.fieldLabel}>
              Fotos (una URL por línea, opcional)
            </span>
            <textarea
              className={styles.textarea}
              placeholder={'https://…/foto-1.jpg'}
              value={photos}
              onChange={(changeEvent) => setPhotos(changeEvent.target.value)}
            />
            <span className={styles.helper}>
              Pega la URL de la foto; los archivos no se suben.
            </span>
          </label>
        </div>

        <div className={styles.actions}>
          <Button variant="accent" size="lg" type="submit" disabled={isSaving}>
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
