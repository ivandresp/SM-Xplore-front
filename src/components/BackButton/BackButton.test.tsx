import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { BackButton } from './BackButton'

describe('BackButton', () => {
  it.each(['/app/reportes', '/reportes', '/eventos', '/app/mis-servicios', '/login'])('returns to explicit destination %s from a direct entry', async to => {
    render(<MemoryRouter initialEntries={['/detalle']}><Routes>
      <Route path="/detalle" element={<BackButton to={to} />} />
      <Route path={to} element={<p>Destino de regreso</p>} />
    </Routes></MemoryRouter>)
    const back = screen.getByRole('button', { name: 'Volver' })
    expect(back.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true')
    fireEvent.click(back)
    expect(await screen.findByText('Destino de regreso')).toBeTruthy()
  })
})
