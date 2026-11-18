import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, expect, it, vi } from 'vitest'
import ProviderProfilePage from './ProviderProfilePage'

afterEach(() => vi.unstubAllGlobals())

it.each([
  ['+57 300 123 4567', '+57 300 123 4567'],
  [undefined, 'No publicado'],
])('muestra el teléfono público %s y permite volver sin una sesión', async (publishedPhone, expected) => {
  vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) =>
    Response.json(String(input).includes('/public/users/')
      ? { id: 'p-1', fullName: 'Hotel Marina', role: 'SERVICE_PROVIDER', profile: { websiteUrl: 'https://example.com', phone: publishedPhone } }
      : { content: [], page: 0, size: 100, total: 0, totalPages: 0 }),
  ))
  render(
    <MemoryRouter initialEntries={['/prestadoras/p-1']}>
      <Routes>
        <Route path="/prestadoras/:providerId" element={<ProviderProfilePage />} />
        <Route path="/servicios" element={<h1>Catálogo de servicios</h1>} />
      </Routes>
    </MemoryRouter>,
  )

  await screen.findByRole('heading', { name: 'Ficha de la prestadora' })
  const website = screen.getByText('Sitio web').closest('div')
  const phone = screen.getByText('Teléfono').closest('div')
  expect(website?.nextElementSibling).toBe(phone)
  expect(phone?.textContent).toContain(expected)
  expect(screen.queryByText('El contacto se coordina al confirmar una reserva.')).toBeNull()

  await userEvent.click(screen.getByRole('button', { name: 'Volver' }))
  expect(await screen.findByRole('heading', { name: 'Catálogo de servicios' })).toBeTruthy()
})
