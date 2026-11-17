import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { HomeRedirect, TouristPanelRedirect } from './TouristRoutes'

const session = vi.hoisted(() => ({ role: 'TOURIST' as string | null, isRestoring: false }))
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: session.role === null ? null : { role: session.role }, isRestoring: session.isRestoring }) }))
function Destination() {
  const location = useLocation()
  return <output aria-label="Destino">{location.pathname}{location.search}{location.hash}</output>
}
beforeEach(() => { session.role = 'TOURIST'; session.isRestoring = false })

describe('destinos turista', () => {
  it.each([
    ['/app', '/recomendaciones'],
    ['/app/perfil', '/perfil'],
    ['/app/explorar', '/explorar'],
    ['/app/mis-reservas', '/mis-reservas'],
    ['/app/mis-reservas/r-1', '/mis-reservas/r-1'],
    ['/app/reportes/r-1', '/reportes/r-1'],
    ['/app/reportes/nuevo', '/reportes/nuevo'],
    ['/app/usuarios', '/recomendaciones'],
  ])('convierte %s en %s conservando query y hash', async (from, to) => {
    render(<MemoryRouter initialEntries={[`${from}?tab=1#datos`]}><Routes>
      <Route path="/app/*" element={<TouristPanelRedirect><p>Panel de gestión</p></TouristPanelRedirect>} />
      <Route path="*" element={<Destination />} />
    </Routes></MemoryRouter>)
    expect((await screen.findByLabelText('Destino')).textContent).toBe(`${to}?tab=1#datos`)
    expect(screen.queryByText('Panel de gestión')).toBeNull()
  })

  it.each(['GUIDE', 'SERVICE_PROVIDER', 'ADMIN', 'DESTINATION_MANAGER'])('conserva panel de %s', role => {
    session.role = role
    render(<MemoryRouter><TouristPanelRedirect><p>Panel de gestión</p></TouristPanelRedirect></MemoryRouter>)
    expect(screen.getByText('Panel de gestión')).toBeTruthy()
  })

  it.each([['TOURIST', '/recomendaciones'], [null, '/explorar'], ['GUIDE', '/explorar']])('inicio con rol %s lleva a %s', async (role, to) => {
    session.role = role
    render(<MemoryRouter><Routes><Route path="/" element={<HomeRedirect />} /><Route path="*" element={<Destination />} /></Routes></MemoryRouter>)
    expect((await screen.findByLabelText('Destino')).textContent).toBe(to)
  })

  it('espera la restauración antes de decidir inicio', () => {
    session.isRestoring = true
    session.role = null
    render(<MemoryRouter><Routes><Route path="/" element={<HomeRedirect />} /><Route path="*" element={<Destination />} /></Routes></MemoryRouter>)
    expect(screen.queryByLabelText('Destino')).toBeNull()
  })
})
