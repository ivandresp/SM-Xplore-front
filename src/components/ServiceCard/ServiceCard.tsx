import { Link } from 'react-router-dom'
import { Button } from '@/components/Button'
import { serviceTypeLabel } from '@/config/roles'
import { formatCurrency } from '@/utils/format'
import type { ServiceResponse } from '@/types'
import styles from './ServiceCard.module.css'

export interface ServiceCardProps {
  service: ServiceResponse
}

/** Tarjeta del catálogo de servicios: foto (si hay), nombre, tipo, prestadora y precio. */
export function ServiceCard({ service }: ServiceCardProps) {
  const photo = service.photosUrls[0]

  return (
    <article className={styles.card}>
      <div className={styles.media}>
        {photo !== undefined ? (
          <img className={styles.photo} src={photo} alt="" loading="lazy" />
        ) : (
          <span className={styles.mediaNote}>Sin foto</span>
        )}
      </div>

      <h3 className={styles.name}>{service.name}</h3>
      <p className={styles.meta}>
        {serviceTypeLabel(service.type)} · {service.providerName}
      </p>
      <p className={styles.price}>{formatCurrency(service.price)}</p>

      <Link to={`/servicios/${service.id}`}>
        <Button variant="outline" block>
          Ver detalle
        </Button>
      </Link>
    </article>
  )
}
