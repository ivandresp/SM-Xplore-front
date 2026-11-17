import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { GuideReportRedirect, PanelReportsPage } from './ReportRoutes'

const session = vi.hoisted(() => ({ role: 'GUIDE' }))
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: { role: session.role } }) }))
vi.mock('./pages', () => ({
  MyReportsPage: () => <h1>Mis reportes de prueba</h1>,
  ManageReportsPage: () => <h1>Gestión global de prueba</h1>,
}))

function Destination() {
  const location = useLocation()
  return <output aria-label="Destino">{location.pathname}{location.search}{location.hash}</output>
}
function renderRedirect(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/reportes/*" element={<GuideReportRedirect><p>Reporte público de prueba</p></GuideReportRedirect>} />
        <Route path="/app/reportes/*" element={<Destination />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('GuideReportRedirect', () => {
  beforeEach(() => { session.role = 'GUIDE' })

  it.each(['/reportes', '/reportes/r-1', '/reportes/nuevo'])(
    'redirige al guía desde %s preservando consulta y fragmento', async path => {
      renderRedirect(`${path}?status=RESOLVED&page=2#foto`)
      expect((await screen.findByLabelText('Destino')).textContent).toBe(`/app${path}?status=RESOLVED&page=2#foto`)
      expect(screen.queryByText('Reporte público de prueba')).toBeNull()
    },
  )

  it.each(['TOURIST', 'SERVICE_PROVIDER'])(
    'mantiene la vista pública para %s', role => {
      session.role = role
      renderRedirect('/reportes/r-1?photo=2#foto')
      expect(screen.getByText('Reporte público de prueba')).toBeTruthy()
      expect(screen.queryByLabelText('Destino')).toBeNull()
    },
  )
})

describe('PanelReportsPage', () => {
  it('presenta los reportes propios al guía', () => {
    session.role = 'GUIDE'
    render(<MemoryRouter><PanelReportsPage /></MemoryRouter>)
    expect(screen.getByRole('heading', { name: 'Mis reportes de prueba' })).toBeTruthy()
    expect(screen.queryByRole('heading', { name: 'Gestión global de prueba' })).toBeNull()
  })

  it.each(['ADMIN', 'DESTINATION_MANAGER'])('presenta la gestión global a %s', role => {
    session.role = role
    render(<MemoryRouter><PanelReportsPage /></MemoryRouter>)
    expect(screen.getByRole('heading', { name: 'Gestión global de prueba' })).toBeTruthy()
    expect(screen.queryByRole('heading', { name: 'Mis reportes de prueba' })).toBeNull()
  })
})
