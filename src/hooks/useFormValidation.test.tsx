import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useRef, useState } from 'react'
import { describe, expect, it } from 'vitest'
import { ApiError } from '@/services/httpClient'
import { useFormValidation } from './useFormValidation'

const LABELS = { email: 'Correo', password: 'Contraseña' }
const ORDER = ['email', 'password'] as const

const validationError = () =>
  new ApiError('Bad Request', 400, {
    type: 'about:blank',
    title: 'Bad Request',
    status: 400,
    code: 'VALIDATION_ERROR',
    errors: { email: 'must be a well-formed email address' },
  })

function Harness() {
  const [values, setValues] = useState({ email: '', password: '' })
  const formRef = useRef<HTMLFormElement>(null)
  const form = useFormValidation({
    values,
    validate: (current) => ({
      ...(current.email === '' ? { email: 'Falta el correo.' } : {}),
      ...(current.password === '' ? { password: 'Falta la contraseña.' } : {}),
    }),
    labels: LABELS,
    order: ORDER,
    formRef,
  })

  return (
    <form
      ref={formRef}
      onSubmit={(event) => {
        event.preventDefault()
        form.blocked()
      }}
    >
      <label htmlFor="email">Correo</label>
      <input
        id="email"
        name="email"
        value={values.email}
        onChange={(event) => setValues({ ...values, email: event.target.value })}
        onBlur={() => form.markTouched('email')}
      />
      {form.errorOf('email') !== undefined && (
        <p id="email-error">{form.errorOf('email')}</p>
      )}

      <label htmlFor="password">Contraseña</label>
      <input
        id="password"
        name="password"
        type="password"
        value={values.password}
        onChange={(event) => setValues({ ...values, password: event.target.value })}
      />
      {form.errorOf('password') !== undefined && (
        <p id="password-error">{form.errorOf('password')}</p>
      )}

      {form.summary !== null && <p role="alert">{form.summary}</p>}

      <button type="submit">Enviar</button>
      <button
        type="button"
        onClick={() => form.applyValidationErrors(validationError())}
      >
        Simular servidor
      </button>
    </form>
  )
}

describe('useFormValidation', () => {
  it('no marca nada antes de tocar el campo ni de intentar enviar', () => {
    render(<Harness />)

    expect(screen.queryByText('Falta el correo.')).toBeNull()
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('al enviar marca los campos, resume y enfoca el primero', async () => {
    const user = userEvent.setup()
    render(<Harness />)

    await user.click(screen.getByRole('button', { name: 'Enviar' }))

    expect(screen.getByText('Falta el correo.')).toBeTruthy()
    expect(screen.getByText('Falta la contraseña.')).toBeTruthy()
    expect(screen.getByRole('alert').textContent).toBe(
      'Revisa los datos: Correo, Contraseña.',
    )
    expect(document.activeElement?.id).toBe('email')
  })

  it('con un solo campo inválido no pinta resumen', async () => {
    const user = userEvent.setup()
    render(<Harness />)

    await user.type(screen.getByLabelText('Correo'), 'ana@correo.com')
    await user.click(screen.getByRole('button', { name: 'Enviar' }))

    expect(screen.getByText('Falta la contraseña.')).toBeTruthy()
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('mapea los errores del backend al campo y no muestra su texto', async () => {
    const user = userEvent.setup()
    render(<Harness />)

    await user.click(screen.getByRole('button', { name: 'Simular servidor' }))

    expect(screen.getByText('Revisa este campo.')).toBeTruthy()
    expect(screen.queryByText(/well-formed/)).toBeNull()
    expect(document.activeElement?.id).toBe('email')
  })
})
