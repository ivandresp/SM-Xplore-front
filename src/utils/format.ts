import { getLocale, translate as t } from '@/i18n/language'

/** Une clases CSS ignorando los valores falsy. */
export function classNames(
  ...values: Array<string | false | null | undefined>
): string {
  return values.filter(Boolean).join(' ')
}

/** Formatea una fecha como "12 oct 2026" en el locale indicado. */
export function formatDate(value: string | Date, locale = getLocale()): string {
  const date = value instanceof Date ? value : new Date(value)
  return new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date)
}

/** Formatea una fecha como "octubre 2026". */
export function formatMonthYear(value: string | Date, locale = getLocale()): string {
  const date = value instanceof Date ? value : new Date(value)
  return new Intl.DateTimeFormat(locale, {
    month: 'long',
    year: 'numeric',
  }).format(date)
}

/** Formatea una fecha con hora en el locale indicado (`es-CO` por defecto). */
export function formatDateTime(value: string | Date, locale = getLocale()): string {
  const date = value instanceof Date ? value : new Date(value)
  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

/** Tiempo relativo: "hace 2 h", "ayer". */
export function formatRelativeTime(value: string | Date, locale = getLocale()): string {
  const date = value instanceof Date ? value : new Date(value)
  const diffSeconds = Math.round((date.getTime() - Date.now()) / 1000)
  const formatter = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' })

  const units: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ['year', 31536000],
    ['month', 2592000],
    ['day', 86400],
    ['hour', 3600],
    ['minute', 60],
  ]

  for (const [unit, seconds] of units) {
    if (Math.abs(diffSeconds) >= seconds) {
      return formatter.format(Math.round(diffSeconds / seconds), unit)
    }
  }

  return formatter.format(diffSeconds, 'second')
}

/** Formatea un precio en pesos colombianos: 120000 → "$ 120.000". */
export function formatCurrency(value: number, locale = getLocale()): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(value)
}

/** Duración legible: 240 → "4 h", 45 → "45 min". */
export function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} min`
  }

  const hours = minutes / 60
  return `${Number.isInteger(hours) ? hours : hours.toFixed(1)} h`
}

/** Duración en palabras: 240 → "4 horas", 45 → "45 minutos". */
export function formatDurationLong(minutes: number): string {
  if (minutes < 60) {
    return t(minutes === 1 ? '{0} minuto' : '{0} minutos', [minutes])
  }

  const hours = minutes / 60
  if (Number.isInteger(hours)) {
    return t(hours === 1 ? '{0} hora' : '{0} horas', [hours])
  }

  return t('{0} horas', [hours.toFixed(1)])
}
