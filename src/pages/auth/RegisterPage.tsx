import { useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '@/components/Button'
import { Field, SelectField } from '@/components/FormField'
import { useAuth } from '@/hooks/useAuth'
import { isApiError } from '@/services/httpClient'
import type {
  RegisterProviderRequest,
  RegisterTouristRequest,
} from '@/types'
import { classNames } from '@/utils/format'
import { describeApiError } from '@/utils/errors'
import { AuthShell } from './AuthShell'
import {
  FIELD_ORDER,
  fieldLabel,
  firstInvalidField,
  mapServerFieldErrors,
  normalizePhone,
  passwordChecks,
  validateRegisterForm,
} from './registerValidation'
import type {
  AccountKind,
  FieldErrors,
  RegisterFieldKey,
  RegisterFormValues,
} from './registerValidation'
import styles from './auth.module.css'

const INITIAL_FORM: RegisterFormValues = {
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

const PASSWORD_CHECKLIST_ID = 'password-requirements'

function buildTouristPayload(values: RegisterFormValues): RegisterTouristRequest {
  return {
    fullName: values.fullName.trim(),
    email: values.email.trim(),
    phone: normalizePhone(values.phone),
    password: values.password,
    dniType: values.dniType,
    dniNumber: values.dniNumber.trim(),
    ...(values.nationality !== '' && { nationality: values.nationality.trim() }),
    ...(values.preferredLanguage !== '' && {
      preferredLanguage: values.preferredLanguage,
    }),
    ...(values.birthDate !== '' && { birthDate: values.birthDate }),
  }
}

function buildProviderPayload(
  values: RegisterFormValues,
): RegisterProviderRequest {
  return {
    fullName: values.fullName.trim(),
    email: values.email.trim(),
    phone: normalizePhone(values.phone),
    password: values.password,
    nit: values.nit.trim(),
    ...(values.businessType !== '' && {
      businessType: values.businessType.trim(),
    }),
    ...(values.latitude !== '' && { latitude: Number(values.latitude) }),
    ...(values.longitude !== '' && { longitude: Number(values.longitude) }),
    ...(values.websiteUrl !== '' && { websiteUrl: values.websiteUrl.trim() }),
    ...(values.startOperationDate !== '' && {
      startOperationDate: values.startOperationDate,
    }),
  }
}

/** Resumen del formulario: nombra los campos, sin inventar el detalle de cada uno. */
function summaryMessage(errors: FieldErrors): string {
  const labels = FIELD_ORDER.filter(
    (field) => errors[field] !== undefined,
  ).map(fieldLabel)
  return `Revisa los datos: ${labels.join(', ')}.`
}

export default function RegisterPage() {
  const { registerTourist, registerProvider } = useAuth()
  const navigate = useNavigate()
  const formRef = useRef<HTMLFormElement>(null)

  const [kind, setKind] = useState<AccountKind>('TOURIST')
  const [values, setValues] = useState<RegisterFormValues>(INITIAL_FORM)
  const [touched, setTouched] = useState<
    Partial<Record<RegisterFieldKey, boolean>>
  >({})
  const [submitAttempted, setSubmitAttempted] = useState(false)
  const [serverErrors, setServerErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [createdEmail, setCreatedEmail] = useState<string | null>(null)

  const clientErrors = validateRegisterForm(kind, values)
  const checks = passwordChecks(values.password)

  function update<K extends RegisterFieldKey>(
    key: K,
    value: RegisterFormValues[K],
  ) {
    setValues((current) => ({ ...current, [key]: value }))
    if (serverErrors[key] !== undefined) {
      setServerErrors((current) => ({ ...current, [key]: undefined }))
    }
    if (formError !== null) {
      setFormError(null)
    }
  }

  function markTouched(key: RegisterFieldKey) {
    setTouched((current) => ({ ...current, [key]: true }))
  }

  /**
   * Un campo muestra su error cuando ya se visitó o cuando se intentó enviar;
   * los errores del servidor se ven siempre porque no dependen del tecleo.
   */
  function errorFor(key: RegisterFieldKey): string | undefined {
    if (serverErrors[key] !== undefined) {
      return serverErrors[key]
    }
    if (submitAttempted || touched[key] === true) {
      return clientErrors[key]
    }
    return undefined
  }

  function focusField(key: RegisterFieldKey) {
    formRef.current
      ?.querySelector<HTMLElement>(`[name="${key}"]`)
      ?.focus()
  }

  function handleRegisterError(cause: unknown) {
    if (isApiError(cause) && cause.code === 'EMAIL_ALREADY_EXISTS') {
      const message =
        'Ya existe una cuenta con ese correo. Inicia sesión o usa otro correo.'
      setServerErrors({ email: message })
      setFormError(message)
      focusField('email')
      return
    }

    if (isApiError(cause) && cause.code === 'VALIDATION_ERROR') {
      const { fields } = mapServerFieldErrors(cause.fieldErrors)
      setServerErrors(fields)
      const mapped = FIELD_ORDER.filter(
        (field) => fields[field] !== undefined,
      )
      if (mapped.length > 0) {
        setFormError(summaryMessage(fields))
        focusField(mapped[0])
        return
      }
    }

    setFormError(describeApiError(cause))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError(null)
    setSubmitAttempted(true)

    const blocked = firstInvalidField(kind, values)
    if (blocked !== null) {
      setFormError(summaryMessage(clientErrors))
      focusField(blocked)
      return
    }

    setIsSubmitting(true)

    try {
      if (kind === 'TOURIST') {
        // El turista nace activo: se inicia sesión y entra al catálogo.
        const session = await registerTourist(buildTouristPayload(values))
        navigate(session === null ? '/login' : '/explorar', { replace: true })
      } else {
        await registerProvider(buildProviderPayload(values))
        setCreatedEmail(values.email.trim())
      }
    } catch (cause) {
      handleRegisterError(cause)
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
      <form
        className={styles.form}
        onSubmit={handleSubmit}
        noValidate
        ref={formRef}
      >
        {formError !== null && (
          <p className={styles.error} role="alert">
            {formError}
          </p>
        )}

        <SelectField
          label="Tipo de cuenta"
          name="kind"
          options={ACCOUNT_OPTIONS}
          value={kind}
          onChange={(event) => {
            setKind(event.target.value as AccountKind)
            setTouched({})
            setSubmitAttempted(false)
            setServerErrors({})
            setFormError(null)
          }}
        />

        <Field
          label="Nombre completo"
          name="fullName"
          autoComplete="name"
          required
          value={values.fullName}
          error={errorFor('fullName')}
          onChange={(event) => update('fullName', event.target.value)}
          onBlur={() => markTouched('fullName')}
        />

        <div className={styles.grid}>
          <Field
            label="Correo electrónico"
            type="email"
            name="email"
            autoComplete="email"
            spellCheck={false}
            required
            value={values.email}
            error={errorFor('email')}
            onChange={(event) => update('email', event.target.value)}
            onBlur={() => markTouched('email')}
          />
          <Field
            label="Teléfono"
            type="tel"
            inputMode="tel"
            name="phone"
            autoComplete="tel"
            required
            hint="Ejemplo: +57 300 123 4567. El +57 es opcional."
            value={values.phone}
            error={errorFor('phone')}
            onChange={(event) => update('phone', event.target.value)}
            onBlur={() => markTouched('phone')}
          />
        </div>

        <div className={styles.fieldGroup}>
          <Field
            label="Contraseña"
            type="password"
            name="password"
            autoComplete="new-password"
            spellCheck={false}
            required
            aria-describedby={PASSWORD_CHECKLIST_ID}
            value={values.password}
            error={errorFor('password')}
            onChange={(event) => update('password', event.target.value)}
            onBlur={() => markTouched('password')}
          />
          <ul
            className={styles.checklist}
            id={PASSWORD_CHECKLIST_ID}
            aria-label="Requisitos de la contraseña"
            aria-live="polite"
          >
            {checks.map((check) => (
              <li
                key={check.id}
                className={classNames(
                  styles.checklistItem,
                  check.met ? styles.checklistMet : styles.checklistPending,
                )}
              >
                <span aria-hidden="true">{check.met ? '✓' : '•'}</span>
                <span>{check.label}</span>
                <span className={styles.checkStatus}>
                  {check.met ? 'Cumple' : 'Falta'}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {isTourist ? (
          <>
            <p className={styles.groupTitle}>Documento</p>
            <div className={styles.grid}>
              <SelectField
                label="Tipo de documento"
                name="dniType"
                required
                options={DNI_TYPE_OPTIONS}
                value={values.dniType}
                error={errorFor('dniType')}
                onChange={(event) => update('dniType', event.target.value)}
                onBlur={() => markTouched('dniType')}
              />
              <Field
                label="Número de documento"
                name="dniNumber"
                required
                value={values.dniNumber}
                error={errorFor('dniNumber')}
                onChange={(event) => update('dniNumber', event.target.value)}
                onBlur={() => markTouched('dniNumber')}
              />
            </div>

            <div className={styles.grid}>
              <Field
                label="Nacionalidad"
                name="nationality"
                value={values.nationality}
                error={errorFor('nationality')}
                onChange={(event) => update('nationality', event.target.value)}
                onBlur={() => markTouched('nationality')}
              />
              <SelectField
                label="Idioma preferido"
                name="preferredLanguage"
                options={[
                  { value: '', label: 'Sin especificar' },
                  ...LANGUAGE_OPTIONS,
                ]}
                value={values.preferredLanguage}
                error={errorFor('preferredLanguage')}
                onChange={(event) =>
                  update('preferredLanguage', event.target.value)
                }
                onBlur={() => markTouched('preferredLanguage')}
              />
            </div>

            <Field
              label="Fecha de nacimiento"
              type="date"
              name="birthDate"
              value={values.birthDate}
              error={errorFor('birthDate')}
              onChange={(event) => update('birthDate', event.target.value)}
              onBlur={() => markTouched('birthDate')}
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
              value={values.nit}
              error={errorFor('nit')}
              onChange={(event) => update('nit', event.target.value)}
              onBlur={() => markTouched('nit')}
            />
            <Field
              label="Tipo de negocio"
              name="businessType"
              hint="Alojamiento, transporte, alimentación…"
              value={values.businessType}
              error={errorFor('businessType')}
              onChange={(event) => update('businessType', event.target.value)}
              onBlur={() => markTouched('businessType')}
            />
            <div className={styles.grid}>
              <Field
                label="Latitud"
                name="latitude"
                inputMode="decimal"
                value={values.latitude}
                error={errorFor('latitude')}
                onChange={(event) => update('latitude', event.target.value)}
                onBlur={() => markTouched('latitude')}
              />
              <Field
                label="Longitud"
                name="longitude"
                inputMode="decimal"
                value={values.longitude}
                error={errorFor('longitude')}
                onChange={(event) => update('longitude', event.target.value)}
                onBlur={() => markTouched('longitude')}
              />
            </div>
            <Field
              label="Sitio web"
              type="url"
              name="websiteUrl"
              value={values.websiteUrl}
              error={errorFor('websiteUrl')}
              onChange={(event) => update('websiteUrl', event.target.value)}
              onBlur={() => markTouched('websiteUrl')}
            />
            <Field
              label="Fecha de inicio de operación"
              type="date"
              name="startOperationDate"
              value={values.startOperationDate}
              error={errorFor('startOperationDate')}
              onChange={(event) =>
                update('startOperationDate', event.target.value)
              }
              onBlur={() => markTouched('startOperationDate')}
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
