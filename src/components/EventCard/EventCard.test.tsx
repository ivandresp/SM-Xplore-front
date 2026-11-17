import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import type { EventResponse } from '@/types'
import { formatCurrency } from '@/utils/format'
import { EventCard } from './EventCard'

const event: EventResponse = { id: 'e-1', siteId: 's-1', siteName: 'Lugar oculto', name: 'Festival de prueba', category: 'Cultura', status: 'PUBLISHED', price: 50000,
  maxCapacity: 987, startsAt: '2026-12-01T18:00:00Z', endsAt: '2026-12-01T22:00:00Z', description: 'Descripción oculta', expectedAttendance: 150 }

describe('EventCard', () => {
  it('enlaza la tarjeta entera con fecha, imagen de reserva, nombre, categoría y precio', () => {
    render(<MemoryRouter><EventCard event={event} /></MemoryRouter>)
    const card = screen.getByRole('link', { name: event.name })
    expect(card.getAttribute('href')).toBe('/eventos/e-1')
    expect(card.contains(screen.getByRole('heading', { name: event.name }))).toBe(true)
    expect(card.textContent).toContain('Cultura')
    expect(card.textContent).toContain(formatCurrency(event.price))
    expect(card.textContent).toContain('Sin foto')
    expect(card.querySelector('time')?.getAttribute('datetime')).toBe(event.startsAt)
    expect(card.textContent).not.toContain(event.siteName)
    expect(card.textContent).not.toContain('987')
    expect(card.textContent).not.toContain('Descripción oculta')
    expect(screen.queryByRole('button')).toBeNull()
    expect(card.querySelectorAll('a')).toHaveLength(0)
  })

  it('muestra Gratis para precio cero', () => {
    render(<MemoryRouter><EventCard event={{ ...event, price: 0 }} /></MemoryRouter>)
    expect(screen.getByText('Gratis')).toBeTruthy()
  })
})
