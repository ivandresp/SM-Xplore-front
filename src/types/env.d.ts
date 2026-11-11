/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** URL base del API de SM-Xplore (por defecto `/api`). */
  readonly VITE_API_URL?: string
  /** Nombre del cloud de Cloudinary (solo credencial pública). */
  readonly VITE_CLOUDINARY_CLOUD_NAME?: string
  /** Upload preset **unsigned** para las cargas desde el navegador. */
  readonly VITE_CLOUDINARY_UPLOAD_PRESET?: string
}
