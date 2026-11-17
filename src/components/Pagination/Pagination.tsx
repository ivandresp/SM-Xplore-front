import { translate as t } from '@/i18n/language'
import { useLanguage } from '@/hooks/useLanguage'
import { classNames } from '@/utils/format'
import styles from './Pagination.module.css'

export interface PaginationProps {
  page: number
  totalPages: number
  onChange: (page: number) => void
}

/** Números de página visibles alrededor de la actual, con elipsis. */
function buildPages(page: number, totalPages: number): Array<number | 'gap'> {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1)
  }

  const pages: Array<number | 'gap'> = [1]
  const from = Math.max(2, page - 1)
  const to = Math.min(totalPages - 1, page + 1)

  if (from > 2) pages.push('gap')
  for (let current = from; current <= to; current += 1) pages.push(current)
  if (to < totalPages - 1) pages.push('gap')
  pages.push(totalPages)

  return pages
}

export function Pagination({ page, totalPages, onChange }: PaginationProps) {
  useLanguage()
  if (totalPages <= 1) {
    return null
  }

  return (
    <nav className={styles.pagination} aria-label={t("Paginación")}>
      <button
        type="button"
        className={styles.page}
        onClick={() => onChange(page - 1)}
        disabled={page <= 1}
        aria-label={t("Página anterior")}
      >
        ‹
      </button>

      {buildPages(page, totalPages).map((item, index) =>
        item === 'gap' ? (
          <span key={`gap-${index}`} className={styles.ellipsis}>
            …
          </span>
        ) : (
          <button
            key={item}
            type="button"
            className={classNames(styles.page, item === page && styles.active)}
            onClick={() => onChange(item)}
            aria-current={item === page ? 'page' : undefined}
          >
            {item}
          </button>
        ),
      )}

      <button
        type="button"
        className={styles.page}
        onClick={() => onChange(page + 1)}
        disabled={page >= totalPages}
        aria-label={t("Página siguiente")}
      >
        ›
      </button>
    </nav>
  )
}
