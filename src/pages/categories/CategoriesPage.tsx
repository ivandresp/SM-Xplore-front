import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Button } from '@/components/Button'
import { Field } from '@/components/FormField'
import { PageHeader } from '@/components/PageHeader/PageHeader'
import { Pagination } from '@/components/Pagination/Pagination'
import { SelectField } from '@/components/SelectField'
import { StateMessage } from '@/components/StateMessage'
import { useLanguage } from '@/hooks/useLanguage'
import { useMessageState } from '@/hooks/useMessageState'
import { translate as t } from '@/i18n/language'
import { categoriesApi } from '@/services/categoriesApi'
import type { CategoryResponse, CategoryScope, PageResponse } from '@/types'
import { describeApiError } from '@/utils/errors'
import styles from './categories.module.css'

const CREATE_SCOPES: CategoryScope[] = ['SITE', 'EVENT', 'ACTIVITY', 'GENERAL']
const ALL_SCOPES: CategoryScope[] = [...CREATE_SCOPES, 'SERVICE']
const PAGE_SIZE = 20

export default function CategoriesPage() {
  useLanguage()
  const [name, setName] = useState('')
  const [scope, setScope] = useState<CategoryScope>('SITE')
  const [filter, setFilter] = useState<CategoryScope | ''>('')
  const [page, setPage] = useState(0)
  const [result, setResult] = useState<PageResponse<CategoryResponse> | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [reload, setReload] = useState(0)
  const [listError, setListError] = useMessageState<string | null>(null)
  const [saveError, setSaveError] = useMessageState<string | null>(null)
  const [success, setSuccess] = useMessageState<string | null>(null)
  const submitting = useRef(false)
  const mounted = useRef(true)

  const labels: Record<CategoryScope, string> = {
    GENERAL: t('General'), SITE: t('Sitio turístico'), EVENT: t('Evento'),
    ACTIVITY: t('Actividad'), SERVICE: t('Servicio'),
  }

  useEffect(() => {
    mounted.current = true
    return () => { mounted.current = false }
  }, [])

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setListError(null)
      try {
        const data = await categoriesApi.listPage({ scope: filter || undefined, page, size: PAGE_SIZE })
        if (!cancelled) setResult(data)
      } catch (cause) {
        if (!cancelled) setListError(() => describeApiError(cause))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => { cancelled = true }
  }, [filter, page, reload, setListError])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submitting.current) return
    setSaveError(null)
    setSuccess(null)
    const trimmedName = name.trim()
    if (trimmedName === '') {
      setSaveError(() => t('Escribe el nombre de la categoría.'))
      return
    }
    submitting.current = true
    setSaving(true)
    try {
      await categoriesApi.create({ name: trimmedName, scope, parentId: null })
      if (mounted.current) {
        setName('')
        setSuccess(() => t('Categoría registrada.'))
        setFilter(scope)
        setPage(0)
        setReload((value) => value + 1)
      }
    } catch (cause) {
      if (mounted.current) setSaveError(() => describeApiError(cause))
    } finally {
      submitting.current = false
      if (mounted.current) setSaving(false)
    }
  }

  return (
    <section>
      <PageHeader title={t('Categorías')} description={t('Registra categorías para sitios turísticos, eventos y actividades.')} />
      <div className={styles.layout}>
        <article className={styles.card}>
          <h2 id="new-category-title" className={styles.title}>{t('Nueva categoría')}</h2>
          <form className={styles.form} aria-labelledby="new-category-title" onSubmit={(event) => void submit(event)}>
            <Field label={t('Nombre de la categoría')} required value={name} disabled={saving} onChange={(event) => setName(event.target.value)} />
            <SelectField label={t('Tipo de categoría')} required value={scope} disabled={saving}
              options={CREATE_SCOPES.map((value) => ({ value, label: labels[value] }))}
              onChange={(event) => setScope(CREATE_SCOPES.find((value) => value === event.target.value) ?? 'SITE')} />
            {saveError !== null && <StateMessage title={t('No se pudo registrar la categoría')} description={saveError} tone="error" />}
            {success !== null && <p className={styles.feedback} role="status">{success}</p>}
            <Button type="submit" disabled={saving}>{saving ? t('Guardando…') : t('Crear categoría')}</Button>
          </form>
        </article>
        <article className={styles.card} aria-labelledby="category-list-title" aria-busy={loading}>
          <h2 id="category-list-title" className={styles.title}>{t('Categorías registradas')}</h2>
          <SelectField label={t('Filtrar por tipo')} value={filter}
            options={[{ value: '', label: t('Todos los tipos') }, ...ALL_SCOPES.map((value) => ({ value, label: labels[value] }))]}
            onChange={(event) => { setFilter(ALL_SCOPES.find((value) => value === event.target.value) ?? ''); setPage(0) }} />
          {loading ? <p role="status">{t('Cargando categorías…')}</p> : listError !== null ? (
            <StateMessage title={t('No se pudieron cargar las categorías')} description={listError} tone="error"
              action={<Button onClick={() => setReload((value) => value + 1)}>{t('Reintentar')}</Button>} />
          ) : result !== null && result.content.length > 0 ? (
            <>
              <ul className={styles.list} aria-label={t('Categorías registradas')}>
                {result.content.map((category) => (
                  <li key={category.id} className={styles.item}>
                    <strong className={styles.name}>{category.name}</strong>
                    <span className={styles.scope}>{labels[category.scope]}</span>
                  </li>
                ))}
              </ul>
              <Pagination page={page + 1} totalPages={result.totalPages} onChange={(next) => setPage(next - 1)} />
            </>
          ) : <StateMessage title={t('No hay categorías de este tipo.')} />}
        </article>
      </div>
    </section>
  )
}
