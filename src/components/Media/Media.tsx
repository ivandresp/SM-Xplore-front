import { useState } from 'react'
import { classNames } from '@/utils/format'
import styles from './Media.module.css'

export interface MediaProps {
  /** Primera foto del recurso. Si falta o la URL falla, se pinta el fallback. */
  photo?: string
  /** Categoría como chip sobre la foto; solo se pinta cuando hay foto. */
  chip?: string
  /** `alt` de la imagen: vacío cuando el nombre del recurso ya está al lado. */
  alt?: string
  className?: string
}

/**
 * Bloque de imagen de las tarjetas del catálogo. Foto con chip de categoría
 * sobre scrim, o icono + «Sin foto» cuando el recurso no trae imagen (o la URL
 * falla). Alto fijo (`--media-h`): la grilla no se mueve entre ambos casos.
 */
export function Media({ photo, chip, alt = '', className }: MediaProps) {
  const [failed, setFailed] = useState(false)
  const showPhoto = photo !== undefined && photo !== '' && !failed

  if (showPhoto) {
    return (
      <div className={classNames(styles.media, className)}>
        <img
          className={styles.photo}
          src={photo}
          alt={alt}
          loading="lazy"
          onError={() => setFailed(true)}
        />
        <div className={styles.scrim} aria-hidden="true" />
        {chip !== undefined && chip !== '' && (
          <span className={styles.chip}>{chip}</span>
        )}
      </div>
    )
  }

  return (
    <div
      className={classNames(styles.placeholder, className)}
      aria-hidden="true"
    >
      <svg
        className={styles.icon}
        viewBox="0 0 24 24"
        fill="none"
        strokeWidth="1.5"
      >
        <rect x="2.5" y="4.5" width="19" height="15" rx="2.5" />
        <circle cx="8.5" cy="10" r="1.6" />
        <path d="M2.5 16.5l5-4.5 3.5 3.5 3-2.5 7.5 6" />
      </svg>
      <span className={styles.tag}>Sin foto</span>
    </div>
  )
}
