import { useEffect, useId, useRef, useState } from 'react'
import type { ChangeEvent, CSSProperties } from 'react'
import { useMessageState } from '@/hooks/useMessageState'
import { translate as t } from '@/i18n/language'
import { useLanguage } from '@/hooks/useLanguage'
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
  useLanguage()
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
  const [errors, setErrors] = useMessageState<string[]>([])

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
      setErrors(() => [
        available <= 0
          ? t("Alcanzaste el máximo de {0} fotos.", [maxFiles])
          : t("Puedes añadir {0} {1}.", [available, available === 1 ? t('foto más') : t('fotos más')]),
      ])
      return
    }

    const messages: Array<() => string> = []
    const validFiles: File[] = []

    for (const file of selected) {
      const validationError = validateImageFile(file)
      if (validationError !== null) {
        messages.push(() => validateImageFile(file) ?? '')
      } else {
        validFiles.push(file)
      }
    }

    setErrors(() => messages.map((resolve) => resolve()))

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
          messages.push(() => describeImageUploadError(cause))
        }
      }
    } finally {
      if (mountedRef.current) {
        setErrors(() => messages.map((resolve) => resolve()))
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
            multiple={maxFiles > 1}
            disabled={!canAdd}
            aria-label={t("Subir {0}", [label.toLowerCase()])}
            aria-describedby={
              errors.length > 0 ? `${hintId} ${errorId}` : hintId
            }
            onChange={handleInputChange}
          />
          <span className={styles.dropzoneTitle}>
            {isUploading
              ? t("Subiendo imágenes…")
              : t(maxFiles === 1 ? "Haz clic para elegir una imagen" : "Haz clic para elegir imágenes")}
          </span>
          <span className={styles.dropzoneHint}>
            {value.length >= maxFiles
              ? t("Alcanzaste el máximo de {0} fotos.", [maxFiles])
              : t("JPG, PNG o WebP · máx. {0} MB", [maxMegabytes])}
          </span>
        </label>
      ) : (
        <p className={styles.notice} role="status">
          {t("La carga de imágenes no está disponible: falta configurar Cloudinary (`VITE_CLOUDINARY_CLOUD_NAME` y `VITE_CLOUDINARY_UPLOAD_PRESET`).")}</p>
      )}

      <p className={styles.helper} id={hintId}>
        {hint ??
          t("Se suben a Cloudinary. Máximo {0} MB por imagen.", [maxMegabytes])}
      </p>

      {progress !== null && (
        <p className={styles.status} role="status">
          {t("Subiendo")}{" "}{progress.done + 1} {" "}{t("de")}{" "}{progress.total}…
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
        <ul className={styles.previews} aria-label={t("Imágenes cargadas")}>
          {value.map((url, index) => (
            <li key={`${url}-${index}`} className={styles.preview}>
              <img
                className={styles.image}
                src={url}
                alt={t("Foto {0} de {1}", [index + 1, value.length])}
                loading="lazy"
              />
              <button
                className={styles.remove}
                type="button"
                aria-label={t("Quitar foto {0}", [index + 1])}
                title={t("Quitar foto")}
                disabled={disabled || isUploading}
                onClick={() => removePhoto(url)}
              >
                <span className={styles.removeIcon} aria-hidden="true">×</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
