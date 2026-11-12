import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { SelectField } from './SelectField'
import type { SelectOption } from './SelectField'

const OPTIONS: SelectOption[] = [
  { value: 'GUIDE', label: 'Guia' },
  { value: 'SERVICE_PROVIDER', label: 'Prestadora' },
  { value: 'ADMIN', label: 'Administrador' },
]

const GROUPED = [
  { label: 'Centro', options: [{ value: 'c-1', label: 'Catedral' }] },
  { label: 'Rodadero', options: [{ value: 'r-1', label: 'Playa Blanca' }] },
]

function Harness({
  onChange,
  initial = 'GUIDE',
}: {
  onChange?: (value: string) => void
  initial?: string
}) {
  const [value, setValue] = useState(initial)
  return (
    <SelectField
      label="Rol"
      options={OPTIONS}
      value={value}
      onChange={(event) => {
        onChange?.(event.target.value)
        setValue(event.target.value)
      }}
    />
  )
}

function optionId(combobox: HTMLElement, index: number) {
  return `${combobox.id}-opt-${index}`
}

describe('SelectField (combobox ARIA 1.2)', () => {
  it('asocia la etiqueta con htmlFor y anuncia el valor controlado', () => {
    render(<Harness />)

    const combobox = screen.getByRole('combobox', { name: 'Rol' })

    expect(combobox.getAttribute('aria-expanded')).toBe('false')
    expect(combobox.textContent).toContain('Guia')
    expect(screen.queryByRole('listbox')).toBeNull()
    const label = document.querySelector(`label[for="${combobox.id}"]`)
    expect(label?.textContent).toBe('Rol')
  })

  it('abre con flecha abajo y expone aria-activedescendant sobre la opcion activa', async () => {
    const user = userEvent.setup()
    render(<Harness />)

    const combobox = screen.getByRole('combobox', { name: 'Rol' })
    combobox.focus()
    await user.keyboard('{ArrowDown}')

    expect(combobox.getAttribute('aria-expanded')).toBe('true')
    expect(screen.getByRole('listbox')).toBeTruthy()
    expect(combobox.getAttribute('aria-activedescendant')).toBe(
      optionId(combobox, 0),
    )
    expect(
      document.getElementById(optionId(combobox, 0))?.getAttribute('aria-selected'),
    ).toBe('true')
  })

  it('navega con flechas, Home y End', async () => {
    const user = userEvent.setup()
    render(<Harness />)

    const combobox = screen.getByRole('combobox', { name: 'Rol' })
    combobox.focus()
    await user.keyboard('{ArrowDown}')

    await user.keyboard('{ArrowDown}')
    expect(combobox.getAttribute('aria-activedescendant')).toBe(
      optionId(combobox, 1),
    )

    await user.keyboard('{ArrowUp}')
    expect(combobox.getAttribute('aria-activedescendant')).toBe(
      optionId(combobox, 0),
    )

    await user.keyboard('{End}')
    expect(combobox.getAttribute('aria-activedescendant')).toBe(
      optionId(combobox, 2),
    )

    await user.keyboard('{Home}')
    expect(combobox.getAttribute('aria-activedescendant')).toBe(
      optionId(combobox, 0),
    )
  })

  it('selecciona con Enter y actualiza el valor controlado', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<Harness onChange={onChange} />)

    const combobox = screen.getByRole('combobox', { name: 'Rol' })
    combobox.focus()
    await user.keyboard('{ArrowDown}{ArrowDown}{Enter}')

    expect(onChange).toHaveBeenCalledWith('SERVICE_PROVIDER')
    expect(combobox.getAttribute('aria-expanded')).toBe('false')
    expect(combobox.textContent).toContain('Prestadora')
  })

  it('cierra con Escape sin cambiar el valor', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<Harness onChange={onChange} />)

    const combobox = screen.getByRole('combobox', { name: 'Rol' })
    combobox.focus()
    await user.keyboard('{ArrowDown}{ArrowDown}{Escape}')

    expect(onChange).not.toHaveBeenCalled()
    expect(combobox.getAttribute('aria-expanded')).toBe('false')
    expect(combobox.textContent).toContain('Guia')
    expect(document.activeElement).toBe(combobox)
  })

  it('cierra con Tab y deja seguir el flujo de foco', async () => {
    const user = userEvent.setup()
    render(<Harness />)

    const combobox = screen.getByRole('combobox', { name: 'Rol' })
    combobox.focus()
    await user.keyboard('{ArrowDown}{Tab}')

    expect(combobox.getAttribute('aria-expanded')).toBe('false')
    expect(document.activeElement).not.toBe(combobox)
  })

  it('escribe para saltar a la opcion que empieza por esa letra', async () => {
    const user = userEvent.setup()
    render(<Harness />)

    const combobox = screen.getByRole('combobox', { name: 'Rol' })
    combobox.focus()
    await user.keyboard('{ArrowDown}')
    await user.keyboard('p')

    expect(combobox.getAttribute('aria-activedescendant')).toBe(
      optionId(combobox, 1),
    )
  })

  it('selecciona con el raton', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<Harness onChange={onChange} />)

    const combobox = screen.getByRole('combobox', { name: 'Rol' })
    await user.click(combobox)
    await user.click(screen.getByRole('option', { name: 'Administrador' }))

    expect(onChange).toHaveBeenCalledWith('ADMIN')
    expect(combobox.textContent).toContain('Administrador')
  })

  it('cierra al pulsar fuera', async () => {
    const user = userEvent.setup()
    render(
      <div>
        <Harness />
        <p>Fuera</p>
      </div>,
    )

    const combobox = screen.getByRole('combobox', { name: 'Rol' })
    await user.click(combobox)
    expect(combobox.getAttribute('aria-expanded')).toBe('true')

    await user.click(screen.getByText('Fuera'))
    expect(combobox.getAttribute('aria-expanded')).toBe('false')
  })

  it('agrupa las opciones con role group y aria-label', async () => {
    const user = userEvent.setup()
    render(
      <SelectField
        label="Atractivo"
        groups={GROUPED}
        placeholder="Todos los atractivos"
        value=""
        onChange={vi.fn()}
      />,
    )

    const combobox = screen.getByRole('combobox', { name: 'Atractivo' })
    await user.click(combobox)

    expect(screen.getByRole('group', { name: 'Centro' })).toBeTruthy()
    expect(screen.getByRole('group', { name: 'Rodadero' })).toBeTruthy()
    expect(screen.getByRole('option', { name: 'Todos los atractivos' })).toBeTruthy()
    expect(screen.getByRole('option', { name: 'Catedral' })).toBeTruthy()
  })

  it('anuncia pista y error con aria-describedby y aria-invalid', () => {
    render(
      <SelectField
        id="rol"
        label="Rol"
        options={OPTIONS}
        value=""
        hint="Solo roles internos."
        error="Elige un rol."
        onChange={vi.fn()}
      />,
    )

    const combobox = screen.getByRole('combobox', { name: 'Rol' })
    expect(combobox.getAttribute('aria-describedby')).toBe(
      'rol-hint rol-error',
    )
    expect(combobox.getAttribute('aria-invalid')).toBe('true')
  })

  it('no abre si esta deshabilitado', async () => {
    const user = userEvent.setup()
    render(
      <SelectField
        label="Zona"
        options={OPTIONS}
        value=""
        disabled
        onChange={vi.fn()}
      />,
    )

    const combobox = screen.getByRole('combobox', { name: 'Zona' }) as HTMLButtonElement
    await user.click(combobox)

    expect(combobox.disabled).toBe(true)
    expect(combobox.getAttribute('aria-expanded')).toBe('false')
  })
})
