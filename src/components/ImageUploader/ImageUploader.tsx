import { useEffect, useId, useRef, useState } from 'react'
import type { ChangeEvent, CSSProperties } from 'react'
import {
  CLOUDINARY_ACCEPTED_TYPES,
  CLOUDINARY_MAX_IMAGE_BYTES,
  describeImageUploadError,
  isCloudinaryConfigured,
  uploadImage,
  validateImageFile,
} from '@/services/cloudinaryApi'
import { classNames } from '@/utils/format'
import styles from './ImageUploader.module.css'

export interface ImageUploaderProps {
  label: string
  /** URLs ya guardadas o pendientes de guardar. */
  value: string[]
  onChange: (urls: string[]) => void
  /** Permite al formulario deshabilitar su botón mientras se sube una imagen. */
  onUploadingChange?: (uploading: boolean) => void
  /** Carpeta de Cloudinary donde se guardan los archivos. */
  folder?: string
  /** Número máximo de fotos del recurso. */
  maxFiles?: number
  disabled?: boolean
  hint?: string
  className?: string
  style?: CSSProperties
}

const DEFAULT_MAX_FILES = 10

/**
 * Selector de imágenes con carga directa a Cloudinary.
 *
 * Las URLs que devuelve Cloudinary se mantienen en `value`; el formulario
 * las envía después al backend en `photosUrls` / `photoUrls`.
 */
export function ImageUploader({
  label,
  value,
  onChange,
  onUploadingChange,
  folder,
  maxFiles = DEFAULT_MAX_FILES,
  disabled = false,
  hint,
  className,
  style,
}: ImageUploaderProps) {
  const inputId = useId()
  const hintId = useId()
  const errorId = useId()
  const abortRef = useRef<AbortController | null>(null)
  const mountedRef = useRef(true)
  const urlsRef = useRef(value)

  const [isUploading, setIsUploading] = useState(false)
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(
    null,
  )
  const [errors, setErrors] = useState<string[]>([])

  const configured = isCloudinaryConfigured()
  const maxMegabytes = Math.round(CLOUDINARY_MAX_IMAGE_BYTES / (1024 * 1024))
  const canAdd =
    configured && !disabled && !isUploading && value.length < maxFiles

  useEffect(() => {
    urlsRef.current = value
  }, [value])

  useEffect(() => {
    mountedRef.current = true

    return () => {
      mountedRef.current = false
      abortRef.current?.abort()
    }
  }, [])

  function notifyUploading(uploading: boolean) {
    setIsUploading(uploading)
    onUploadingChange?.(uploading)
  }

  function replaceUrls(urls: string[]) {
    urlsRef.current = urls
    onChange(urls)
  }

  async function uploadFiles(selected: File[]) {
    const current = urlsRef.current
    const available = maxFiles - current.length

    if (selected.length > available) {
      setErrors([
        available <= 0
          ? `Alcanzaste el máximo de ${maxFiles} fotos.`
          : `Puedes añadir ${available} ${available === 1 ? 'foto más' : 'fotos más'}.`,
      ])
      return
    }

    const messages: string[] = []
    const validFiles: File[] = []

    for (const file of selected) {
      const validationError = validateImageFile(file)
      if (validationError !== null) {
        messages.push(validationError)
      } else {
        validFiles.push(file)
      }
    }

    setErrors(messages)

    if (validFiles.length === 0) {
      return
    }

    const controller = new AbortController()
    abortRef.current = controller
    notifyUploading(true)

    try {
      for (const [index, file] of validFiles.entries()) {
        if (controller.signal.aborted) {
          break
        }

        setProgress({ done: index, total: validFiles.length })

        try {
          const uploaded = await uploadImage(file, {
            folder,
            signal: controller.signal,
          })

          if (controller.signal.aborted) {
            break
          }

          replaceUrls([...urlsRef.current, uploaded.url])
        } catch (cause) {
          if (controller.signal.aborted) {
            break
          }
          messages.push(describeImageUploadError(cause))
        }
      }
    } finally {
      if (mountedRef.current) {
        setErrors(messages)
        setProgress(null)
        notifyUploading(false)
      }
      abortRef.current = null
    }
  }

  function handleInputChange(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? [])
    // Permite volver a elegir el mismo archivo después de quitarlo.
    event.target.value = ''

    if (files.length === 0 || !canAdd) {
      return
    }

    void uploadFiles(files)
  }

  function removePhoto(url: string) {
    replaceUrls(urlsRef.current.filter((item) => item !== url))
  }

  return (
    <div className={classNames(styles.uploader, className)} style={style}>
      <div className={styles.heading}>
        <span className={styles.label}>{label}</span>
        <span className={styles.counter}>
          {value.length}/{maxFiles}
        </span>
      </div>

      {configured ? (
        <label
          className={classNames(
            styles.dropzone,
            !canAdd && styles.dropzoneDisabled,
          )}
          htmlFor={inputId}
        >
          <input
            id={inputId}
            className={styles.input}
            type="file"
            accept={CLOUDINARY_ACCEPTED_TYPES.join(',')}
            multiple
            disabled={!canAdd}
            aria-label={`Subir ${label.toLowerCase()}`}
            aria-describedby={
              errors.length > 0 ? `${hintId} ${errorId}` : hintId
            }
            onChange={handleInputChange}
          />
          <span className={styles.dropzoneTitle}>
            {isUploading
              ? 'Subiendo imágenes…'
              : 'Haz clic para elegir imágenes'}
          </span>
          <span className={styles.dropzoneHint}>
            {value.length >= maxFiles
              ? `Alcanzaste el máximo de ${maxFiles} fotos.`
              : `JPG, PNG o WebP · máx. ${maxMegabytes} MB`}
          </span>
        </label>
      ) : (
        <p className={styles.notice} role="status">
          La carga de imágenes no está disponible: falta configurar Cloudinary
          (`VITE_CLOUDINARY_CLOUD_NAME` y `VITE_CLOUDINARY_UPLOAD_PRESET`).
        </p>
      )}

      <p className={styles.helper} id={hintId}>
        {hint ??
          `Se suben a Cloudinary. Máximo ${maxMegabytes} MB por imagen.`}
      </p>

      {progress !== null && (
        <p className={styles.status} role="status">
          Subiendo {progress.done + 1} de {progress.total}…
        </p>
      )}

      {errors.length > 0 && (
        <ul className={styles.errors} id={errorId} role="alert">
          {errors.map((message, index) => (
            <li key={`${message}-${index}`}>{message}</li>
          ))}
        </ul>
      )}

      {value.length > 0 && (
        <ul className={styles.previews} aria-label="Imágenes cargadas">
          {value.map((url, index) => (
            <li key={`${url}-${index}`} className={styles.preview}>
              <img
                className={styles.image}
                src={url}
                alt={`Foto ${index + 1} de ${value.length}`}
                loading="lazy"
              />
              <button
                className={styles.remove}
                type="button"
                aria-label={`Quitar foto ${index + 1}`}
                title="Quitar foto"
                disabled={disabled || isUploading}
                onClick={() => removePhoto(url)}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
