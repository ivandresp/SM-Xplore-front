import { Link } from 'react-router-dom'
import { Button } from '@/components/Button'
import { Media } from '@/components/Media'
import { formatCurrency, formatDuration } from '@/utils/format'
import type { ActivityResponse } from '@/types'
import styles from './ActivityCard.module.css'

export interface ActivityCardProps {
  activity: ActivityResponse
}

/** Tarjeta del catálogo: imagen, nombre, metadatos, precio y acción. */
export function ActivityCard({ activity }: ActivityCardProps) {
  return (
    <article className={styles.card}>
      <Media chip={activity.category} />

      <h3 className={styles.name}>{activity.name}</h3>
      <p className={styles.meta}>
        {activity.category} · {formatDuration(activity.durationMinutes)} · hasta{' '}
        {activity.maxCapacity} personas
      </p>
      <p className={styles.price}>{formatCurrency(activity.price)}</p>

      <Link to={`/actividades/${activity.id}`}>
        <Button variant="outline" block>
          Ver detalle
        </Button>
      </Link>
    </article>
  )
}
