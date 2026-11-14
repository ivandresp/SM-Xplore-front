import { describe, expect, it } from 'vitest'
import { ApiError } from '@/services/httpClient'
import {
  focusFirstInvalid,
  fieldErrorsFrom,
  INVALID_FIELD,
  summaryOf,
} from './formErrors'

const LABELS = { email: 'Correo', password: 'Contraseña' }
const ORDER = ['email', 'password'] as const

function validationError(errors: Record<string, string>) {
  return new ApiError('Bad Request', 400, {
    type: 'about:blank',
    title: 'Bad Request',
    status: 400,
    code: 'VALIDATION_ERROR',
    errors,
  })
}

describe('formErrors', () => {
  it('traduce los errores del backend a mensajes por campo, sin su texto en inglés', () => {
    const result = fieldErrorsFrom(
      validationError({ email: 'must be a well-formed email address' }),
      LABELS,
      ORDER,
    )

    expect(result).not.toBeNull()
    expect(result?.fields.email).toBe(INVALID_FIELD)
    expect(result?.fields.password).toBeUndefined()
    expect(result?.summary).toBe('Revisa los datos: Correo.')
    expect(result?.first).toBe('email')
  })

  it('devuelve null cuando el error no es de validación', () => {
    const unauthorized = new ApiError('Unauthorized', 401, {
      type: 'about:blank',
      title: 'Unauthorized',
      status: 401,
      code: 'INVALID_CREDENTIALS',
    })

    expect(fieldErrorsFrom(unauthorized, LABELS, ORDER)).toBeNull()
    expect(fieldErrorsFrom(new Error('boom'), LABELS, ORDER)).toBeNull()
  })

  it('ignora los campos del backend que el formulario no muestra', () => {
    const result = fieldErrorsFrom(
      validationError({ telefono: 'must match' }),
      LABELS,
      ORDER,
    )

    expect(result).toBeNull()
  })

  it('nombra solo los campos con error en el resumen', () => {
    expect(summaryOf({ password: INVALID_FIELD }, LABELS, ORDER)).toBe(
      'Revisa los datos: Contraseña.',
    )
  })

  it('enfoca el input por nombre', () => {
    document.body.innerHTML = `
      <form>
        <input name="email" />
        <input name="password" type="hidden" />
        <div><button type="button" role="combobox" name="password">Elige</button></div>
      </form>`
    const form = document.querySelector('form')
    const email = document.querySelector<HTMLInputElement>('[name="email"]')
    const trigger = document.querySelector<HTMLElement>('[role="combobox"]')

    focusFirstInvalid(form, 'email')
    expect(document.activeElement).toBe(email)

    focusFirstInvalid(form, 'password')
    expect(document.activeElement).toBe(trigger)
  })

  it('no lanza si el campo no existe', () => {
    document.body.innerHTML = '<form></form>'
    const form = document.querySelector('form')

    expect(() => focusFirstInvalid(form, 'email')).not.toThrow()
    expect(() => focusFirstInvalid(null, 'email')).not.toThrow()
  })
})
