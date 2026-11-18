import { Link } from 'react-router-dom'
import { Media } from '@/components/Media'
import { useLanguage } from '@/hooks/useLanguage'
import { getLocale, translate as t } from '@/i18n/language'
import type { EventResponse } from '@/types'
import { formatCurrency } from '@/utils/format'
import styles from './EventCard.module.css'

export interface EventCardProps {
  event: EventResponse
}

export function EventCard({ event }: EventCardProps) {
  useLanguage()
  const date = new Date(event.startsAt)
  const locale = getLocale()
  const day = new Intl.DateTimeFormat(locale, { day: 'numeric' }).format(date)
  const month = new Intl.DateTimeFormat(locale, { month: 'short' }).format(date).replace('.', '')
  const fullDate = new Intl.DateTimeFormat(locale, { dateStyle: 'long' }).format(date)

  return (
    <Link className={styles.card} to={`/eventos/${event.id}`} aria-label={event.name}>
      <Media photo={event.portraitUrl ?? undefined} />
      <h2 className={styles.name}>{event.name}</h2>
      <div className={styles.footer}>
        <p className={styles.category}>{event.category}</p>
        <p className={styles.price}>{event.price === 0 ? t('Gratis') : formatCurrency(event.price)}</p>
        <time className={styles.dateBadge} dateTime={event.startsAt} aria-label={fullDate} title={fullDate}>
          <span className={styles.day}>{day}</span>
          <span className={styles.month}>{month}</span>
        </time>
      </div>
    </Link>
  )
}
