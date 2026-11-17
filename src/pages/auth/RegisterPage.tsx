import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMessageState } from '@/hooks/useMessageState'
import { translate as t } from '@/i18n/language'
import { useLanguage } from '@/hooks/useLanguage'
import { Button } from '@/components/Button'
import { Field, SelectField } from '@/components/FormField'
import { LocationPicker } from '@/components/LocationPicker'
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
  { value: 'TOURIST', get label() { return t("Turista") } },
  { value: 'GUIDE', get label() { return t("Guía turístico") } },
  { value: 'SERVICE_PROVIDER', get label() { return t("Prestadora de servicios") } },
]

const DNI_TYPE_OPTIONS = [
  { value: 'CC', get label() { return t("Cédula de ciudadanía") } },
  { value: 'CE', get label() { return t("Cédula de extranjería") } },
  { value: 'PA', get label() { return t("Pasaporte") } },
  { value: 'NIT', label: 'NIT' },
]

const BUSINESS_TYPE_OPTIONS = [
  { value: 'Alojamiento', get label() { return t('Alojamiento') } },
  { value: 'Transporte', get label() { return t('Transporte') } },
  { value: 'Alimentacion', get label() { return t('Alimentacion') } },
]

const LANGUAGE_OPTIONS = [
  { value: 'es', get label() { return t("Español") } },
  { value: 'en', get label() { return t("Inglés") } },
  { value: 'fr', get label() { return t("Francés") } },
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
  return t("Revisa los datos: {0}.", [labels.join(', ')])
}

interface RegisterPageProps {
  /** `/registro/guia` entra con el formulario de guía ya elegido. */
  initialKind?: AccountKind
}

export default function RegisterPage({
  initialKind = 'TOURIST',
}: RegisterPageProps) {
  useLanguage()
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
  const [serverErrors, setServerErrors] = useMessageState<FieldErrors>({})
  const [formError, setFormError] = useMessageState<string | null>(null)
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
    if (focusRequest.key === 'latitude' || focusRequest.key === 'longitude') {
      formRef.current?.querySelector<HTMLElement>('[data-provider-location] button')?.focus()
      return
    }
    const field = formRef.current?.querySelector<HTMLElement>(
      `[name="${focusRequest.key}"]`,
    )
    // El combobox pone el name en un input hidden: hay que enfocar el trigger.
    const target =
      field instanceof HTMLInputElement && field.type === 'hidden'
        ? field.parentElement?.querySelector<HTMLElement>('[role="combobox"]')
        : field
    target?.focus()
  }, [focusRequest])

  function requestFocus(key: RegisterFieldKey) {
    focusToken.current += 1
    setFocusRequest({ key, token: focusToken.current })
  }

  function handleRegisterError(cause: unknown) {
    if (isApiError(cause) && cause.code === 'EMAIL_ALREADY_EXISTS') {
      const message = () =>
        t("Ya existe una cuenta con ese correo. Inicia sesión o usa otro correo.")
      setServerErrors(() => ({ email: message() }))
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
        setServerErrors(() => mapServerFieldErrors(cause.fieldErrors).fields)
        setFormError(() => summaryMessage(mapServerFieldErrors(cause.fieldErrors).fields))
        requestFocus(mapped[0])
        return
      }
    }

    setFormError(() => describeApiError(cause))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const blocked = firstInvalidField(kind, values)
    if (blocked !== null) {
      setSubmitAttempted(true)
      setFormError(() => summaryMessage(validateRegisterForm(kind, values)))
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
        title={t("Solicitud enviada")}
        subtitle={
          isGuide
            ? t("Tu solicitud como guía quedó registrada y está pendiente de revisión.")
            : t("Tu prestadora quedó registrada y está pendiente de revisión.")
        }
        footer={
          <p>
            <Link to="/login">{t("Ir a iniciar sesión")}</Link>
          </p>
        }
      >
        <p className={styles.notice}>
          {t("Revisa tu correo: puede llegar un aviso a")}{" "}{created.email}.{' '}
          {isGuide
            ? t("Una gestora revisará tu solicitud y, si la aprueba, podrás iniciar sesión.")
            : t("Un administrador revisará el registro; la cuenta sigue activa y el perfil no se publica en el catálogo hasta que se apruebe.")}
        </p>
      </AuthShell>
    )
  }

  const isTourist = kind === 'TOURIST'

  return (
    <AuthShell
      title={t("Crear cuenta")}
      subtitle={t("Regístrate como turista, guía turístico o prestadora de servicios.")}
      footer={
        <p>
          {t("¿Ya tienes cuenta?")}{" "}<Link to="/login">{t("Inicia sesión")}</Link>
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
          label={t("Tipo de cuenta")}
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
          label={t("Nombre completo")}
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
            label={t("Correo electrónico")}
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
            label={t("Teléfono")}
            type="tel"
            inputMode="tel"
            name="phone"
            autoComplete="tel"
            required
            hint={t("Móvil colombiano: +57 300 123 4567. También aceptamos fijos e internacionales.")}
            value={values.phone}
            error={errorFor('phone')}
            onChange={(event) => update('phone', event.target.value)}
            onBlur={() => markTouched('phone')}
          />
        </div>

        <div className={styles.fieldGroup}>
          <Field
            label={t("Contraseña")}
            type="password"
            name="password"
            autoComplete="new-password"
            spellCheck={false}
            required
            hint={t("Mínimo 12 caracteres; combina al menos 3 tipos.")}
            aria-describedby={
              values.password === '' ? undefined : PASSWORD_CHECKLIST_ID
            }
            value={values.password}
            error={errorFor('password')}
            onChange={(event) => update('password', event.target.value)}
            onBlur={() => markTouched('password')}
          />
          {values.password !== '' && (
            <ul
              className={styles.checklist}
              id={PASSWORD_CHECKLIST_ID}
              aria-label={t("Requisitos de la contraseña")}
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
                    {check.state === 'met'
                      ? '✓'
                      : check.state === 'empty'
                        ? '·'
                        : '•'}
                  </span>
                  <span>{check.label}</span>
                  <span className={styles.checkStatus}>
                    {check.state === 'met'
                      ? t("Cumple")
                      : check.state === 'empty'
                        ? t("Pendiente")
                        : t("Falta")}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {isTourist ? (
          <>
            <p className={styles.groupTitle}>{t("Documento")}</p>
            <div className={styles.grid}>
              <SelectField
                label={t("Tipo de documento")}
                name="dniType"
                required
                options={DNI_TYPE_OPTIONS}
                value={values.dniType}
                error={errorFor('dniType')}
                onChange={(event) => update('dniType', event.target.value)}
                onBlur={() => markTouched('dniType')}
              />
              <Field
                label={t("Número de documento")}
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
                label={t("Pais de Origen")}
                name="nationality"
                value={values.nationality}
                error={errorFor('nationality')}
                onChange={(event) => update('nationality', event.target.value)}
                onBlur={() => markTouched('nationality')}
              />
              <SelectField
                label={t("Idioma preferido")}
                name="preferredLanguage"
                options={[
                  { value: '', label: t("Sin especificar") },
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
              label={t("Fecha de nacimiento")}
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
            <p className={styles.groupTitle}>{t("Documento y licencia")}</p>
            <div className={styles.grid}>
              <SelectField
                label={t("Tipo de documento")}
                name="dniType"
                required
                options={DNI_TYPE_OPTIONS}
                value={values.dniType}
                error={errorFor('dniType')}
                onChange={(event) => update('dniType', event.target.value)}
                onBlur={() => markTouched('dniType')}
              />
              <Field
                label={t("Número de documento")}
                name="dniNumber"
                required
                value={values.dniNumber}
                error={errorFor('dniNumber')}
                onChange={(event) => update('dniNumber', event.target.value)}
                onBlur={() => markTouched('dniNumber')}
              />
            </div>

            <Field
              label={t("Licencia de guía")}
              name="license"
              autoComplete="off"
              required
              hint={t("Número de la licencia de guía turístico (máximo 50 caracteres).")}
              value={values.license}
              error={errorFor('license')}
              onChange={(event) => update('license', event.target.value)}
              onBlur={() => markTouched('license')}
            />

            <Field
              label={t("Fecha de inicio de operación")}
              type="date"
              name="startOperationDate"
              hint={t("Opcional: cuándo empezaste a operar como guía.")}
              value={values.startOperationDate}
              error={errorFor('startOperationDate')}
              onChange={(event) =>
                update('startOperationDate', event.target.value)
              }
              onBlur={() => markTouched('startOperationDate')}
            />

            <p className={styles.notice}>
              {t("Tu solicitud queda en revisión: una gestora la aprueba o la rechaza y te avisamos por correo. Hasta entonces no podrás iniciar sesión.")}</p>
          </>
        )}

        {kind === 'SERVICE_PROVIDER' && (
          <>
            <p className={styles.groupTitle}>{t("Empresa")}</p>
            <Field
              label="NIT"
              name="nit"
              required
              hint={t("Solo números y guiones, entre 6 y 30 caracteres.")}
              value={values.nit}
              error={errorFor('nit')}
              onChange={(event) => update('nit', event.target.value)}
              onBlur={() => markTouched('nit')}
            />
            <div className={styles.grid}>
              <SelectField
                label={t("Tipo de negocio")}
                name="businessType"
                placeholder={t("Sin especificar")}
                options={BUSINESS_TYPE_OPTIONS}
                value={values.businessType}
                error={errorFor('businessType')}
                onChange={(event) => update('businessType', event.target.value)}
                onBlur={() => markTouched('businessType')}
              />
              <Field
                label={t("Fecha de inicio de operación")}
                type="date"
                name="startOperationDate"
                value={values.startOperationDate}
                error={errorFor('startOperationDate')}
                onChange={(event) => update('startOperationDate', event.target.value)}
                onBlur={() => markTouched('startOperationDate')}
              />
            </div>
            <div data-provider-location>
              <LocationPicker
                label={t("Ubicación del negocio")}
                value={values.latitude !== '' && values.longitude !== ''
                  ? { latitude: Number(values.latitude), longitude: Number(values.longitude) }
                  : null}
                onChange={(point) => {
                  update('latitude', point === null ? '' : String(point.latitude))
                  update('longitude', point === null ? '' : String(point.longitude))
                }}
                disabled={isSubmitting}
                error={errorFor('latitude') ?? errorFor('longitude')}
              />
            </div>
            <Field
              label={t("Sitio web")}
              type="url"
              name="websiteUrl"
              value={values.websiteUrl}
              error={errorFor('websiteUrl')}
              onChange={(event) => update('websiteUrl', event.target.value)}
              onBlur={() => markTouched('websiteUrl')}
            />
          </>
        )}

        {kind !== 'GUIDE' && (
          <p className={styles.footer}>
            {t("¿Eres guía turístico?")}{' '}
            <Link to="/registro/guia">{t("Registra tu solicitud como guía")}</Link>
          </p>
        )}

        <Button
          className={styles.submit}
          type="submit"
          disabled={isSubmitting}
          // Evita que el botón se lleve el foco al pulsar: si el campo con
          // error pierde el foco, el mensaje refluye y el mouseup cae fuera
          // (el primer clic se perdía). El teclado sigue enfocando por Tab.
          onMouseDown={(event) => event.preventDefault()}
        >
          {isSubmitting ? t("Creando cuenta…") : t("Crear cuenta")}
        </Button>
      </form>
    </AuthShell>
  )
}
