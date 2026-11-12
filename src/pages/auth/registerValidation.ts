import type { UserRole } from '@/types'

export type AccountKind = Extract<
  UserRole,
  'TOURIST' | 'SERVICE_PROVIDER' | 'GUIDE'
>

/** Mismos valores que `PasswordPolicy.java:16-18`; si cambian allí, cambian aquí. */
export const PASSWORD_MIN_LENGTH = 12
export const PASSWORD_MAX_LENGTH = 72
export const PASSWORD_MIN_CLASSES = 3

/** `PasswordPolicy.java:25-39`: lista corta de contraseñas comunes, en minúsculas. */
export const COMMON_PASSWORDS: readonly string[] = [
  '123456789012',
  '1234567890123',
  '12345678901234',
  'password1234',
  'password12345',
  'qwertyuiop12',
  'aaaaaaaaaaaa',
  'contraseña123',
  'admin123456789',
  'qwerty123456',
  'iloveyou1234',
  'bienvenido123',
  'santamarta123',
  'turismo123456',
]

export interface RegisterFormValues {
  fullName: string
  email: string
  phone: string
  password: string
  dniType: string
  dniNumber: string
  license: string
  nationality: string
  preferredLanguage: string
  birthDate: string
  nit: string
  businessType: string
  latitude: string
  longitude: string
  websiteUrl: string
  startOperationDate: string
}

export type RegisterFieldKey = keyof RegisterFormValues

export type FieldErrors = Partial<Record<RegisterFieldKey, string>>

/** Orden de lectura del formulario: el primer error recibe el foco. */
export const FIELD_ORDER: readonly RegisterFieldKey[] = [
  'fullName',
  'email',
  'phone',
  'password',
  'dniType',
  'dniNumber',
  'license',
  'nationality',
  'preferredLanguage',
  'birthDate',
  'nit',
  'businessType',
  'latitude',
  'longitude',
  'websiteUrl',
  'startOperationDate',
]

const FIELD_LABELS: Record<RegisterFieldKey, string> = {
  fullName: 'nombre completo',
  email: 'correo electrónico',
  phone: 'teléfono',
  password: 'contraseña',
  dniType: 'tipo de documento',
  dniNumber: 'número de documento',
  license: 'licencia de guía',
  nationality: 'nacionalidad',
  preferredLanguage: 'idioma preferido',
  birthDate: 'fecha de nacimiento',
  nit: 'NIT',
  businessType: 'tipo de negocio',
  latitude: 'latitud',
  longitude: 'longitud',
  websiteUrl: 'sitio web',
  startOperationDate: 'fecha de inicio de operación',
}

/** Nombre legible para el resumen de errores del formulario. */
export function fieldLabel(field: RegisterFieldKey): string {
  return FIELD_LABELS[field]
}

/**
 * `RegisterTouristRequest.java:14` y `RegisterProviderRequest.java:17`:
 * `^[0-9+()\\-\\s]{7,20}$`. Es la puerta dura, aplicada al valor tal cual
 * y al normalizado. El móvil colombiano (+57, 10 dígitos) es solo una pista
 * visible en el campo, no un bloqueo: un turista extranjero (+34, +1) o un
 * fijo colombiano (6061234) tienen que poder registrarse.
 */
const PHONE_DTO_PATTERN = /^[0-9+()\s-]{7,20}$/
const PHONE_SEPARATORS = /[\s()-]/g

export const PHONE_MESSAGE =
  'Escribe un teléfono válido: entre 7 y 20 caracteres, solo números, +, espacios, guiones o paréntesis.'

export function normalizePhone(raw: string): string {
  return raw.trim().replace(PHONE_SEPARATORS, '')
}

export function validatePhone(raw: string): string | null {
  const trimmed = raw.trim()
  if (trimmed === '') {
    return 'Escribe tu teléfono.'
  }
  if (!PHONE_DTO_PATTERN.test(trimmed)) {
    return PHONE_MESSAGE
  }

  // El normalizado también cumple el patrón: 7..20 caracteres útiles.
  return PHONE_DTO_PATTERN.test(normalizePhone(trimmed)) ? null : PHONE_MESSAGE
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export interface PasswordCheck {
  id: 'length' | 'maxLength' | 'classes' | 'common'
  label: string
  met: boolean
  /** `empty`: todavía no hay contraseña; ni verde ni rojo. */
  state: 'empty' | 'met' | 'pending'
}

/**
 * Igual que `PasswordPolicy.characterClasses` (PasswordPolicy.java:61-76).
 *
 * H7 (dirección segura): se usan propiedades Unicode (`\p{Ll}`, `\p{Lu}`)
 * como hace `Character.isLowerCase` en Java; rangos ASCII rechazarían "ñ" o
 * "á" en una contraseña válida.
 */
function characterClasses(password: string): number {
  let classes = 0
  if (/\p{Ll}/u.test(password)) classes += 1
  if (/\p{Lu}/u.test(password)) classes += 1
  if (/[0-9]/.test(password)) classes += 1
  if (/[^\p{L}\p{N}]/u.test(password)) classes += 1
  return classes
}

/** `PasswordPolicy.validate` (PasswordPolicy.java:43-59), sin el mensaje genérico. */
export function passwordChecks(password: string): PasswordCheck[] {
  const lowered = password.toLowerCase()
  // Sin contraseña no se adelanta ningún requisito: estado neutral, no verde.
  const empty = password === ''
  const checks: Array<Omit<PasswordCheck, 'state'>> = [
    {
      id: 'length',
      label: `Al menos ${PASSWORD_MIN_LENGTH} caracteres`,
      met: password.length >= PASSWORD_MIN_LENGTH,
    },
    {
      id: 'maxLength',
      label: `Como máximo ${PASSWORD_MAX_LENGTH} caracteres`,
      met: password.length <= PASSWORD_MAX_LENGTH,
    },
    {
      id: 'classes',
      label: `Combina al menos ${PASSWORD_MIN_CLASSES} de: minúsculas, mayúsculas, números y símbolos`,
      met: characterClasses(password) >= PASSWORD_MIN_CLASSES,
    },
    {
      id: 'common',
      label: 'No uses una contraseña común',
      met: !COMMON_PASSWORDS.includes(lowered),
    },
  ]

  return checks.map((check) => ({
    ...check,
    met: empty ? false : check.met,
    state: empty ? 'empty' : check.met ? 'met' : 'pending',
  }))
}

export function isPasswordValid(password: string): boolean {
  return passwordChecks(password).every((check) => check.met)
}

/**
 * H6 (documentado): la fecha se compara con el reloj y la zona del navegador,
 * así que un usuario en otro huso puede ver el borde del día distinto al del
 * backend. El backend vuelve a validar `@Past`/`@PastOrPresent`, de modo que
 * el peor caso es un 400 con el campo señalado.
 */
function todayIso(): string {
  const now = new Date()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${now.getFullYear()}-${month}-${day}`
}

function numberInRange(raw: string, min: number, max: number): boolean {
  const value = Number(raw)
  return Number.isFinite(value) && value >= min && value <= max
}

/** Reglas de los DTO de ms-01; devuelve un mensaje por campo, no uno global. */
export function validateRegisterForm(
  kind: AccountKind,
  values: RegisterFormValues,
): FieldErrors {
  const errors: FieldErrors = {}

  const fullName = values.fullName.trim()
  if (fullName === '') {
    errors.fullName = 'Escribe tu nombre completo.'
  } else if (fullName.length > 150) {
    errors.fullName = 'El nombre no puede superar los 150 caracteres.'
  }

  const email = values.email.trim()
  if (email === '') {
    errors.email = 'Escribe tu correo electrónico.'
  } else if (email.length > 150) {
    errors.email = 'El correo no puede superar los 150 caracteres.'
  } else if (!EMAIL_PATTERN.test(email)) {
    errors.email = 'Escribe un correo electrónico válido.'
  }

  const phoneError = validatePhone(values.phone)
  if (phoneError !== null) {
    errors.phone = phoneError
  }

  if (!isPasswordValid(values.password)) {
    errors.password = 'La contraseña no cumple los requisitos de seguridad.'
  }

  if (kind !== 'SERVICE_PROVIDER') {
    if (values.dniType.trim() === '') {
      errors.dniType = 'Elige el tipo de documento.'
    } else if (values.dniType.trim().length > 20) {
      errors.dniType = 'El tipo de documento no puede superar los 20 caracteres.'
    }

    const dniNumber = values.dniNumber.trim()
    if (dniNumber === '') {
      errors.dniNumber = 'Escribe el número de documento.'
    } else if (dniNumber.length > 30) {
      errors.dniNumber = 'El número de documento no puede superar los 30 caracteres.'
    }
  }

  if (kind === 'GUIDE') {
    // `RegisterGuideRequest.java:20`: licencia obligatoria, máximo 50.
    const license = values.license.trim()
    if (license === '') {
      errors.license = 'Escribe el número de la licencia de guía.'
    } else if (license.length > 50) {
      errors.license = 'La licencia no puede superar los 50 caracteres.'
    }

    if (
      values.startOperationDate !== '' &&
      values.startOperationDate > todayIso()
    ) {
      errors.startOperationDate =
        'La fecha de inicio no puede estar en el futuro.'
    }
  }

  if (kind === 'TOURIST') {
    if (values.nationality.trim().length > 80) {
      errors.nationality = 'La nacionalidad no puede superar los 80 caracteres.'
    }

    if (values.preferredLanguage.trim().length > 50) {
      errors.preferredLanguage =
        'El idioma preferido no puede superar los 50 caracteres.'
    }

    if (values.birthDate !== '' && values.birthDate >= todayIso()) {
      errors.birthDate = 'La fecha de nacimiento debe ser anterior a hoy.'
    }
  }

  if (kind === 'SERVICE_PROVIDER') {
    const nit = values.nit.trim()
    if (nit === '') {
      errors.nit = 'Escribe el NIT de la empresa.'
    } else if (!/^[0-9-]{6,30}$/.test(nit)) {
      errors.nit = 'El NIT debe tener entre 6 y 30 caracteres: solo números y guiones.'
    }

    if (values.businessType.trim().length > 50) {
      errors.businessType = 'El tipo de negocio no puede superar los 50 caracteres.'
    }

    if (values.latitude !== '' && !numberInRange(values.latitude, -90, 90)) {
      errors.latitude = 'La latitud debe ser un número entre -90 y 90.'
    }

    if (values.longitude !== '' && !numberInRange(values.longitude, -180, 180)) {
      errors.longitude = 'La longitud debe ser un número entre -180 y 180.'
    }

    if (values.websiteUrl.trim().length > 255) {
      errors.websiteUrl = 'El sitio web no puede superar los 255 caracteres.'
    }

    if (
      values.startOperationDate !== '' &&
      values.startOperationDate > todayIso()
    ) {
      errors.startOperationDate =
        'La fecha de inicio no puede estar en el futuro.'
    }
  }

  return errors
}

export function firstInvalidField(
  kind: AccountKind,
  values: RegisterFormValues,
): RegisterFieldKey | null {
  const errors = validateRegisterForm(kind, values)
  for (const field of FIELD_ORDER) {
    if (errors[field] !== undefined) {
      return field
    }
  }
  return null
}

const SERVER_FIELD_MESSAGES: Partial<Record<RegisterFieldKey, string>> = {
  fullName: 'El nombre no es válido según el servidor.',
  email: 'El correo electrónico no es válido.',
  phone: 'El teléfono no es válido según el servidor.',
  password: 'La contraseña no cumple la política de seguridad.',
  dniType: 'El tipo de documento no es válido.',
  dniNumber: 'El número de documento no es válido.',
  license: 'La licencia no es válida según el servidor.',
  nit: 'El NIT no es válido según el servidor.',
}

const SERVER_FALLBACK_MESSAGE = 'Este dato no es válido según el servidor.'

function isRegisterFieldKey(key: string): key is RegisterFieldKey {
  return Object.prototype.hasOwnProperty.call(FIELD_LABELS, key)
}

/**
 * Los `errors` de `ProblemDetail` (`ApiExceptionHandler.java:278-291`) llegan
 * con el nombre del campo del DTO; se traducen aquí para no pintar el texto en
 * inglés de Bean Validation.
 */
export function mapServerFieldErrors(errors?: Record<string, string>): {
  fields: FieldErrors
  unmapped: string[]
} {
  const fields: FieldErrors = {}
  const unmapped: string[] = []

  if (errors === undefined) {
    return { fields, unmapped }
  }

  for (const key of Object.keys(errors)) {
    if (isRegisterFieldKey(key)) {
      fields[key] = SERVER_FIELD_MESSAGES[key] ?? SERVER_FALLBACK_MESSAGE
    } else {
      unmapped.push(key)
    }
  }

  return { fields, unmapped }
}
