import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { SelectField } from './FormField'

const OPTIONS = [
  { value: 'TOURIST', label: 'Turista' },
  { value: 'GUIDE', label: 'Guía turístico' },
  { value: 'SERVICE_PROVIDER', label: 'Prestadora de servicios' },
]

describe('FormField.SelectField', () => {
  it('renderiza el combobox accesible y ningún select nativo', () => {
    render(
      <SelectField
        label="Tipo de cuenta"
        options={OPTIONS}
        value="TOURIST"
        onChange={() => {}}
      />,
    )

    const combobox = screen.getByRole('combobox', { name: 'Tipo de cuenta' })
    expect(combobox.getAttribute('aria-expanded')).toBe('false')
    expect(combobox.textContent).toContain('Turista')
    expect(document.querySelector('select')).toBeNull()
  })

  it('emite el valor con la forma del select nativo al elegir con teclado', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()

    render(
      <SelectField
        label="Tipo de cuenta"
        options={OPTIONS}
        value="TOURIST"
        onChange={onChange}
      />,
    )

    const combobox = screen.getByRole('combobox', { name: 'Tipo de cuenta' })
    combobox.focus()
    await user.keyboard('{ArrowDown}{ArrowDown}{Enter}')

    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange.mock.calls[0][0].target.value).toBe('GUIDE')
  })

  it('propaga onBlur al salir del disparador', async () => {
    const onBlur = vi.fn()
    const user = userEvent.setup()

    render(
      <SelectField
        label="Tipo de cuenta"
        options={OPTIONS}
        value="TOURIST"
        onChange={() => {}}
        onBlur={onBlur}
      />,
    )

    await user.click(screen.getByRole('combobox', { name: 'Tipo de cuenta' }))
    await user.tab()

    expect(onBlur).toHaveBeenCalledTimes(1)
  })
})
