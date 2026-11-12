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

  it('la variante activity-card replica media, dos lineas de metadatos, precio y accion', () => {
    render(<Skeleton variant="activity-card" count={2} label="Cargando actividades" />)
    const status = screen.getByRole('status')
    expect(status.children.length).toBe(2)
    expect(status.firstElementChild?.children.length).toBe(5)
  })

  it('la variante site-card no dibuja precio', () => {
    render(<Skeleton variant="site-card" count={2} label="Cargando atractivos" />)
    const status = screen.getByRole('status')
    expect(status.firstElementChild?.children.length).toBe(4)
  })

  it('la variante row replica la fila del listado de eventos', () => {
    render(<Skeleton variant="row" count={3} label="Cargando eventos" />)
    const status = screen.getByRole('status')
    expect(status.children.length).toBe(3)
    expect(status.firstElementChild?.children.length).toBe(4)
  })
})