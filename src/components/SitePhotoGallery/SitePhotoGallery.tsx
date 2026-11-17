import { useState } from 'react'
import { useLanguage } from '@/hooks/useLanguage'
import { translate as t } from '@/i18n/language'
import styles from './SitePhotoGallery.module.css'

export interface SitePhotoGalleryProps {
  name: string
  photos: string[]
}

/** Portada seleccionable; las miniaturas están visibles si hay varias fotos. */
export function SitePhotoGallery({ name, photos }: SitePhotoGalleryProps) {
  useLanguage()
  const [selected, setSelected] = useState(0)
  const current = Math.max(0, Math.min(selected, photos.length - 1))
  const photo = photos[current]

  return (
    <section className={styles.gallery} aria-label={t('Fotos de {0}', [name])}>
      <div className={styles.hero}>
        {photo !== undefined ? <img className={styles.photo} src={photo} alt={name} /> : t('Sin fotos: la gestora no cargó imágenes')}
      </div>
      {photos.length > 1 && (
        <>
          <p className={styles.count} aria-live="polite">{t('Foto {0} de {1}', [current + 1, photos.length])}</p>
          <div className={styles.thumbnails}>
            {photos.map((url, index) => (
              <button key={`${url}-${index}`} className={styles.thumbnail} type="button"
                aria-label={t('Ver foto {0} de {1}', [index + 1, photos.length])}
                aria-pressed={current === index} onClick={() => setSelected(index)}>
                <img src={url} alt="" loading="lazy" />
              </button>
            ))}
          </div>
        </>
      )}
    </section>
  )
}
