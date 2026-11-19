import { useEffect, useState } from 'react'
import { ApiErrorAction } from '@/components/ApiErrorAction'
import { SelectField } from '@/components/SelectField'
import { useLanguage } from '@/hooks/useLanguage'
import { translate as t } from '@/i18n/language'
import { listCategoriesForScope } from '@/services/categoriesApi'
import type { CategoryResponse } from '@/types'

export interface CategorySelectProps {
  scope: 'ACTIVITY' | 'EVENT'
  value: string
  onChange: (name: string) => void
  required?: boolean
  disabled?: boolean
  className?: string
}

/** ms-03 guarda el nombre de categoría; el catálogo distingue su scope. */
export function CategorySelect({ scope, value, onChange, required = false, disabled = false, className }: CategorySelectProps) {
  useLanguage()
  const [categories, setCategories] = useState<CategoryResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)
  const [failureCause, setFailureCause] = useState<unknown>(null)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let cancelled = false
    listCategoriesForScope(scope)
      .then((found) => {
        if (!cancelled) setCategories(found)
      })
      .catch(cause => {
        if (!cancelled) { setFailureCause(() => cause); setFailed(true) }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [scope, attempt])

  function retry() {
    setFailed(false)
    setLoading(true)
    setAttempt((previous) => previous + 1)
  }

  const empty = !loading && !failed && categories.length === 0
  return (
    <div>
      <SelectField
        label={t('Categoría')}
        value={value}
        required={required}
        disabled={disabled || loading || failed || empty}
        className={className}
        placeholder={loading ? t('Cargando categorías…') : required ? t('Selecciona una categoría…') : t('Todas las categorías')}
        hint={failed ? t('No se pudieron cargar las categorías.') : empty ? t('No hay categorías disponibles.') : undefined}
        groups={(['GENERAL', scope] as const).map((groupScope) => ({
          label: groupScope === 'GENERAL' ? t('General') : groupScope === 'ACTIVITY' ? t('Actividad') : t('Evento'),
          options: categories.filter((category) => category.scope === groupScope).map((category) => ({ value: category.name, label: category.name })),
        })).filter((group) => group.options.length > 0)}
        onChange={(event) => onChange(event.target.value)}
      />
      {failed && <ApiErrorAction error={failureCause} variant="outline" size="sm" onRetry={retry} disabled={disabled} />}
    </div>
  )
}
