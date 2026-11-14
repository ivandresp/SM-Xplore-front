import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { Button } from './Button'

describe('Button', () => {
  it('en carga anuncia aria-busy, se deshabilita y no dispara el submit', () => {
    const onClick = vi.fn()
    render(
      <Button loading onClick={onClick}>
        Guardar
      </Button>,
    )

    const button = screen.getByRole('button', { name: 'Guardar' })
    expect(button.getAttribute('aria-busy')).toBe('true')
    expect((button as HTMLButtonElement).disabled).toBe(true)
    button.click()
    expect(onClick).not.toHaveBeenCalled()
  })

  it('en carga mantiene el texto y añade el indicador sin anunciarlo', () => {
    const { container } = render(<Button loading>Guardar</Button>)

    expect(screen.getByRole('button', { name: 'Guardar' })).toBeTruthy()
    const spinner = container.querySelector('[aria-hidden="true"]')
    expect(spinner).not.toBeNull()
  })

  it('sin carga no marca aria-busy ni se deshabilita', () => {
    render(<Button>Guardar</Button>)

    const button = screen.getByRole('button', { name: 'Guardar' })
    expect(button.getAttribute('aria-busy')).toBeNull()
    expect((button as HTMLButtonElement).disabled).toBe(false)
    expect(button.getAttribute('type')).toBe('button')
  })
})
