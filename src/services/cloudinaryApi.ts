import { z } from 'zod'
import { translate as t } from '@/i18n/language'
import { parseResponse } from './validate'

/**
 * Carga de imágenes directa a Cloudinary desde el navegador.
 *
 * Se usa un **upload preset unsigned**: el cliente solo necesita el
 * `cloud_name` y el nombre del preset. La API key y el API secret de
 * Cloudinary nunca deben llegar al frontend. El preset debe restringir
 * formatos, tamaño y carpeta desde la consola de Cloudinary.
 */
export const CLOUDINARY_MAX_IMAGE_BYTES = 10 * 1024 * 1024

export const CLOUDINARY_ACCEPTED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
] as const

const UPLOAD_TIMEOUT_MS = 60_000

const uploadResponseSchema = z.object({
  secure_url: z.string().min(1),
  public_id: z.string().min(1),
  width: z.number(),
  height: z.number(),
})

const errorResponseSchema = z.object({
  error: z
    .object({
      message: z.string().optional(),
    })
    .optional(),
})

export interface CloudinaryImage {
  /** URL HTTPS que se guarda en el backend (`photosUrls`). */
  url: string
  /** Identificador del recurso en Cloudinary (útil para borrarlo en el futuro). */
  publicId: string
  width: number
  height: number
}

export interface UploadImageOptions {
  /** Carpeta destino dentro de Cloudinary (p. ej. `sm-xplore/services`). */
  folder?: string
  /** Permite cancelar la carga al desmontar el componente. */
  signal?: AbortSignal
}

export type ImageUploadErrorCode =
  | 'NOT_CONFIGURED'
  | 'INVALID_TYPE'
  | 'TOO_LARGE'
  | 'EMPTY_FILE'
  | 'NETWORK'
  | 'TIMEOUT'
  | 'ABORTED'
  | 'REJECTED'
  | 'INVALID_RESPONSE'

/** Error de carga con un mensaje ya listo para mostrar en la interfaz. */
export class ImageUploadError extends Error {
  readonly code: ImageUploadErrorCode
  readonly status: number | undefined
  /** Archivo original, sin traducir; permite regenerar el mensaje al cambiar de idioma. */
  readonly fileName: string | undefined
  /** Mensaje técnico de Cloudinary; no se muestra al usuario. */
  readonly detail: string | undefined

  constructor(
    code: ImageUploadErrorCode,
    message: string,
    status?: number,
    detail?: string,
    fileName?: string,
  ) {
    super(message)
    this.name = 'ImageUploadError'
    this.code = code
    this.status = status
    this.detail = detail
    this.fileName = fileName
  }
}

interface CloudinaryConfig {
  cloudName: string
  uploadPreset: string
}

function readConfig(): CloudinaryConfig | null {
  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME?.trim() ?? ''
  const uploadPreset =
    import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET?.trim() ?? ''

  if (cloudName === '' || uploadPreset === '') {
    return null
  }

  return { cloudName, uploadPreset }
}

/** Indica si el entorno trae las credenciales públicas de Cloudinary. */
export function isCloudinaryConfigured(): boolean {
  return readConfig() !== null
}

function maxMegabytes(): number {
  return Math.round(CLOUDINARY_MAX_IMAGE_BYTES / (1024 * 1024))
}

/**
 * Valida el archivo antes de gastar una carga.
 * Devuelve el mensaje de error, o `null` si es válido.
 */
export function validateImageFile(file: File): string | null {
  if (!CLOUDINARY_ACCEPTED_TYPES.includes(
    file.type as (typeof CLOUDINARY_ACCEPTED_TYPES)[number],
  )) {
    return t("«{0}» no es una imagen compatible. Usa JPG, PNG o WebP.", [file.name])
  }

  if (file.size === 0) {
    return t("«{0}» está vacía.", [file.name])
  }

  if (file.size > CLOUDINARY_MAX_IMAGE_BYTES) {
    return t("«{0}» supera el máximo de {1} MB.", [file.name, maxMegabytes()])
  }

  return null
}

function describeRejection(status: number): string {
  if (status === 400) {
    return t("Cloudinary rechazó la imagen. Revisa el formato o la configuración del preset de carga.")
  }
  if (status === 401 || status === 403) {
    return t("Cloudinary rechazó la carga. Revisa la configuración del preset.")
  }
  if (status === 413) {
    return t("La imagen supera el tamaño máximo permitido por Cloudinary.")
  }
  if (status === 420 || status === 429) {
    return t("Se alcanzó el límite de cargas de Cloudinary. Espera un momento e inténtalo de nuevo.")
  }
  if (status >= 500) {
    return t("Cloudinary no está disponible en este momento. Inténtalo de nuevo más tarde.")
  }

  return t("No se pudo subir la imagen a Cloudinary. Inténtalo de nuevo.")
}

/**
 * Sube una imagen con el preset unsigned y devuelve su URL segura.
 *
 * Cloudinary exige `multipart/form-data`, así que esta llamada externa no
 * pasa por `httpClient` (que serializa a JSON).
 */
export async function uploadImage(
  file: File,
  options: UploadImageOptions = {},
): Promise<CloudinaryImage> {
  const config = readConfig()

  if (config === null) {
    throw new ImageUploadError(
      'NOT_CONFIGURED',
      t("La carga de imágenes no está configurada. Define VITE_CLOUDINARY_CLOUD_NAME y VITE_CLOUDINARY_UPLOAD_PRESET."),
    )
  }

  const validationError = validateImageFile(file)
  if (validationError !== null) {
    const code: ImageUploadErrorCode =
      file.size === 0
        ? 'EMPTY_FILE'
        : file.size > CLOUDINARY_MAX_IMAGE_BYTES
          ? 'TOO_LARGE'
          : 'INVALID_TYPE'

    throw new ImageUploadError(code, validationError, undefined, undefined, file.name)
  }

  const formData = new FormData()
  formData.append('file', file)
  formData.append('upload_preset', config.uploadPreset)
  if (options.folder !== undefined && options.folder.trim() !== '') {
    formData.append('folder', options.folder.trim())
  }

  const controller = new AbortController()
  const callerSignal = options.signal
  let timedOut = false

  const forwardAbort = () => controller.abort()
  if (callerSignal !== undefined) {
    if (callerSignal.aborted) {
      controller.abort()
    } else {
      callerSignal.addEventListener('abort', forwardAbort, { once: true })
    }
  }

  const timer = setTimeout(() => {
    timedOut = true
    controller.abort()
  }, UPLOAD_TIMEOUT_MS)

  const endpoint = `https://api.cloudinary.com/v1_1/${encodeURIComponent(
    config.cloudName,
  )}/image/upload`

  try {
    let response: Response
    try {
      response = await fetch(endpoint, {
        method: 'POST',
        body: formData,
        signal: controller.signal,
      })
    } catch {
      if (timedOut) {
        throw new ImageUploadError(
          'TIMEOUT',
          t("La carga tardó demasiado. Comprueba tu conexión e inténtalo de nuevo."),
        )
      }
      if (callerSignal?.aborted === true) {
        throw new ImageUploadError('ABORTED', t("La carga se canceló."))
      }
      throw new ImageUploadError(
        'NETWORK',
        t("No pudimos conectar con Cloudinary. Revisa tu conexión e inténtalo de nuevo."),
      )
    }

    let payload: unknown
    try {
      payload = await response.json()
    } catch {
      payload = undefined
    }

    if (!response.ok) {
      const parsedError = errorResponseSchema.safeParse(payload)
      const detail = parsedError.success
        ? parsedError.data.error?.message
        : undefined

      throw new ImageUploadError(
        'REJECTED',
        describeRejection(response.status),
        response.status,
        detail,
      )
    }

    let parsed: z.infer<typeof uploadResponseSchema>
    try {
      parsed = parseResponse(uploadResponseSchema, payload, 'Cloudinary')
    } catch {
      throw new ImageUploadError(
        'INVALID_RESPONSE',
        t("Cloudinary devolvió una respuesta inesperada. Inténtalo de nuevo."),
      )
    }

    return {
      url: parsed.secure_url,
      publicId: parsed.public_id,
      width: parsed.width,
      height: parsed.height,
    }
  } finally {
    clearTimeout(timer)
    callerSignal?.removeEventListener('abort', forwardAbort)
  }
}

/** Mensaje legible para cualquier error de la carga de imágenes. */
export function describeImageUploadError(error: unknown): string {
  if (error instanceof ImageUploadError) {
    switch (error.code) {
      case 'NOT_CONFIGURED':
        return t("La carga de imágenes no está configurada. Define VITE_CLOUDINARY_CLOUD_NAME y VITE_CLOUDINARY_UPLOAD_PRESET.")
      case 'INVALID_TYPE':
        return t("«{0}» no es una imagen compatible. Usa JPG, PNG o WebP.", [error.fileName ?? '—'])
      case 'EMPTY_FILE':
        return t("«{0}» está vacía.", [error.fileName ?? '—'])
      case 'TOO_LARGE':
        return t("«{0}» supera el máximo de {1} MB.", [error.fileName ?? '—', maxMegabytes()])
      case 'NETWORK':
        return t("No pudimos conectar con Cloudinary. Revisa tu conexión e inténtalo de nuevo.")
      case 'TIMEOUT':
        return t("La carga tardó demasiado. Comprueba tu conexión e inténtalo de nuevo.")
      case 'ABORTED':
        return t("La carga se canceló.")
      case 'REJECTED':
        return describeRejection(error.status ?? 0)
      case 'INVALID_RESPONSE':
        return t("Cloudinary devolvió una respuesta inesperada. Inténtalo de nuevo.")
    }
  }

  return t("Ocurrió un error inesperado al subir la imagen. Inténtalo de nuevo.")
}
