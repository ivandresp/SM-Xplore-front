import { Link } from 'react-router-dom'
import { Media } from '@/components/Media'
import { useLanguage } from '@/hooks/useLanguage'
import { translate as t } from '@/i18n/language'
import type { ActivityResponse } from '@/types'
import { formatCurrency, formatDuration } from '@/utils/format'
import styles from './ActivityCard.module.css'

export interface ActivityCardProps {
  activity: ActivityResponse
}

/** Tarjeta del catálogo con enlace sobre toda su superficie. */
export function ActivityCard({ activity }: ActivityCardProps) {
  useLanguage()
  return (
    <Link className={styles.card} to={`/actividades/${activity.id}`} aria-label={activity.name}>
      <Media photo={activity.portraitUrl ?? undefined} />
      <h3 className={styles.name}>{activity.name}</h3>
      <p className={styles.meta}>{activity.category}</p>
      <div className={styles.footer}>
        <p className={styles.meta}>{formatDuration(activity.durationMinutes)}</p>
        <p className={styles.price}>
          {activity.price === 0 ? t('Gratis') : formatCurrency(activity.price)}
        </p>
      </div>
    </Link>
  )
}
