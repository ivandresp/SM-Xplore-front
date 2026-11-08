import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Skeleton } from './Skeleton'

describe('Skeleton', () => {
  it('anuncia la carga con un texto por defecto', () => {
    render(<Skeleton />)
    expect(screen.getByRole('status').getAttribute('aria-label')).toBe('Cargando')
  })

  it('dibuja tantos bloques como se piden', () => {
    render(<Skeleton variant="table" count={5} label="Cargando reservas" />)
    const status = screen.getByRole('status')
    expect(status.getAttribute('aria-label')).toBe('Cargando reservas')
    expect(status.children.length).toBe(5)
  })
})
