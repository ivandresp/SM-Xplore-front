import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { expect, it } from 'vitest'
import { SiteCard } from './SiteCard'

it('enlaza toda la tarjeta al detalle sin coordenadas ni botón anidado', () => {
  render(<MemoryRouter><SiteCard site={{ id: 'site-1', name: 'Playa de prueba', zoneId: 'z-1', categoryId: 'c-1',
    latitude: 11.26, longitude: -74.19, photoUrls: ['https://example.com/photo.jpg'], status: 'PUBLISHED', maxCapacity: 10 }}
    zoneName="Zona de prueba" categoryName="Playa" /></MemoryRouter>)
  const link = screen.getByRole('link', { name: 'Playa de prueba' })
  expect(link.getAttribute('href')).toBe('/atractivos/site-1')
  expect(link.contains(screen.getByRole('heading', { name: 'Playa de prueba' }))).toBe(true)
  expect(link.querySelector('img')).toBeTruthy()
  expect(link.contains(screen.getByText('Zona de prueba'))).toBe(true)
  expect(screen.queryByRole('button')).toBeNull()
  expect(link.textContent).not.toContain('11.2600')
  expect(link.textContent).not.toContain('-74.1900')
})
