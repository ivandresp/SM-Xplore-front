import { useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { useMessageState } from '@/hooks/useMessageState'
import { translate as t } from '@/i18n/language'
import { useLanguage } from '@/hooks/useLanguage'
import { Avatar } from '@/components/Avatar/Avatar'
import { Button } from '@/components/Button'
import { DefList } from '@/components/DefList/DefList'
import type { DefItem } from '@/components/DefList/DefList'
import { Field } from '@/components/FormField'
import { PageHeader } from '@/components/PageHeader/PageHeader'
import { SelectField } from '@/components/SelectField'
import { StateMessage } from '@/components/StateMessage'
import { StatusBadge } from '@/components/StatusBadge/StatusBadge'
import { ACCOUNT_STATUS_LABELS, ROLE_LABELS } from '@/config/roles'
import { useAuth } from '@/hooks/useAuth'
import { useFormValidation } from '@/hooks/useFormValidation'
import { usersApi } from '@/services/usersApi'
import { describeApiError, logApiError } from '@/utils/errors'
import { formatMonthYear } from '@/utils/format'
import { usePreferences } from './usePreferences'
import styles from './profile.module.css'

interface ProfileDraft {
  fullName: string
  phone: string
}

export default function MyProfilePage() {
  useLanguage()
  const { user, updateSessionUser } = useAuth()

  const [draft, setDraft] = useState<ProfileDraft | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useMessageState<string | null>(null)
  const [feedback, setFeedback] = useMessageState<string | null>(null)
  const [selectedCategory, setSelectedCategory] = useState('')
  const formRef = useRef<HTMLFormElement>(null)

  // Límites de `UpdateProfileRequest`: nombre ≤ 150 y teléfono 7–20 con +()-
  const form = useFormValidation({
    values: draft ?? { fullName: '', phone: '' },
    validate: (values) => ({
      ...(values.fullName.trim() === ''
        ? { fullName: t("Escribe tu nombre.") }
        : values.fullName.trim().length > 150
          ? { fullName: t("Usa 150 caracteres o menos.") }
          : {}),
      ...(values.phone.trim() === ''
        ? { phone: t("Escribe tu teléfono.") }
        : /^[0-9+()\-\s]{7,20}$/.test(values.phone.trim())
          ? {}
          : { phone: t("Usa entre 7 y 20 dígitos; puedes incluir +, () o guiones.") }),
    }),
    labels: { get fullName() { return t("Nombre completo") }, get phone() { return t("Teléfono") } },
    order: ['fullName', 'phone'] as const,
    formRef,
  })

  // ms-05 solo acepta ROLE_TOURIST en /preferences (SecurityConfiguration:52-54).
  const {
    preferences,
    categories,
    isLoading: isPreferencesLoading,
    error: preferencesError,
    savingCategory,
    add: addPreference,
    remove: removePreference,
  } = usePreferences({ enabled: user?.role === 'TOURIST' })

  if (user === null) {
    return null
  }

  const currentUser = user
  const isEditing = draft !== null
  const isTourist = currentUser.role === 'TOURIST'
  const categoryNames = new Map(
    categories.map((category) => [category.id, category.name]),
  )
  const availableCategories = categories.filter(
    (category) =>
      !preferences.some((preference) => preference.categoryId === category.id),
  )

  const personalItems: DefItem[] = [
    { label: t("Nombre completo"), value: currentUser.fullName },
    { label: t("Correo electrónico"), value: currentUser.email },
    { label: t("Teléfono"), value: currentUser.phone },
    {
      label: isTourist ? t('País') : t('Ciudad'),
      value: currentUser.role === 'TOURIST'
        ? currentUser.profile?.nationality?.trim() || '—'
        : '—',
    },
  ]

  const accountItems: DefItem[] = [
    { label: t("Tipo de cuenta"), value: ROLE_LABELS[currentUser.role] },
    { label: t("Última sesión"), value: '—' },
    { label: t("Estado"), value: ACCOUNT_STATUS_LABELS[currentUser.status] },
  ]

  function startEdit() {
    setDraft({
      fullName: currentUser.fullName,
      phone: currentUser.phone,
    })
    setFeedback(null)
    setError(null)
    form.clear()
  }

  function cancelEdit() {
    setDraft(null)
    setError(null)
    form.clear()
  }

  async function handleAddPreference() {
    if (selectedCategory === '') {
      return
    }

    // Limpiar el select evita que «Añadir» repita una categoría que ya no está.
    if (await addPreference(selectedCategory)) {
      setSelectedCategory('')
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (draft === null) {
      return
    }

    if (form.blocked()) {
      return
    }

    setIsSaving(true)
    setError(null)
    setFeedback(null)

    try {
      const updated = await usersApi.updateMe({
        fullName: draft.fullName.trim(),
        phone: draft.phone.trim(),
      })
      updateSessionUser(updated)
      setDraft(null)
      setFeedback(() => t("Perfil actualizado."))
    } catch (cause) {
      logApiError(cause, t("perfil: guardar"))
      if (!form.applyValidationErrors(cause)) {
        setError(() => describeApiError(cause))
      }
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <section className={styles.page}>
      <PageHeader
        breadcrumb={[{ label: t("Inicio"), to: '/explorar' }, { label: t("Mi perfil") }]}
        title={t("Mi perfil")}
        description={t("Tu información y preferencias en SM-Xplore.")}
      />

      {error !== null && <StateMessage title={error} tone="error" />}
      {feedback !== null && (
        <p className={`${styles.feedback} ${styles.success}`}>{feedback}</p>
      )}

      <div className={`${styles.layout} ${styles.layoutWideRight}`}>
        <div className={styles.column}>
          <article className={styles.card}>
            <div className={styles.headerCard}>
              <Avatar name={currentUser.fullName} size="lg" />
              <div className={styles.identity}>
                <h2 className={styles.name}>{currentUser.fullName}</h2>
                <p className={styles.meta}>{currentUser.email}</p>
                <div className={styles.chips}>
                  <StatusBadge tone="neutral">
                    {ROLE_LABELS[currentUser.role]}
                  </StatusBadge>
                </div>
                <p className={styles.meta}>
                  {t("Miembro desde")}{" "}{formatMonthYear(currentUser.signedUpAt)}
                </p>
              </div>
            </div>
          </article>

          <article className={styles.card}>
            <h2 className={styles.cardTitle}>{t("Cuenta")}</h2>
            <DefList items={accountItems} columns={1} />
          </article>
        </div>

        <div className={styles.column}>
          <article className={styles.card}>
            <div className={styles.cardHeader}>
              <h2 className={styles.cardTitle}>{t("Información personal")}</h2>
              {!isEditing && (
                <Button variant="outline" size="sm" onClick={startEdit}>
                  {t("Editar")}</Button>
              )}
            </div>

            {draft !== null ? (
              <form className={styles.form} onSubmit={handleSubmit} noValidate ref={formRef}>
                <Field
                  label={t("Nombre completo")}
                  name="fullName"
                  required
                  value={draft.fullName}
                  error={form.errorOf('fullName')}
                  onChange={(event) =>
                    setDraft({ ...draft, fullName: event.target.value })
                  }
                  onBlur={() => form.markTouched('fullName')}
                />
                <Field
                  label={t("Correo electrónico")}
                  type="email"
                  name="email"
                  value={currentUser.email}
                  disabled
                  hint={t("El correo no se puede cambiar desde el perfil.")}
                />
                <Field
                  label={t("Teléfono")}
                  name="phone"
                  required
                  value={draft.phone}
                  error={form.errorOf('phone')}
                  onChange={(event) =>
                    setDraft({ ...draft, phone: event.target.value })
                  }
                  onBlur={() => form.markTouched('phone')}
                />
                {form.summary !== null && (
                  <p className={styles.prefsError} role="alert">
                    {form.summary}
                  </p>
                )}
                <div className={styles.formActions}>
                  <Button
                    variant="primary"
                    type="submit"
                    loading={isSaving}
                  >
                    {t("Guardar cambios")}</Button>
                  <Button
                    variant="outline"
                    onClick={cancelEdit}
                    disabled={isSaving}
                  >
                    {t("Cancelar")}</Button>
                </div>
              </form>
            ) : (
              <DefList items={personalItems} />
            )}
          </article>

          <article className={styles.card}>
            <h2 className={styles.cardTitle}>{t("Preferencias")}</h2>

            {!isTourist && (
              <p className={styles.note}>
                {t("Las preferencias de categoría se guardan en cuentas de turista; tu cuenta no las usa para armar recomendaciones.")}</p>
            )}

            {isTourist && (
              <>
                <p className={styles.note}>
                  {t("Marca las categorías que te gustan: pesan en el orden de tus recomendaciones.")}</p>

                {isPreferencesLoading && (
                  <p className={styles.empty}>{t("Cargando preferencias…")}</p>
                )}

                {!isPreferencesLoading &&
                  preferencesError === null &&
                  preferences.length === 0 && (
                    <p className={styles.empty}>
                      {t("Aún no has marcado ninguna categoría.")}</p>
                  )}

                {preferences.length > 0 && (
                  <ul className={styles.prefsList}>
                    {preferences.map((preference) => {
                      const name =
                        categoryNames.get(preference.categoryId) ?? t("Categoría")

                      return (
                        <li key={preference.categoryId}>
                          <button
                            type="button"
                            className={styles.prefChip}
                            onClick={() => void removePreference(preference.categoryId)}
                            disabled={savingCategory === preference.categoryId}
                            aria-label={t("Quitar {0}", [name])}
                          >
                            <span className={styles.prefName}>{name}</span>
                            <span aria-hidden="true">×</span>
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                )}

                {preferences.some((preference) => preference.source === 'INFERRED') && (
                  <p className={styles.note}>
                    {t("Las deducidas salen de tus visitas y vuelven a aparecer si sigues abriendo esa categoría.")}</p>
                )}

                {availableCategories.length > 0 && (
                  <div className={styles.prefsForm}>
                    <SelectField
                      id="profile-pref-category"
                      label={t("Añadir categoría")}
                      placeholder={t("Selecciona una categoría…")}
                      options={availableCategories.map((category) => ({
                        value: category.id,
                        label: category.name,
                      }))}
                      value={selectedCategory}
                      onChange={(event) =>
                        setSelectedCategory(event.target.value)
                      }
                    />
                    <Button
                      className={styles.prefAddButton}
                      size="sm"
                      aria-label={t("Añadir")}
                      title={t("Añadir")}
                      disabled={
                        selectedCategory === '' || savingCategory !== null
                      }
                      onClick={() => void handleAddPreference()}
                    >
                      <span className={styles.prefAddText}>{t("Añadir")}</span>
                      <svg className={styles.prefAddIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true" focusable="false">
                        <path d="M12 5v14M5 12h14" />
                      </svg>
                    </Button>
                  </div>
                )}

                {preferencesError !== null && (
                  <p className={styles.prefsError} role="alert">
                    {preferencesError}
                  </p>
                )}
              </>
            )}
          </article>
        </div>
      </div>
    </section>
  )
}
