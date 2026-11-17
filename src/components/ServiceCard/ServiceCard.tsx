import { Link } from 'react-router-dom'
import { Media } from '@/components/Media'
import { serviceTypeLabel } from '@/config/roles'
import { useLanguage } from '@/hooks/useLanguage'
import type { ServiceResponse } from '@/types'
import { formatCurrency } from '@/utils/format'
import styles from './ServiceCard.module.css'

export interface ServiceCardProps {
  service: ServiceResponse
}

/** Tarjeta del catálogo con enlace al detalle sobre toda su superficie. */
export function ServiceCard({ service }: ServiceCardProps) {
  useLanguage()
  return (
    <Link className={styles.card} to={`/servicios/${service.id}`} aria-label={service.name}>
      <Media photo={service.photosUrls[0]} />
      <h3 className={styles.name}>{service.name}</h3>
      {service.categoryName !== '' && <p className={styles.meta}>{service.categoryName}</p>}
      <div className={styles.footer}>
        <p className={styles.meta}>{serviceTypeLabel(service.type)}</p>
        <p className={styles.price}>{formatCurrency(service.price)}</p>
      </div>
    </Link>
  )
}
