import { useState } from 'react'
import type { FormEvent } from 'react'
import { Avatar } from '@/components/Avatar/Avatar'
import { Button } from '@/components/Button'
import { DefList } from '@/components/DefList/DefList'
import type { DefItem } from '@/components/DefList/DefList'
import { Field } from '@/components/FormField'
import { PageHeader } from '@/components/PageHeader/PageHeader'
import { StatusBadge } from '@/components/StatusBadge/StatusBadge'
import { ACCOUNT_STATUS_LABELS, ROLE_LABELS } from '@/config/roles'
import { useAuth } from '@/hooks/useAuth'
import { usersApi } from '@/services/usersApi'
import { describeApiError } from '@/utils/errors'
import { formatMonthYear } from '@/utils/format'
import styles from './profile.module.css'

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

  if (user === null) {
    return null
  }

  const currentUser = user
  const isEditing = draft !== null

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

  const preferenceItems: DefItem[] = [
    { label: 'Idioma', value: '—' },
    { label: 'Notificaciones', value: '—' },
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

      {error !== null && (
        <p className={`${styles.feedback} ${styles.error}`} role="alert">
          {error}
        </p>
      )}
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
            <DefList items={preferenceItems} />
            <p className={styles.note}>
              Ciudad, última sesión y preferencias aparecen vacías porque el
              backend todavía no las devuelve en el usuario.
            </p>
          </article>
        </div>
      </div>
    </section>
  )
}
