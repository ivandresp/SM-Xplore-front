import { useEffect, useState } from 'react'
import { Button } from '@/components/Button'
import { SelectField } from '@/components/SelectField'
import { useLanguage } from '@/hooks/useLanguage'
import { translate as t } from '@/i18n/language'
import { categoriesApi } from '@/services/categoriesApi'
import type { CategoryResponse } from '@/types'
import { MAX_PAGE_SIZE } from '@/types/common'

export interface CategorySelectProps {
  scope: 'ACTIVITY' | 'EVENT'
  value: string
  onChange: (name: string) => void
  required?: boolean
  disabled?: boolean
  className?: string
}

async function listScope(scope: 'GENERAL' | 'ACTIVITY' | 'EVENT') {
  const categories: CategoryResponse[] = []
  let page = 0
  let totalPages = 1
  do {
    const result = await categoriesApi.listPage({ scope, page, size: MAX_PAGE_SIZE })
    categories.push(...result.content.filter((category) => category.scope === scope))
    totalPages = result.totalPages
    page += 1
  } while (page < totalPages)
  return categories.sort((a, b) => a.name.localeCompare(b.name, 'es'))
}

/** ms-03 guarda el nombre de categoría; el catálogo distingue su scope. */
export function CategorySelect({ scope, value, onChange, required = false, disabled = false, className }: CategorySelectProps) {
  useLanguage()
  const [categories, setCategories] = useState<CategoryResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let cancelled = false
    Promise.all([listScope('GENERAL'), listScope(scope)])
      .then(([general, specific]) => {
        if (!cancelled) setCategories([...general, ...specific])
      })
      .catch(() => {
        if (!cancelled) setFailed(true)
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
      {failed && <Button variant="outline" size="sm" onClick={retry} disabled={disabled}>{t('Reintentar')}</Button>}
    </div>
  )
}
