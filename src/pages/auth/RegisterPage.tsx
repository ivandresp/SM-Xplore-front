import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '@/components/Button'
import { Field, SelectField } from '@/components/FormField'
import { useAuth } from '@/hooks/useAuth'
import { isApiError } from '@/services/httpClient'
import type {
  RegisterProviderRequest,
  RegisterTouristRequest,
  UserRole,
} from '@/types'
import { describeApiError } from '@/utils/errors'
import { AuthShell } from './AuthShell'
import styles from './auth.module.css'

type AccountKind = Extract<UserRole, 'TOURIST' | 'SERVICE_PROVIDER'>

interface FormState {
  fullName: string
  email: string
  phone: string
  password: string
  // Turista
  dniType: string
  dniNumber: string
  nationality: string
  preferredLanguage: string
  birthDate: string
  // Prestadora
  nit: string
  businessType: string
  latitude: string
  longitude: string
  websiteUrl: string
  startOperationDate: string
}

const INITIAL_FORM: FormState = {
  fullName: '',
  email: '',
  phone: '',
  password: '',
  dniType: 'CC',
  dniNumber: '',
  nationality: '',
  preferredLanguage: '',
  birthDate: '',
  nit: '',
  businessType: '',
  latitude: '',
  longitude: '',
  websiteUrl: '',
  startOperationDate: '',
}

const ACCOUNT_OPTIONS = [
  { value: 'TOURIST', label: 'Turista' },
  { value: 'SERVICE_PROVIDER', label: 'Prestadora de servicios' },
]

const DNI_TYPE_OPTIONS = [
  { value: 'CC', label: 'Cédula de ciudadanía' },
  { value: 'CE', label: 'Cédula de extranjería' },
  { value: 'PA', label: 'Pasaporte' },
  { value: 'NIT', label: 'NIT' },
]

const LANGUAGE_OPTIONS = [
  { value: 'es', label: 'Español' },
  { value: 'en', label: 'Inglés' },
  { value: 'fr', label: 'Francés' },
]

function buildTouristPayload(form: FormState): RegisterTouristRequest {
  return {
    fullName: form.fullName.trim(),
    email: form.email.trim(),
    phone: form.phone.trim(),
    password: form.password,
    dniType: form.dniType,
    dniNumber: form.dniNumber.trim(),
    ...(form.nationality !== '' && { nationality: form.nationality.trim() }),
    ...(form.preferredLanguage !== '' && {
      preferredLanguage: form.preferredLanguage,
    }),
    ...(form.birthDate !== '' && { birthDate: form.birthDate }),
  }
}

function buildProviderPayload(form: FormState): RegisterProviderRequest {
  return {
    fullName: form.fullName.trim(),
    email: form.email.trim(),
    phone: form.phone.trim(),
    password: form.password,
    nit: form.nit.trim(),
    ...(form.businessType !== '' && { businessType: form.businessType.trim() }),
    ...(form.latitude !== '' && { latitude: Number(form.latitude) }),
    ...(form.longitude !== '' && { longitude: Number(form.longitude) }),
    ...(form.websiteUrl !== '' && { websiteUrl: form.websiteUrl.trim() }),
    ...(form.startOperationDate !== '' && {
      startOperationDate: form.startOperationDate,
    }),
  }
}

function validate(kind: AccountKind, form: FormState): string | null {
  if (form.fullName.trim() === '') return 'Escribe tu nombre completo.'
  if (form.email.trim() === '') return 'Escribe tu correo electrónico.'
  if (form.phone.trim() === '') return 'Escribe tu teléfono.'
  if (form.password.length < 12) {
    return 'La contraseña debe tener entre 12 y 72 caracteres.'
  }

  if (kind === 'TOURIST' && form.dniNumber.trim() === '') {
    return 'Escribe el número de documento.'
  }

  if (kind === 'SERVICE_PROVIDER' && form.nit.trim() === '') {
    return 'Escribe el NIT de la empresa.'
  }

  return null
}

function describeRegisterError(error: unknown): string {
  if (!isApiError(error)) {
    return 'No se pudo conectar con el backend. Verifica que el gateway esté corriendo en http://127.0.0.1:8088.'
  }

  if (error.code === 'EMAIL_ALREADY_EXISTS') {
    return 'Ya existe una cuenta con ese correo electrónico.'
  }

  if (error.code === 'VALIDATION_ERROR') {
    const fields = Object.values(error.fieldErrors ?? {})
    return fields.length > 0
      ? `Revisa los datos: ${fields.join(' ')}`
      : 'Revisa los datos enviados.'
  }

  return describeApiError(error)
}

export default function RegisterPage() {
  const { registerTourist, registerProvider } = useAuth()
  const navigate = useNavigate()

  const [kind, setKind] = useState<AccountKind>('TOURIST')
  const [form, setForm] = useState<FormState>(INITIAL_FORM)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [createdEmail, setCreatedEmail] = useState<string | null>(null)

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    const validationError = validate(kind, form)
    if (validationError !== null) {
      setError(validationError)
      return
    }

    setIsSubmitting(true)

    try {
      if (kind === 'TOURIST') {
        // El turista nace activo: se inicia sesión y entra al catálogo.
        const session = await registerTourist(buildTouristPayload(form))
        navigate(session === null ? '/login' : '/explorar', { replace: true })
      } else {
        await registerProvider(buildProviderPayload(form))
        setCreatedEmail(form.email.trim())
      }
    } catch (cause) {
      setError(describeRegisterError(cause))
    } finally {
      setIsSubmitting(false)
    }
  }

  if (createdEmail !== null) {
    return (
      <AuthShell
        title="Solicitud enviada"
        subtitle="Tu prestadora quedó registrada y está pendiente de revisión."
        footer={
          <p>
            <Link to="/login">Ir a iniciar sesión</Link>
          </p>
        }
      >
        <p className={styles.notice}>
          Un administrador debe aprobar el registro de {createdEmail} antes de
          que puedas iniciar sesión.
        </p>
      </AuthShell>
    )
  }

  const isTourist = kind === 'TOURIST'

  return (
    <AuthShell
      title="Crear cuenta"
      subtitle="Regístrate como turista o como prestadora de servicios."
      footer={
        <p>
          ¿Ya tienes cuenta? <Link to="/login">Inicia sesión</Link>
        </p>
      }
    >
      <form className={styles.form} onSubmit={handleSubmit} noValidate>
        {error !== null && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}

        <SelectField
          label="Tipo de cuenta"
          name="kind"
          options={ACCOUNT_OPTIONS}
          value={kind}
          onChange={(event) => {
            setKind(event.target.value as AccountKind)
            setError(null)
          }}
        />

        <Field
          label="Nombre completo"
          name="fullName"
          autoComplete="name"
          required
          value={form.fullName}
          onChange={(event) => update('fullName', event.target.value)}
        />

        <div className={styles.grid}>
          <Field
            label="Correo electrónico"
            type="email"
            name="email"
            autoComplete="email"
            required
            value={form.email}
            onChange={(event) => update('email', event.target.value)}
          />
          <Field
            label="Teléfono"
            name="phone"
            autoComplete="tel"
            required
            hint="Entre 7 y 20 dígitos; admite +, (), - y espacios."
            value={form.phone}
            onChange={(event) => update('phone', event.target.value)}
          />
        </div>

        <Field
          label="Contraseña"
          type="password"
          name="password"
          autoComplete="new-password"
          required
          hint="Entre 12 y 72 caracteres."
          value={form.password}
          onChange={(event) => update('password', event.target.value)}
        />

        {isTourist ? (
          <>
            <p className={styles.groupTitle}>Documento</p>
            <div className={styles.grid}>
              <SelectField
                label="Tipo de documento"
                name="dniType"
                required
                options={DNI_TYPE_OPTIONS}
                value={form.dniType}
                onChange={(event) => update('dniType', event.target.value)}
              />
              <Field
                label="Número de documento"
                name="dniNumber"
                required
                value={form.dniNumber}
                onChange={(event) => update('dniNumber', event.target.value)}
              />
            </div>

            <div className={styles.grid}>
              <Field
                label="Nacionalidad"
                name="nationality"
                value={form.nationality}
                onChange={(event) => update('nationality', event.target.value)}
              />
              <SelectField
                label="Idioma preferido"
                name="preferredLanguage"
                options={[
                  { value: '', label: 'Sin especificar' },
                  ...LANGUAGE_OPTIONS,
                ]}
                value={form.preferredLanguage}
                onChange={(event) =>
                  update('preferredLanguage', event.target.value)
                }
              />
            </div>

            <Field
              label="Fecha de nacimiento"
              type="date"
              name="birthDate"
              value={form.birthDate}
              onChange={(event) => update('birthDate', event.target.value)}
            />
          </>
        ) : (
          <>
            <p className={styles.groupTitle}>Empresa</p>
            <Field
              label="NIT"
              name="nit"
              required
              hint="Solo números y guiones, entre 6 y 30 caracteres."
              value={form.nit}
              onChange={(event) => update('nit', event.target.value)}
            />
            <Field
              label="Tipo de negocio"
              name="businessType"
              hint="Alojamiento, transporte, alimentación..."
              value={form.businessType}
              onChange={(event) => update('businessType', event.target.value)}
            />
            <div className={styles.grid}>
              <Field
                label="Latitud"
                name="latitude"
                inputMode="decimal"
                value={form.latitude}
                onChange={(event) => update('latitude', event.target.value)}
              />
              <Field
                label="Longitud"
                name="longitude"
                inputMode="decimal"
                value={form.longitude}
                onChange={(event) => update('longitude', event.target.value)}
              />
            </div>
            <Field
              label="Sitio web"
              type="url"
              name="websiteUrl"
              value={form.websiteUrl}
              onChange={(event) => update('websiteUrl', event.target.value)}
            />
            <Field
              label="Fecha de inicio de operación"
              type="date"
              name="startOperationDate"
              value={form.startOperationDate}
              onChange={(event) =>
                update('startOperationDate', event.target.value)
              }
            />
          </>
        )}

        <Button
          className={styles.submit}
          type="submit"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Creando cuenta…' : 'Crear cuenta'}
        </Button>
      </form>
    </AuthShell>
  )
}
