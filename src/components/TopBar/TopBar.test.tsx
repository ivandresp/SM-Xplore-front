import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
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

/** El menú móvil duplica los enlaces: se consulta dentro de su nav. */
function mobileMenu() {
  return within(screen.getByRole('navigation', { name: 'Menú principal' }))
}

describe('TopBar: menu movil', () => {
  it('abre con aria-expanded, lleva el foco al primer enlace y cierra con Esc', async () => {
    const user = userEvent.setup()
    renderBar('/explorar')

    const toggle = screen.getByRole('button', { name: 'Abrir menú' })
    expect(toggle.getAttribute('aria-expanded')).toBe('false')

    await user.click(toggle)

    expect(
      screen.getByRole('button', { name: 'Cerrar menú' }).getAttribute(
        'aria-expanded',
      ),
    ).toBe('true')
    expect(document.activeElement).toBe(
      mobileMenu().getByRole('link', { name: 'Atractivos' }),
    )

    await user.keyboard('{Escape}')

    expect(toggle.getAttribute('aria-expanded')).toBe('false')
    expect(screen.queryByRole('navigation', { name: 'Menú principal' })).toBeNull()
    expect(document.activeElement).toBe(toggle)
  })

  it('mantiene el foco dentro del panel al tabular', async () => {
    const user = userEvent.setup()
    renderBar('/explorar')

    await user.click(screen.getByRole('button', { name: 'Abrir menú' }))

    await user.tab({ shift: true })
    expect(document.activeElement).toBe(
      mobileMenu().getByRole('link', { name: 'Eventos' }),
    )

    await user.tab()
    expect(document.activeElement).toBe(
      mobileMenu().getByRole('link', { name: 'Atractivos' }),
    )
  })

  it('cierra el panel al elegir un enlace y marca la ruta activa dentro', async () => {
    const user = userEvent.setup()
    renderBar('/explorar')

    await user.click(screen.getByRole('button', { name: 'Abrir menú' }))

    expect(
      mobileMenu().getByRole('link', { name: 'Actividades' }).getAttribute(
        'aria-current',
      ),
    ).toBe('page')

    await user.click(mobileMenu().getByRole('link', { name: 'Eventos' }))

    expect(screen.queryByRole('navigation', { name: 'Menú principal' })).toBeNull()
  })

  it('acepta secciones propias del menu sin duplicar la navegacion de escritorio', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <TopBar
          links={[]}
          menuLinks={[
            { to: '/app', label: 'Dashboard' },
            { to: '/app/usuarios', label: 'Usuarios' },
          ]}
          currentPath="/app/usuarios"
        />
      </MemoryRouter>,
    )

    expect(
      screen.queryByRole('navigation', { name: 'Navegación principal' }),
    ).toBeNull()

    await user.click(screen.getByRole('button', { name: 'Abrir menú' }))

    expect(
      mobileMenu().getByRole('link', { name: 'Usuarios' }).getAttribute(
        'aria-current',
      ),
    ).toBe('page')
    expect(mobileMenu().getByRole('link', { name: 'Dashboard' })).toBeTruthy()
  })

  it('no renderiza el boton si no hay enlaces de menu', () => {
    render(
      <MemoryRouter>
        <TopBar links={[]} />
      </MemoryRouter>,
    )

    expect(screen.queryByRole('button', { name: 'Abrir menú' })).toBeNull()
  })
})