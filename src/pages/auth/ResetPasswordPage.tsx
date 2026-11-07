import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Button } from '@/components/Button'
import { Field } from '@/components/FormField'
import { authApi } from '@/services/authApi'
import { isApiError } from '@/services/httpClient'
import { AuthShell } from './AuthShell'
import styles from './auth.module.css'

/**
 * Destino del enlace que envía `POST /auth/forgot-password`:
 * `http://localhost:5173/reset-password?token=...` (lo arma ms-01).
 */
export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')

  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isDone, setIsDone] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    if (password.length < 12) {
      setError('La contraseña debe tener al menos 12 caracteres.')
      return
    }

    if (password !== confirmation) {
      setError('Las contraseñas no coinciden.')
      return
    }

    setIsSubmitting(true)

    try {
      await authApi.resetPassword({ token: token ?? '', newPassword: password })
      setIsDone(true)
    } catch (cause) {
      if (isApiError(cause) && cause.code === 'INVALID_RESET_TOKEN') {
        setError('El enlace no es válido o ya expiró. Solicita uno nuevo.')
      } else if (isApiError(cause)) {
        setError(cause.message)
      } else {
        setError(
          'No se pudo conectar con el backend. Verifica que el gateway esté corriendo en http://127.0.0.1:8088.',
        )
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  if (token === null) {
    return (
      <AuthShell
        title="Enlace no válido"
        subtitle="Este enlace no trae el token de recuperación."
        footer={
          <p>
            <Link to="/login">Volver a iniciar sesión</Link>
          </p>
        }
      >
        <p className={styles.notice}>
          Abre el enlace del correo que te enviamos o solicítalo de nuevo desde
          «¿Olvidaste tu contraseña?».
        </p>
      </AuthShell>
    )
  }

  if (isDone) {
    return (
      <AuthShell
        title="Contraseña actualizada"
        subtitle="Ya puedes ingresar con tu nueva contraseña."
        footer={
          <p>
            <Link to="/login">Iniciar sesión</Link>
          </p>
        }
      >
        <p className={styles.notice}>
          Ya puedes iniciar sesión con tu contraseña nueva.
        </p>
      </AuthShell>
    )
  }

  return (
    <AuthShell
      title="Nueva contraseña"
      subtitle="Define la contraseña de tu cuenta de SM-Xplore."
      footer={
        <p>
          <Link to="/login">Volver a iniciar sesión</Link>
        </p>
      }
    >
      <form className={styles.form} onSubmit={handleSubmit} noValidate>
        {error !== null && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}

        <Field
          label="Nueva contraseña"
          type="password"
          name="newPassword"
          autoComplete="new-password"
          required
          hint="Entre 12 y 72 caracteres."
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />

        <Field
          label="Confirmar contraseña"
          type="password"
          name="confirmation"
          autoComplete="new-password"
          required
          value={confirmation}
          onChange={(event) => setConfirmation(event.target.value)}
        />

        <Button
          className={styles.submit}
          variant="primary"
          size="lg"
          type="submit"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Guardando…' : 'Guardar contraseña'}
        </Button>
      </form>
    </AuthShell>
  )
}
