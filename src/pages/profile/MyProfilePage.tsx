import { useState } from 'react'
import type { FormEvent } from 'react'
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
import { usersApi } from '@/services/usersApi'
import type { PreferenceSource } from '@/types'
import { describeApiError, logApiError } from '@/utils/errors'
import { formatMonthYear } from '@/utils/format'
import { usePreferences } from './usePreferences'
import styles from './profile.module.css'

const PREFERENCE_SOURCE_LABEL: Record<PreferenceSource, string> = {
  EXPLICIT: 'Elegida por ti',
  INFERRED: 'Deducida de tus visitas',
}

interface ProfileDraft {
  fullName: string
  phone: string
}

export default function MyProfilePage() {
  const { user, updateSessionUser } = useAuth()

  const [draft, setDraft] = useState<ProfileDraft | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [selectedCategory, setSelectedCategory] = useState('')

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
    { label: 'Nombre completo', value: currentUser.fullName },
    { label: 'Correo electrónico', value: currentUser.email },
    { label: 'Teléfono', value: currentUser.phone },
    { label: 'Ciudad', value: '—' },
  ]

  const accountItems: DefItem[] = [
    { label: 'Tipo de cuenta', value: ROLE_LABELS[currentUser.role] },
    { label: 'Última sesión', value: '—' },
    { label: 'Estado', value: ACCOUNT_STATUS_LABELS[currentUser.status] },
  ]

  function startEdit() {
    setDraft({
      fullName: currentUser.fullName,
      phone: currentUser.phone,
    })
    setFeedback(null)
    setError(null)
  }

  function cancelEdit() {
    setDraft(null)
    setError(null)
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
      setFeedback('Perfil actualizado.')
    } catch (cause) {
      logApiError(cause, 'perfil: guardar')
      setError(describeApiError(cause))
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <section className={styles.page}>
      <PageHeader
        breadcrumb={[{ label: 'Inicio', to: '/explorar' }, { label: 'Mi perfil' }]}
        title="Mi perfil"
        description="Tu información y preferencias en SM-Xplore."
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
                  Miembro desde {formatMonthYear(currentUser.signedUpAt)}
                </p>
              </div>
            </div>
          </article>

          <article className={styles.card}>
            <h2 className={styles.cardTitle}>Cuenta</h2>
            <DefList items={accountItems} columns={1} />
          </article>
        </div>

        <div className={styles.column}>
          <article className={styles.card}>
            <div className={styles.cardHeader}>
              <h2 className={styles.cardTitle}>Información personal</h2>
              {!isEditing && (
                <Button variant="outline" size="sm" onClick={startEdit}>
                  Editar
                </Button>
              )}
            </div>

            {draft !== null ? (
              <form className={styles.form} onSubmit={handleSubmit} noValidate>
                <Field
                  label="Nombre completo"
                  name="fullName"
                  required
                  value={draft.fullName}
                  onChange={(event) =>
                    setDraft({ ...draft, fullName: event.target.value })
                  }
                />
                <Field
                  label="Correo electrónico"
                  type="email"
                  name="email"
                  value={currentUser.email}
                  disabled
                  hint="El correo no se puede cambiar desde el perfil."
                />
                <Field
                  label="Teléfono"
                  name="phone"
                  required
                  value={draft.phone}
                  onChange={(event) =>
                    setDraft({ ...draft, phone: event.target.value })
                  }
                />
                <div className={styles.formActions}>
                  <Button variant="primary" type="submit" disabled={isSaving}>
                    {isSaving ? 'Guardando…' : 'Guardar cambios'}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={cancelEdit}
                    disabled={isSaving}
                  >
                    Cancelar
                  </Button>
                </div>
              </form>
            ) : (
              <DefList items={personalItems} />
            )}
          </article>

          <article className={styles.card}>
            <h2 className={styles.cardTitle}>Preferencias</h2>

            {!isTourist && (
              <p className={styles.note}>
                Las preferencias de categoría se guardan en cuentas de turista; tu
                cuenta no las usa para armar recomendaciones.
              </p>
            )}

            {isTourist && (
              <>
                <p className={styles.note}>
                  Marca las categorías que te gustan: pesan en el orden de tus
                  recomendaciones.
                </p>

                {isPreferencesLoading && (
                  <p className={styles.empty}>Cargando preferencias…</p>
                )}

                {!isPreferencesLoading &&
                  preferencesError === null &&
                  preferences.length === 0 && (
                    <p className={styles.empty}>
                      Aún no has marcado ninguna categoría.
                    </p>
                  )}

                {preferences.length > 0 && (
                  <ul className={styles.prefsList}>
                    {preferences.map((preference) => {
                      const name =
                        categoryNames.get(preference.categoryId) ?? 'Categoría'

                      return (
                        <li key={preference.categoryId} className={styles.prefRow}>
                          <span className={styles.prefName}>{name}</span>
                          <span className={styles.prefMeta}>
                            {PREFERENCE_SOURCE_LABEL[preference.source]}
                          </span>
                          <button
                            type="button"
                            className={styles.prefChip}
                            onClick={() => void removePreference(preference.categoryId)}
                            disabled={savingCategory === preference.categoryId}
                            aria-label={`Quitar ${name}`}
                          >
                            Quitar
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                )}

                {preferences.some((preference) => preference.source === 'INFERRED') && (
                  <p className={styles.note}>
                    Las deducidas salen de tus visitas y vuelven a aparecer si sigues
                    abriendo esa categoría.
                  </p>
                )}

                {availableCategories.length > 0 && (
                  <div className={styles.prefsForm}>
                    <SelectField
                      id="profile-pref-category"
                      aria-label="Añadir categoría"
                      placeholder="Selecciona una categoría…"
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
                      size="sm"
                      disabled={
                        selectedCategory === '' || savingCategory !== null
                      }
                      onClick={() => void handleAddPreference()}
                    >
                      Añadir
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
