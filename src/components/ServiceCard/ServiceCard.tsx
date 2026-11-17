import { Link } from 'react-router-dom'
import { translate as t } from '@/i18n/language'
import { useLanguage } from '@/hooks/useLanguage'
import { Button } from '@/components/Button'
import { Media } from '@/components/Media'
import { serviceTypeLabel } from '@/config/roles'
import { formatCurrency } from '@/utils/format'
import type { ServiceResponse } from '@/types'
import styles from './ServiceCard.module.css'

export interface ServiceCardProps {
  service: ServiceResponse
}

/** Tarjeta del catálogo de servicios: foto (si hay), nombre, tipo, prestadora y precio. */
export function ServiceCard({ service }: ServiceCardProps) {
  useLanguage()
  return (
    <article className={styles.card}>
      <Media photo={service.photosUrls[0]} chip={service.categoryName} />

      <h3 className={styles.name}>{service.name}</h3>
      <p className={styles.meta}>
        {serviceTypeLabel(service.type)} · {service.providerName}
      </p>
      <p className={styles.price}>{formatCurrency(service.price)}</p>

      <Link to={`/servicios/${service.id}`}>
        <Button variant="outline" block>
          {t("Ver detalle")}</Button>
      </Link>
    </article>
  )
}
