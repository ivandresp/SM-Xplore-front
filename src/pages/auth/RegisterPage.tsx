import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '@/components/Button'
import { Field, SelectField } from '@/components/FormField'
import { useAuth } from '@/hooks/useAuth'
import { isApiError } from '@/services/httpClient'
import type {
  RegisterGuideRequest,
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
  license: '',
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
  { value: 'GUIDE', label: 'Guía turístico' },
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

function buildGuidePayload(values: RegisterFormValues): RegisterGuideRequest {
  return {
    fullName: values.fullName.trim(),
    email: values.email.trim(),
    phone: normalizePhone(values.phone),
    password: values.password,
    dniType: values.dniType,
    dniNumber: values.dniNumber.trim(),
    license: values.license.trim(),
    ...(values.startOperationDate !== '' && {
      startOperationDate: values.startOperationDate,
    }),
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

interface RegisterPageProps {
  /** `/registro/guia` entra con el formulario de guía ya elegido. */
  initialKind?: AccountKind
}

export default function RegisterPage({
  initialKind = 'TOURIST',
}: RegisterPageProps) {
  const { registerTourist, registerProvider, registerGuide } = useAuth()
  const navigate = useNavigate()
  const formRef = useRef<HTMLFormElement>(null)

  const [kind, setKind] = useState<AccountKind>(initialKind)
  /**
   * Al ir de /registro a /registro/guia React reutiliza la instancia y el
   * estado sobreviviría: aquí se ajusta el tipo cuando cambia la ruta.
   * (Patrón de React para sincronizar estado con una prop, sin efecto.)
   */
  const [kindSource, setKindSource] = useState<AccountKind>(initialKind)
  if (kindSource !== initialKind) {
    setKindSource(initialKind)
    setKind(initialKind)
  }
  const [values, setValues] = useState<RegisterFormValues>(INITIAL_FORM)
  const [touched, setTouched] = useState<
    Partial<Record<RegisterFieldKey, boolean>>
  >({})
  const [submitAttempted, setSubmitAttempted] = useState(false)
  const [serverErrors, setServerErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [created, setCreated] = useState<{
    kind: AccountKind
    email: string
  } | null>(null)

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

  /**
   * El error de blur se pinta en la tarea siguiente: si apareciera durante el
   * mousedown del botón, el reflujo movería el botón y el mouseup caería fuera,
   * perdiendo el clic (habría que pulsar dos veces).
   */
  function markTouched(key: RegisterFieldKey) {
    window.setTimeout(() => {
      setTouched((current) => ({ ...current, [key]: true }))
    }, 0)
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

  /**
   * El foco se aplica en un efecto, después del commit: el campo ya lleva su
   * `aria-describedby` con el error cuando recibe el foco.
   */
  const [focusRequest, setFocusRequest] = useState<{
    key: RegisterFieldKey
    token: number
  } | null>(null)
  const focusToken = useRef(0)

  useEffect(() => {
    if (focusRequest === null) {
      return
    }
    formRef.current
      ?.querySelector<HTMLElement>(`[name="${focusRequest.key}"]`)
      ?.focus()
  }, [focusRequest])

  function requestFocus(key: RegisterFieldKey) {
    focusToken.current += 1
    setFocusRequest({ key, token: focusToken.current })
  }

  function handleRegisterError(cause: unknown) {
    if (isApiError(cause) && cause.code === 'EMAIL_ALREADY_EXISTS') {
      const message =
        'Ya existe una cuenta con ese correo. Inicia sesión o usa otro correo.'
      setServerErrors({ email: message })
      setFormError(message)
      requestFocus('email')
      return
    }

    if (isApiError(cause) && cause.code === 'VALIDATION_ERROR') {
      const { fields } = mapServerFieldErrors(cause.fieldErrors)
      const mapped = FIELD_ORDER.filter(
        (field) => fields[field] !== undefined,
      )
      if (mapped.length > 0) {
        setServerErrors(fields)
        setFormError(summaryMessage(fields))
        requestFocus(mapped[0])
        return
      }
    }

    setFormError(describeApiError(cause))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const blocked = firstInvalidField(kind, values)
    if (blocked !== null) {
      setSubmitAttempted(true)
      setFormError(summaryMessage(clientErrors))
      requestFocus(blocked)
      return
    }

    setFormError(null)
    setSubmitAttempted(true)
    setIsSubmitting(true)

    try {
      if (kind === 'TOURIST') {
        // El turista nace activo: se inicia sesión y pasa por el onboarding de
        // bienvenida, que alimenta preferencias y perfil (B8b).
        const session = await registerTourist(buildTouristPayload(values))
        navigate(session === null ? '/login' : '/bienvenida', { replace: true })
      } else if (kind === 'GUIDE') {
        await registerGuide(buildGuidePayload(values))
        setCreated({ kind, email: values.email.trim() })
      } else {
        await registerProvider(buildProviderPayload(values))
        setCreated({ kind, email: values.email.trim() })
      }
    } catch (cause) {
      handleRegisterError(cause)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (created !== null) {
    const isGuide = created.kind === 'GUIDE'
    return (
      <AuthShell
        title="Solicitud enviada"
        subtitle={
          isGuide
            ? 'Tu solicitud como guía quedó registrada y está pendiente de revisión.'
            : 'Tu prestadora quedó registrada y está pendiente de revisión.'
        }
        footer={
          <p>
            <Link to="/login">Ir a iniciar sesión</Link>
          </p>
        }
      >
        <p className={styles.notice}>
          Revisa tu correo: escribimos a {created.email}.{' '}
          {isGuide
            ? 'Una gestora revisará tu solicitud y te avisaremos por correo; hasta entonces no podrás iniciar sesión.'
            : 'Un administrador debe aprobar el registro antes de que puedas iniciar sesión.'}
        </p>
      </AuthShell>
    )
  }

  const isTourist = kind === 'TOURIST'

  return (
    <AuthShell
      title="Crear cuenta"
      subtitle="Regístrate como turista, guía turístico o prestadora de servicios."
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
            hint="Móvil colombiano: +57 300 123 4567. También aceptamos fijos e internacionales."
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
                  check.state === 'met' && styles.checklistMet,
                  check.state === 'pending' && styles.checklistPending,
                  check.state === 'empty' && styles.checklistNeutral,
                )}
              >
                <span aria-hidden="true">
                  {check.state === 'met' ? '✓' : check.state === 'empty' ? '·' : '•'}
                </span>
                <span>{check.label}</span>
                <span className={styles.checkStatus}>
                  {check.state === 'met'
                    ? 'Cumple'
                    : check.state === 'empty'
                      ? 'Pendiente'
                      : 'Falta'}
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
        ) : null}

        {kind === 'GUIDE' && (
          <>
            <p className={styles.groupTitle}>Documento y licencia</p>
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

            <Field
              label="Licencia de guía"
              name="license"
              autoComplete="off"
              required
              hint="Número de la licencia de guía turístico (máximo 50 caracteres)."
              value={values.license}
              error={errorFor('license')}
              onChange={(event) => update('license', event.target.value)}
              onBlur={() => markTouched('license')}
            />

            <Field
              label="Fecha de inicio de operación"
              type="date"
              name="startOperationDate"
              hint="Opcional: cuándo empezaste a operar como guía."
              value={values.startOperationDate}
              error={errorFor('startOperationDate')}
              onChange={(event) =>
                update('startOperationDate', event.target.value)
              }
              onBlur={() => markTouched('startOperationDate')}
            />

            <p className={styles.notice}>
              Tu solicitud queda en revisión: una gestora la aprueba o la rechaza
              y te avisamos por correo. Hasta entonces no podrás iniciar sesión.
            </p>
          </>
        )}

        {kind === 'SERVICE_PROVIDER' && (
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

        {kind !== 'GUIDE' && (
          <p className={styles.footer}>
            ¿Eres guía turístico?{' '}
            <Link to="/registro/guia">Registra tu solicitud como guía</Link>
          </p>
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
