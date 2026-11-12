import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { TopBar } from './TopBar'

const LINKS = [
  { to: '/atractivos', label: 'Atractivos' },
  { to: '/explorar', label: 'Actividades' },
  { to: '/eventos', label: 'Eventos' },
]

function renderBar(currentPath: string, tone: 'light' | 'dark' = 'light') {
  return render(
    <MemoryRouter>
      <TopBar tone={tone} currentPath={currentPath} links={LINKS} />
    </MemoryRouter>,
  )
}

describe('TopBar', () => {
  it('marca la ruta activa con aria-current=page y solo esa', () => {
    renderBar('/explorar')

    expect(
      screen.getByRole('link', { name: 'Actividades' }).getAttribute('aria-current'),
    ).toBe('page')
    expect(
      screen.getByRole('link', { name: 'Eventos' }).getAttribute('aria-current'),
    ).toBeNull()
    expect(
      screen.getByRole('link', { name: 'Atractivos' }).getAttribute('aria-current'),
    ).toBeNull()
  })

  it('mantiene la ruta activa en las subrutas del catalogo', () => {
    renderBar('/explorar/a-1')

    expect(
      screen.getByRole('link', { name: 'Actividades' }).getAttribute('aria-current'),
    ).toBe('page')
  })

  it('no confunde rutas que solo comparten prefijo de texto', () => {
    renderBar('/eventos-antiguos')

    expect(
      screen.getByRole('link', { name: 'Eventos' }).getAttribute('aria-current'),
    ).toBeNull()
  })

  it('acepta alias de ruta para los detalles que no comparten prefijo', () => {
    render(
      <MemoryRouter>
        <TopBar
          currentPath="/actividades/a-1"
          links={[
            { to: '/explorar', label: 'Actividades', aliases: ['/actividades'] },
          ]}
        />
      </MemoryRouter>,
    )

    expect(
      screen.getByRole('link', { name: 'Actividades' }).getAttribute('aria-current'),
    ).toBe('page')
  })

  it('marca la ruta activa tambien en la barra oscura', () => {
    renderBar('/eventos', 'dark')

    expect(
      screen.getByRole('link', { name: 'Eventos' }).getAttribute('aria-current'),
    ).toBe('page')
  })
})
