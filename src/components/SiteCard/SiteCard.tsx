import { Link } from 'react-router-dom'
import { translate as t } from '@/i18n/language'
import { useLanguage } from '@/hooks/useLanguage'
import { Media } from '@/components/Media'
import type { Site } from '@/types'
import styles from './SiteCard.module.css'

export interface SiteCardProps {
  site: Site
  /** Nombre de la zona a la que pertenece, si se conoce. */
  zoneName: string | undefined
  /** Nombre de la categoría, para el chip sobre la foto. */
  categoryName?: string | undefined
}

/** Tarjeta del catálogo de atractivos: foto (si hay), nombre y zona; el enlace abarca toda la tarjeta. */
export function SiteCard({ site, zoneName, categoryName }: SiteCardProps) {
  useLanguage()
  return (
    <Link className={styles.card} to={`/atractivos/${site.id}`} aria-label={site.name}>
      <Media photo={site.photoUrls[0]} chip={categoryName} />

      <h3 className={styles.name}>{site.name}</h3>
      <p className={styles.meta}>
        {zoneName ?? t("Zona sin publicar")}
      </p>

    </Link>
  )
}
