import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { AuthProvider } from '@/context/AuthProvider'
import { PublicLayout } from './PublicLayout'

function renderAt(entry: string) {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <AuthProvider>
        <Routes>
          <Route element={<PublicLayout />}>
            <Route path="/explorar" element={<p>Catalogo</p>} />
            <Route path="/actividades/:activityId" element={<p>Detalle</p>} />
            <Route path="/atractivos" element={<p>Atractivos</p>} />
          </Route>
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  )
}

describe('PublicLayout', () => {
  it('marca Actividades en el detalle /actividades/:id', () => {
    renderAt('/actividades/a-1')

    expect(
      screen.getByRole('link', { name: 'Actividades' }).getAttribute('aria-current'),
    ).toBe('page')
  })

  it('marca Actividades en /explorar y deja el resto sin aria-current', () => {
    renderAt('/explorar')

    expect(
      screen.getByRole('link', { name: 'Actividades' }).getAttribute('aria-current'),
    ).toBe('page')
    expect(
      screen.getByRole('link', { name: 'Atractivos' }).getAttribute('aria-current'),
    ).toBeNull()
  })
})
