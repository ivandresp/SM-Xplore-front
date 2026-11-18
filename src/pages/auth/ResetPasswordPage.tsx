import { useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { BackButton } from '@/components/BackButton'
import { useMessageState } from '@/hooks/useMessageState'
import { translate as t } from '@/i18n/language'
import { useLanguage } from '@/hooks/useLanguage'
import { Button } from '@/components/Button'
import { Field } from '@/components/FormField'
import { useFormValidation } from '@/hooks/useFormValidation'
import { authApi } from '@/services/authApi'
import { isApiError } from '@/services/httpClient'
import { describeApiError } from '@/utils/errors'
import { AuthShell } from './AuthShell'
import styles from './auth.module.css'

type ResetField = 'newPassword' | 'confirmation'

const LABELS: Record<ResetField, string> = {
  get newPassword() { return t("Nueva contraseña") },
  get confirmation() { return t("Confirmar contraseña") },
}

const ORDER = ['newPassword', 'confirmation'] as const

/**
 * Destino del enlace que envía `POST /auth/forgot-password`:
 * `http://localhost:5173/reset-password?token=...` (lo arma ms-01).
 */
export default function ResetPasswordPage() {
  useLanguage()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  const formRef = useRef<HTMLFormElement>(null)

  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [error, setError] = useMessageState<string | null>(null)
  const [isDone, setIsDone] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useFormValidation({
    values: { password, confirmation },
    validate: (values) => ({
      ...(values.password.length < 12 || values.password.length > 72
        ? { newPassword: t("Entre 12 y 72 caracteres.") }
        : {}),
      ...(values.confirmation !== values.password
        ? { confirmation: t("Las contraseñas no coinciden.") }
        : {}),
    }),
    labels: LABELS,
    order: ORDER,
    formRef,
  })

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    if (form.blocked()) {
      return
    }
    setIsSubmitting(true)

    try {
      await authApi.resetPassword({ token: token ?? '', newPassword: password })
      setIsDone(true)
    } catch (cause) {
      if (form.applyValidationErrors(cause)) {
        return
      }
      if (isApiError(cause) && cause.code === 'INVALID_RESET_TOKEN') {
        setError(() => t("El enlace no es válido o ya expiró. Solicita uno nuevo."))
      } else if (isApiError(cause)) {
        setError(() => describeApiError(cause))
      } else {
        setError(
          () => t("No pudimos conectar con el servidor. Revisa tu conexión e inténtalo de nuevo."),
        )
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  if (token === null) {
    return (
      <AuthShell
        title={t("Enlace no válido")}
        subtitle={t("Este enlace no trae el token de recuperación.")}
        footer={
          <p>
            <BackButton to="/login" />
          </p>
        }
      >
        <p className={styles.notice}>
          {t("Abre el enlace del correo que te enviamos o solicítalo de nuevo desde «¿Olvidaste tu contraseña?».")}</p>
      </AuthShell>
    )
  }

  if (isDone) {
    return (
      <AuthShell
        title={t("Contraseña actualizada")}
        subtitle={t("Ya puedes ingresar con tu nueva contraseña.")}
        footer={
          <p>
            <Link to="/login">{t("Iniciar sesión")}</Link>
          </p>
        }
      >
        <p className={styles.notice}>
          {t("Ya puedes iniciar sesión con tu contraseña nueva.")}</p>
      </AuthShell>
    )
  }

  return (
    <AuthShell
      title={t("Nueva contraseña")}
      subtitle={t("Define la contraseña de tu cuenta de SM-Xplore.")}
      footer={
        <p>
          <BackButton to="/login" />
        </p>
      }
    >
      <form className={styles.form} onSubmit={handleSubmit} noValidate ref={formRef}>
        {error !== null && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}
        {error === null && form.summary !== null && (
          <p className={styles.error} role="alert">
            {form.summary}
          </p>
        )}

        <Field
          label={t("Nueva contraseña")}
          type="password"
          name="newPassword"
          autoComplete="new-password"
          required
          hint={t("Entre 12 y 72 caracteres.")}
          value={password}
          error={form.errorOf('newPassword')}
          onChange={(event) => setPassword(event.target.value)}
          onBlur={() => form.markTouched('newPassword')}
        />

        <Field
          label={t("Confirmar contraseña")}
          type="password"
          name="confirmation"
          autoComplete="new-password"
          required
          value={confirmation}
          error={form.errorOf('confirmation')}
          onChange={(event) => setConfirmation(event.target.value)}
          onBlur={() => form.markTouched('confirmation')}
        />

        <Button
          className={styles.submit}
          variant="primary"
          size="lg"
          type="submit"
          loading={isSubmitting}
        >
          {t("Guardar contraseña")}</Button>
      </form>
    </AuthShell>
  )
}
