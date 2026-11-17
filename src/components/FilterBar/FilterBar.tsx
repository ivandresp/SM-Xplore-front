import { useId, useState } from 'react'
import type { ReactNode } from 'react'
import { translate as t } from '@/i18n/language'
import { useLanguage } from '@/hooks/useLanguage'
import { Button } from '@/components/Button'
import styles from './FilterBar.module.css'

export interface ActiveFilter {
  /** Clave del parámetro en la URL (`category`, `zoneId`, ...). */
  key: string
  label: string
  value: string
}

export interface FilterBarProps {
  activeFilters: ActiveFilter[]
  onRemoveFilter: (key: string) => void
  onClearFilters: () => void
  /** Texto ya formateado: «23 resultados» o «Buscando…». */
  resultSummary: string
  children: ReactNode
}

/**
 * Barra de filtros compartida del catálogo: controles, contador, chips
 * removibles y «Limpiar filtros». En móvil los controles se colapsan.
 */
export function FilterBar({
  activeFilters,
  onRemoveFilter,
  onClearFilters,
  resultSummary,
  children,
}: FilterBarProps) {
  useLanguage()
  const [isOpen, setIsOpen] = useState(false)
  const panelId = useId()
  const hasFilters = activeFilters.length > 0

  return (
    <section className={styles.bar} aria-label={t("Filtros del catálogo")}>
      <div className={styles.head}>
        <h2 className={styles.title}>{t("Filtros")}</h2>
        <p className={styles.count} role="status">
          {resultSummary}
        </p>
        {hasFilters && (
          <p className={styles.summary}>
            {activeFilters.length === 1
              ? t("1 filtro activo")
              : t("{0} filtros activos", [activeFilters.length])}
          </p>
        )}
        <div className={styles.actions}>
          <Button
            className={styles.toggle}
            variant="outline"
            size="sm"
            aria-expanded={isOpen}
            aria-controls={panelId}
            onClick={() => setIsOpen((open) => !open)}
          >
            {isOpen
              ? t("Ocultar filtros")
              : hasFilters
                ? t("Mostrar filtros ({0})", [activeFilters.length])
                : t("Mostrar filtros")}
          </Button>
          {hasFilters && (
            <Button variant="outline" size="sm" onClick={onClearFilters}>
              {t("Limpiar filtros")}</Button>
          )}
        </div>
      </div>

      <div
        id={panelId}
        className={isOpen ? styles.panel : styles.panelCollapsed}
      >
        <fieldset className={styles.group}>
          <legend className={styles.legend}>{t("Filtrar resultados")}</legend>
          <div className={styles.controls}>{children}</div>
        </fieldset>
      </div>

      {/*
       * La fila se renderiza siempre con un alto reservado: al elegir el
       * primer filtro el chip aparece en su hueco y la tabla no se mueve.
       */}
      <ul
        className={styles.chips}
        aria-label={hasFilters ? t("Filtros activos") : undefined}
      >
        {activeFilters.map((filter) => (
          <li key={filter.key}>
            <button
              type="button"
              className={styles.chip}
              aria-label={t("Quitar filtro {0}: {1}", [filter.label, filter.value])}
              onClick={() => onRemoveFilter(filter.key)}
            >
              <span className={styles.chipLabel}>{filter.label}</span>
              <span>{filter.value}</span>
              <span className={styles.chipX} aria-hidden="true">
                ×
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}