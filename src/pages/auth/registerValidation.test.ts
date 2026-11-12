import { describe, expect, it } from 'vitest'
import {
  FIELD_ORDER,
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_CLASSES,
  PASSWORD_MIN_LENGTH,
  firstInvalidField,
  isPasswordValid,
  mapServerFieldErrors,
  normalizePhone,
  passwordChecks,
  validatePhone,
  validateRegisterForm,
} from './registerValidation'
import type { RegisterFormValues } from './registerValidation'

/**
 * Los mínimos salen del backend, no de la UI:
 * - PasswordPolicy.java:16-18 (MIN_LENGTH 12, MAX_LENGTH 72, MIN_CHARACTER_CLASSES 3).
 * - RegisterTouristRequest.java:14 y RegisterProviderRequest.java:17 (phone).
 */
const TOURIST_FORM: RegisterFormValues = {
  fullName: 'Laura Mora',
  email: 'laura@correo.com',
  phone: '+57 300 123 4567',
  password: 'ContraseñaSegura1!',
  dniType: 'CC',
  dniNumber: '1020304050',
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

const GUIDE_FORM: RegisterFormValues = {
  ...TOURIST_FORM,
  license: 'LIC-B8A-001',
  startOperationDate: '2024-02-01',
}

const PROVIDER_FORM: RegisterFormValues = {
  ...TOURIST_FORM,
  nit: '900123456-7',
  businessType: 'Hotel',
  latitude: '11.2408',
  longitude: '-74.1990',
  startOperationDate: '2020-01-15',
}

describe('contrato real de la política de contraseñas', () => {
  it('copia los mínimos de PasswordPolicy.java, no inventa otros', () => {
    expect(PASSWORD_MIN_LENGTH).toBe(12)
    expect(PASSWORD_MAX_LENGTH).toBe(72)
    expect(PASSWORD_MIN_CLASSES).toBe(3)
  })
})

describe('teléfono: la puerta dura es el patrón del DTO', () => {
  it.each([
    // DTO: ^[0-9+()\-\s]{7,20}$ (RegisterTouristRequest.java:14)
    '3001234567',
    '300 123 4567',
    '300-123-4567',
    '+57 300 123 4567',
    '+573001234567',
    '+57 300-123-45 67',
    '+34 600 123 456',
    '+1 305 555 0100',
    '6061234',
    '1234567',
    '(601) 234 5678',
  ])('acepta %s', (phone) => {
    expect(validatePhone(phone)).toBeNull()
  })

  it.each([
    '123456',
    '300 12',
    'a300123456',
    'abcdefg',
    '123456789012345678901',
  ])('rechaza %s', (phone) => {
    expect(validatePhone(phone)).not.toBeNull()
  })

  it('exige el campo y explica el rango en español', () => {
    expect(validatePhone('   ')).toBe('Escribe tu teléfono.')
    expect(validatePhone('123456')).toMatch(/7 y 20/i)
    expect(validatePhone('300123456a')).toMatch(/números/i)
  })

  it('normaliza a dígitos con el +57 opcional delante', () => {
    expect(normalizePhone('+57 300-123-4567')).toBe('+573001234567')
    expect(normalizePhone('300 123 4567')).toBe('3001234567')
  })
})

describe('política de contraseña', () => {
  it('acepta 12 o más caracteres con tres clases', () => {
    expect(isPasswordValid('ContraseñaSegura1!')).toBe(true)
    expect(isPasswordValid('Abcdefghijk1')).toBe(true)
  })

  it.each([
    ['Abc1!', 'menos de 12 caracteres'],
    ['aaaaaaaaaaaa', 'contraseña común'],
    ['abcdefghijkl', 'una sola clase de caracteres'],
    [`${'A1!'}${'a'.repeat(70)}`, 'más de 72 caracteres'],
  ])('rechaza %s (%s)', (password) => {
    expect(isPasswordValid(password)).toBe(false)
  })

  it('el checklist muestra los mínimos reales con su estado', () => {
    const pending = passwordChecks('corta')
    const labels = pending.map((check) => check.label).join(' | ')

    expect(labels).toMatch(/12/)
    expect(labels).toMatch(/72/)
    expect(labels).toMatch(/3/)
    expect(pending.find((check) => check.id === 'length')?.met).toBe(false)
    expect(pending.find((check) => check.id === 'maxLength')?.met).toBe(true)

    const done = passwordChecks('ContraseñaSegura1!')
    expect(done.every((check) => check.met)).toBe(true)
    expect(done.every((check) => check.state === 'met')).toBe(true)
  })

  it('con la contraseña vacía no adelanta ningún requisito', () => {
    const empty = passwordChecks('')
    expect(empty.every((check) => check.met === false)).toBe(true)
    expect(empty.every((check) => check.state === 'empty')).toBe(true)

    const pending = passwordChecks('corta')
    expect(pending.find((check) => check.id === 'maxLength')?.state).toBe('met')
    expect(pending.find((check) => check.id === 'length')?.state).toBe('pending')
  })
})

describe('validateRegisterForm', () => {
  it('no devuelve errores con datos válidos de turista', () => {
    expect(validateRegisterForm('TOURIST', TOURIST_FORM)).toEqual({})
  })

  it('no devuelve errores con datos válidos de prestadora', () => {
    expect(validateRegisterForm('SERVICE_PROVIDER', PROVIDER_FORM)).toEqual({})
  })

  it('señala el teléfono inválido en su propio campo', () => {
    const errors = validateRegisterForm('TOURIST', {
      ...TOURIST_FORM,
      phone: '300 12',
    })
    expect(errors).toEqual({ phone: expect.stringMatching(/7 y 20/i) })
  })

  it('señala todos los campos obligatorios vacíos a la vez', () => {
    const errors = validateRegisterForm('TOURIST', {
      ...TOURIST_FORM,
      fullName: '',
      email: '',
      dniNumber: '',
    })
    expect(Object.keys(errors).sort()).toEqual(['dniNumber', 'email', 'fullName'])
  })

  it('acepta datos válidos de guía con su licencia', () => {
    expect(validateRegisterForm('GUIDE', GUIDE_FORM)).toEqual({})
  })

  it('exige la licencia del guía y su máximo de RegisterGuideRequest.java:20', () => {
    expect(
      validateRegisterForm('GUIDE', { ...GUIDE_FORM, license: '   ' }).license,
    ).toMatch(/licencia de guía/i)
    expect(
      validateRegisterForm('GUIDE', { ...GUIDE_FORM, license: 'L'.repeat(51) })
        .license,
    ).toMatch(/50/)
  })

  it('no deja que el guía declare una fecha de inicio futura', () => {
    expect(
      validateRegisterForm('GUIDE', {
        ...GUIDE_FORM,
        startOperationDate: '2999-01-01',
      }).startOperationDate,
    ).toMatch(/futuro/)
    expect(
      validateRegisterForm('GUIDE', {
        ...GUIDE_FORM,
        startOperationDate: '',
      }).startOperationDate,
    ).toBeUndefined()
  })

  it('el guía no arrastra los campos del turista ni el NIT de la prestadora', () => {
    const errors = validateRegisterForm('GUIDE', {
      ...GUIDE_FORM,
      nationality: 'a'.repeat(81),
      nit: 'x',
      birthDate: '2999-01-01',
    })

    expect(Object.keys(errors)).toEqual([])
  })

  it('aplica el NIT de RegisterProviderRequest.java:21', () => {
    expect(
      validateRegisterForm('SERVICE_PROVIDER', { ...PROVIDER_FORM, nit: '90012' }).nit,
    ).toMatch(/6 y 30/)
    expect(
      validateRegisterForm('SERVICE_PROVIDER', { ...PROVIDER_FORM, nit: 'abc123456' }).nit,
    ).toBeTruthy()
    expect(
      validateRegisterForm('SERVICE_PROVIDER', { ...PROVIDER_FORM, nit: '900123456-7' }).nit,
    ).toBeUndefined()
  })

  it('respeta los máximos de los DTO', () => {
    expect(
      validateRegisterForm('TOURIST', {
        ...TOURIST_FORM,
        fullName: 'a'.repeat(151),
      }).fullName,
    ).toMatch(/150/)
    expect(
      validateRegisterForm('TOURIST', {
        ...TOURIST_FORM,
        dniNumber: '1'.repeat(31),
      }).dniNumber,
    ).toMatch(/30/)
    expect(
      validateRegisterForm('SERVICE_PROVIDER', {
        ...PROVIDER_FORM,
        businessType: 'a'.repeat(51),
      }).businessType,
    ).toMatch(/50/)
  })

  it('valida el correo y la fecha de nacimiento', () => {
    expect(
      validateRegisterForm('TOURIST', { ...TOURIST_FORM, email: 'laura@' }).email,
    ).toMatch(/correo electrónico válido/i)
    expect(
      validateRegisterForm('TOURIST', {
        ...TOURIST_FORM,
        birthDate: '2999-01-01',
      }).birthDate,
    ).toMatch(/anterior a hoy/i)
  })

  it('valida latitud y longitud de la prestadora', () => {
    expect(
      validateRegisterForm('SERVICE_PROVIDER', {
        ...PROVIDER_FORM,
        latitude: '91',
      }).latitude,
    ).toMatch(/-90 y 90/)
    expect(
      validateRegisterForm('SERVICE_PROVIDER', {
        ...PROVIDER_FORM,
        longitude: 'abc',
      }).longitude,
    ).toMatch(/-180 y 180/)
  })
})

describe('mapServerFieldErrors', () => {
  it('mapea cada error del ProblemDetail a su campo, en español', () => {
    const { fields, unmapped } = mapServerFieldErrors({
      phone: 'must match "^[0-9+()\\-\\s]{7,20}$"',
    })

    expect(unmapped).toEqual([])
    expect(fields.phone).toBeTruthy()
    expect(fields.phone).not.toMatch(/must match/i)
  })

  it('deja fuera las claves que no son campos del formulario', () => {
    const { fields, unmapped } = mapServerFieldErrors({ kind: 'x' })
    expect(fields).toEqual({})
    expect(unmapped).toEqual(['kind'])
  })

  it('tolera la ausencia de errors', () => {
    expect(mapServerFieldErrors(undefined)).toEqual({ fields: {}, unmapped: [] })
  })
})

describe('firstInvalidField', () => {
  it('devuelve null cuando el formulario es válido', () => {
    expect(firstInvalidField('TOURIST', TOURIST_FORM)).toBeNull()
  })

  it('devuelve el primer campo inválido en orden de lectura', () => {
    expect(
      firstInvalidField('TOURIST', {
        ...TOURIST_FORM,
        phone: '300 12',
        password: 'corta',
      }),
    ).toBe('phone')
  })

  it('incluye nacionalidad e idioma en el orden y en el gate', () => {
    const order = [...FIELD_ORDER]
    expect(order.indexOf('nationality')).toBeGreaterThan(order.indexOf('dniNumber'))
    expect(order.indexOf('preferredLanguage')).toBeGreaterThan(
      order.indexOf('nationality'),
    )
    expect(order.indexOf('birthDate')).toBeGreaterThan(
      order.indexOf('preferredLanguage'),
    )

    const longNationality = { ...TOURIST_FORM, nationality: 'a'.repeat(81) }
    expect(validateRegisterForm('TOURIST', longNationality).nationality).toMatch(
      /80/,
    )
    expect(firstInvalidField('TOURIST', longNationality)).toBe('nationality')

    const longLanguage = { ...TOURIST_FORM, preferredLanguage: 'a'.repeat(51) }
    expect(
      validateRegisterForm('TOURIST', longLanguage).preferredLanguage,
    ).toMatch(/50/)
    expect(firstInvalidField('TOURIST', longLanguage)).toBe('preferredLanguage')
  })
})
