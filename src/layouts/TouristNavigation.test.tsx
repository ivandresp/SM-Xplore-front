import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PublicLayout } from './PublicLayout'

const session = vi.hoisted(() => ({ role: 'TOURIST', logout: vi.fn() }))
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({
  isAuthenticated: true, isRestoring: false,
  user: { id: 'u-1', fullName: 'Laura Mora', role: session.role }, logout: session.logout,
}) }))
const MAIN = ['Para ti', 'Explorar', 'Reportes de seguridad', 'Mi perfil']
const CATALOG = ['Home', 'Atractivos', 'Actividades', 'Eventos', 'Servicios', 'Mis viajes', 'Mis reservas']
function renderAt(path: string) {
  render(<MemoryRouter initialEntries={[path]}><Routes><Route element={<PublicLayout />}><Route path="*" element={<p>Vista de prueba</p>} /></Route></Routes></MemoryRouter>)
}
function navLabels(name = 'Navegación principal') {
  return within(screen.getByRole('navigation', { name })).getAllByRole('link').map(link => link.textContent)
}
beforeEach(() => { session.role = 'TOURIST'; session.logout.mockReset() })

describe('navegación pública del turista', () => {
  it.each(['/recomendaciones', '/reportes', '/reportes/r-1', '/perfil'])('solo ofrece cuatro opciones en %s', path => {
    renderAt(path)
    expect(navLabels()).toEqual(MAIN)
    expect(screen.queryByRole('link', { name: 'Ir al panel' })).toBeNull()
  })
  it.each(['/explorar', '/actividades/a-1', '/eventos', '/eventos/e-1', '/atractivos', '/servicios/sv-1', '/mis-reservas', '/mis-reservas/r-1', '/itinerario'])('en %s ofrece catálogos y Home', path => {
    renderAt(path)
    expect(navLabels()).toEqual(CATALOG)
    expect(screen.getByRole('link', { name: 'Home' }).getAttribute('href')).toBe('/recomendaciones')
    expect(screen.getByRole('link', { name: 'Mis viajes' }).getAttribute('href')).toBe('/itinerario')
    expect(screen.getByRole('link', { name: 'Mis reservas' }).getAttribute('href')).toBe('/mis-reservas')
  })
  it('Explorar abre los catálogos y Home devuelve el menú habitual', async () => {
    const user = userEvent.setup()
    renderAt('/recomendaciones')
    await user.click(screen.getByRole('link', { name: 'Explorar' }))
    expect(navLabels()).toEqual(CATALOG)
    await user.click(screen.getByRole('link', { name: 'Home' }))
    expect(navLabels()).toEqual(MAIN)
    expect(screen.getByRole('link', { name: 'Para ti' }).getAttribute('aria-current')).toBe('page')
  })
  it('el menú móvil utiliza las mismas cuatro opciones', async () => {
    const user = userEvent.setup()
    renderAt('/reportes/r-1')
    await user.click(screen.getByRole('button', { name: 'Abrir menú' }))
    expect(navLabels('Menú principal')).toEqual(MAIN)
    expect(within(screen.getByRole('navigation', { name: 'Menú principal' })).getByRole('link', { name: 'Reportes de seguridad' }).getAttribute('aria-current')).toBe('page')
  })
  it('permite cerrar sesión sin entrar a un panel', async () => {
    const user = userEvent.setup()
    renderAt('/recomendaciones')
    await user.click(screen.getByRole('button', { name: 'Salir' }))
    expect(session.logout).toHaveBeenCalledTimes(1)
  })
  it('otros roles conservan Ir al panel y navegación de catálogo', () => {
    session.role = 'GUIDE'
    renderAt('/perfil')
    expect(screen.getByRole('link', { name: 'Ir al panel' }).getAttribute('href')).toBe('/app')
    expect(navLabels()).toEqual(['Atractivos', 'Actividades', 'Eventos', 'Servicios'])
  })
})
