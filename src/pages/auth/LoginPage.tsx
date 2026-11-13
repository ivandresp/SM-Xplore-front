import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Button } from '@/components/Button'
import { Field } from '@/components/FormField'
import { useAuth } from '@/hooks/useAuth'
import { authApi } from '@/services/authApi'
import { isApiError } from '@/services/httpClient'
import type { AuthUser } from '@/types'
import { describeApiError } from '@/utils/errors'
import { AuthShell } from './AuthShell'
import styles from './auth.module.css'

interface FromState {
  from?: { pathname?: string }
}

/** Mensajes por `code` del `ProblemDetail`; el status queda de respaldo. */
function describeAuthError(error: unknown): string {
  if (!isApiError(error)) {
    return 'No pudimos conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.'
  }

  switch (error.code) {
    case 'INVALID_CREDENTIALS':
      return 'Correo o contraseña incorrectos. Intenta de nuevo.'
    case 'ACCOUNT_NOT_ACTIVE':
      return 'La cuenta no está activa: las prestadoras deben esperar la aprobación de un administrador.'
    case 'TOO_MANY_ATTEMPTS':
      return `Demasiados intentos. Espera ${error.payload?.retryAfterSeconds ?? 60} segundos antes de volver a intentar.`
    case 'INVALID_MFA_CODE':
      return 'El código no es válido. Revisa la app de autenticación e intenta otra vez.'
    case 'INVALID_MFA_CHALLENGE':
      return 'La verificación expiró. Vuelve a iniciar sesión.'
    case 'MFA_ENROLLMENT_REQUIRED':
      return 'Tu cuenta necesita activar la verificación en dos pasos antes de continuar.'
    case 'VALIDATION_ERROR': {
      const fields = Object.values(error.fieldErrors ?? {})
      return fields.length > 0
        ? `Revisa los datos: ${fields.join(' ')}`
        : 'Revisa los datos enviados.'
    }
    default:
      return describeApiError(error)
  }
}

export default function LoginPage() {
  const { login, completeMfa, cancelMfa, mfaChallenge } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isRecovering, setIsRecovering] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const state = location.state as FromState | null

  function enter(user: AuthUser) {
    // El turista vive en el catálogo público; los demás roles, en el panel.
    navigate(
      state?.from?.pathname ?? (user.role === 'TOURIST' ? '/explorar' : '/app'),
      { replace: true },
    )
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setNotice(null)
    setIsSubmitting(true)

    try {
      const authenticated = await login({ email: email.trim(), password })
      if (authenticated !== null) {
        enter(authenticated)
      }
      // Si devuelve `null`, la cuenta pide MFA: se muestra el paso del código.
    } catch (cause) {
      setError(describeAuthError(cause))
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleVerify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setIsSubmitting(true)

    try {
      enter(await completeMfa(code.trim()))
    } catch (cause) {
      setError(describeAuthError(cause))
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleRecover(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setNotice(null)
    setIsSubmitting(true)

    try {
      // El backend responde 202 incluso si el correo no existe.
      await authApi.forgotPassword({ email: email.trim() })
      setIsRecovering(false)
      setNotice(
        'Si el correo está registrado, recibirás un enlace para restablecer tu contraseña.',
      )
    } catch (cause) {
      setError(describeAuthError(cause))
    } finally {
      setIsSubmitting(false)
    }
  }

  if (mfaChallenge !== null) {
    return (
      <AuthShell
        title="Verificación en dos pasos"
        subtitle="Escribe el código de seis dígitos de tu app de autenticación."
        footer={
          <p>
            <button type="button" className={styles.link} onClick={cancelMfa}>
              Volver a iniciar sesión
            </button>
          </p>
        }
      >
        <form className={styles.form} onSubmit={handleVerify} noValidate>
          <Field
            label="Código de verificación"
            name="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            required
            value={code}
            onChange={(event) => setCode(event.target.value)}
          />

          <Button
            className={styles.submit}
            variant="primary"
            size="lg"
            type="submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Verificando…' : 'Verificar'}
          </Button>

          <div className={styles.messages}>
            {error !== null && (
              <p className={styles.error} role="alert">
                {error}
              </p>
            )}
          </div>
        </form>
      </AuthShell>
    )
  }

  if (isRecovering) {
    return (
      <AuthShell
        title="Recuperar contraseña"
        subtitle="Escribe el correo de tu cuenta y te enviaremos las instrucciones."
        footer={
          <p>
            <button
              type="button"
              className={styles.link}
              onClick={() => setIsRecovering(false)}
            >
              Volver a iniciar sesión
            </button>
          </p>
        }
      >
        <form className={styles.form} onSubmit={handleRecover} noValidate>
          <Field
            label="Correo electrónico"
            type="email"
            name="email"
            autoComplete="email"
            placeholder="laura.m@correo.com"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />

          <Button
            className={styles.submit}
            variant="primary"
            size="lg"
            type="submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Enviando…' : 'Enviar instrucciones'}
          </Button>

          <div className={styles.messages}>
            {error !== null && (
              <p className={styles.error} role="alert">
                {error}
              </p>
            )}
          </div>
        </form>
      </AuthShell>
    )
  }

  return (
    <AuthShell
      title="Iniciar sesión"
      subtitle="Ingresa con tu cuenta de SM-Xplore."
      footer={
        <p>
          ¿No tienes cuenta? <Link to="/registro">Crear cuenta</Link>
        </p>
      }
    >
      <form className={styles.form} onSubmit={handleSubmit} noValidate>
        <Field
          label="Correo electrónico"
          type="email"
          name="email"
          autoComplete="email"
          placeholder="laura.m@correo.com"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />

        <Field
          label="Contraseña"
          type={showPassword ? 'text' : 'password'}
          name="password"
          autoComplete="current-password"
          placeholder="••••••••••"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          trailing={
            <button
              type="button"
              className={styles.linkAccent}
              onClick={() => setShowPassword((current) => !current)}
            >
              {showPassword ? 'Ocultar' : 'Mostrar'}
            </button>
          }
        />

        <div className={styles.row}>
          <button
            type="button"
            className={styles.link}
            onClick={() => {
              setIsRecovering(true)
              setError(null)
              setNotice(null)
            }}
          >
            ¿Olvidaste tu contraseña?
          </button>
        </div>

        <Button
          className={styles.submit}
          variant="primary"
          size="lg"
          type="submit"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Ingresando…' : 'Iniciar sesión'}
        </Button>

        <div className={styles.messages}>
          {error !== null && (
            <p className={styles.error} role="alert">
              {error}
            </p>
          )}
          {notice !== null && <p className={styles.notice}>{notice}</p>}
        </div>
      </form>
    </AuthShell>
  )
}
