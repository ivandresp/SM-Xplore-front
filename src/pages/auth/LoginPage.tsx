import { useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Button } from '@/components/Button'
import { Field } from '@/components/FormField'
import { useAuth } from '@/hooks/useAuth'
import { useFormValidation } from '@/hooks/useFormValidation'
import { authApi } from '@/services/authApi'
import { isApiError } from '@/services/httpClient'
import { describeApiError } from '@/utils/errors'
import type { AuthUser } from '@/types'
import { AuthShell } from './AuthShell'
import styles from './auth.module.css'

interface FromState {
  from?: { pathname?: string }
}

type LoginField = 'email' | 'password' | 'code'

const LABELS: Record<LoginField, string> = {
  email: 'Correo',
  password: 'Contraseña',
  code: 'Código',
}

const ORDER = ['email', 'password', 'code'] as const

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

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
    case 'VALIDATION_ERROR':
      // El detalle por campo lo pinta el formulario; el texto del backend
      // viene en inglés y nunca se muestra.
      return 'Revisa los datos enviados.'
    default:
      return describeApiError(error)
  }
}

export default function LoginPage() {
  const { login, completeMfa, cancelMfa, mfaChallenge } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const formRef = useRef<HTMLFormElement>(null)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isRecovering, setIsRecovering] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const state = location.state as FromState | null

  const form = useFormValidation({
    values: { email, password, code },
    validate: (values) => {
      if (mfaChallenge !== null) {
        return /^\d{6}$/.test(values.code.trim())
          ? {}
          : { code: 'Escribe los seis dígitos del código.' }
      }
      if (isRecovering) {
        return EMAIL.test(values.email.trim())
          ? {}
          : { email: 'Escribe un correo válido, con @ y dominio.' }
      }
      return {
        ...(EMAIL.test(values.email.trim())
          ? {}
          : { email: 'Escribe un correo válido, con @ y dominio.' }),
        ...(values.password === ''
          ? { password: 'Escribe tu contraseña.' }
          : {}),
      }
    },
    labels: LABELS,
    order: ORDER,
    formRef,
  })

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
    if (form.blocked()) {
      return
    }
    setIsSubmitting(true)

    try {
      const authenticated = await login({ email: email.trim(), password })
      if (authenticated !== null) {
        enter(authenticated)
      }
      // Si devuelve `null`, la cuenta pide MFA: se muestra el paso del código.
    } catch (cause) {
      if (!form.applyValidationErrors(cause)) {
        setError(describeAuthError(cause))
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleVerify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    if (form.blocked()) {
      return
    }
    setIsSubmitting(true)

    try {
      enter(await completeMfa(code.trim()))
    } catch (cause) {
      if (!form.applyValidationErrors(cause)) {
        setError(describeAuthError(cause))
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleRecover(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setNotice(null)
    if (form.blocked()) {
      return
    }
    setIsSubmitting(true)

    try {
      // El backend responde 202 incluso si el correo no existe.
      await authApi.forgotPassword({ email: email.trim() })
      setIsRecovering(false)
      form.clear()
      setNotice(
        'Si el correo está registrado, recibirás un enlace para restablecer tu contraseña.',
      )
    } catch (cause) {
      if (!form.applyValidationErrors(cause)) {
        setError(describeAuthError(cause))
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const messages = (
    <div className={styles.messages}>
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
      {notice !== null && <p className={styles.notice}>{notice}</p>}
    </div>
  )

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
        <form className={styles.form} onSubmit={handleVerify} noValidate ref={formRef}>
          <Field
            label="Código de verificación"
            name="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            required
            value={code}
            error={form.errorOf('code')}
            onChange={(event) => setCode(event.target.value)}
            onBlur={() => form.markTouched('code')}
          />

          <Button
            className={styles.submit}
            variant="primary"
            size="lg"
            type="submit"
            loading={isSubmitting}
          >
            Verificar
          </Button>

          {messages}
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
              onClick={() => {
                setIsRecovering(false)
                form.clear()
                setError(null)
              }}
            >
              Volver a iniciar sesión
            </button>
          </p>
        }
      >
        <form className={styles.form} onSubmit={handleRecover} noValidate ref={formRef}>
          <Field
            label="Correo electrónico"
            type="email"
            name="email"
            autoComplete="email"
            placeholder="laura.m@correo.com"
            required
            value={email}
            error={form.errorOf('email')}
            onChange={(event) => setEmail(event.target.value)}
            onBlur={() => form.markTouched('email')}
          />

          <Button
            className={styles.submit}
            variant="primary"
            size="lg"
            type="submit"
            loading={isSubmitting}
          >
            Enviar instrucciones
          </Button>

          {messages}
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
      <form className={styles.form} onSubmit={handleSubmit} noValidate ref={formRef}>
        <Field
          label="Correo electrónico"
          type="email"
          name="email"
          autoComplete="email"
          placeholder="laura.m@correo.com"
          required
          value={email}
          error={form.errorOf('email')}
          onChange={(event) => setEmail(event.target.value)}
          onBlur={() => form.markTouched('email')}
        />

        <Field
          label="Contraseña"
          type={showPassword ? 'text' : 'password'}
          name="password"
          autoComplete="current-password"
          placeholder="••••••••••"
          required
          value={password}
          error={form.errorOf('password')}
          onChange={(event) => setPassword(event.target.value)}
          onBlur={() => form.markTouched('password')}
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
              form.clear()
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
          loading={isSubmitting}
        >
          Iniciar sesión
        </Button>

        {messages}
      </form>
    </AuthShell>
  )
}
