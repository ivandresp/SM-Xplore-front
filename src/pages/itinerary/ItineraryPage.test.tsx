import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import ItineraryPage from './ItineraryPage'

const create = vi.hoisted(() => vi.fn())
vi.mock('@/services/reservationsApi', () => ({ reservationsApi: { create } }))
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: { id: 'tourist' } }) }))
const site = { itemId: 's1', type: 'SITE', name: 'Tayrona', startsAt: '2026-12-02T12:00:00', price: 0 }
const activity = { itemId: 'a1', type: 'ACTIVITY', name: 'Paseo', startsAt: '2026-12-01T12:00:00', price: 100 }
function setup(entries: unknown[]) {
  localStorage.setItem('sm-xplore:itinerary', JSON.stringify({ name: 'Viaje', from: '2026-12-01', to: '2026-12-05', entries }))
  return render(<MemoryRouter><ItineraryPage /></MemoryRouter>)
}
beforeEach(() => { localStorage.clear(); create.mockReset(); create.mockResolvedValue({ id: 'r1' }) })
describe('itinerary with site visits', () => {
  it('reserves only activities/events from a mixed itinerary', async () => {
    setup([site, activity, { ...activity, itemId: 'e1', type: 'EVENT' }])
    fireEvent.click(screen.getByRole('button', { name: 'Reservar pendientes' }))
    await waitFor(() => expect(create).toHaveBeenCalledTimes(2))
    expect(create.mock.calls.map(call => call[0].itemType)).toEqual(['ACTIVITY', 'EVENT'])
    expect(screen.getByText('No requiere reserva')).toBeTruthy()
    await screen.findByText('Reservas creadas. Puedes verlas en "Mis reservas".')
    expect(JSON.parse(localStorage.getItem('sm-xplore:itinerary')!).entries[0].reservationId).toBeUndefined()
  })
  it('does not offer site reservations and persists a changed visit date in order', () => {
    setup([site, activity])
    const input = screen.getByLabelText('Fecha de visita a Tayrona') as HTMLInputElement
    expect(input.min).toBe('2026-12-01')
    expect(input.max).toBe('2026-12-05')
    fireEvent.change(input, { target: { value: '2026-12-01' } })
    expect(JSON.parse(localStorage.getItem('sm-xplore:itinerary')!).entries[0].startsAt).toBe('2026-12-01T12:00:00')
    expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(1)
    const movedInput = screen.getByLabelText('Fecha de visita a Tayrona') as HTMLInputElement
    fireEvent.change(movedInput, { target: { value: '2026-12-10' } })
    expect(movedInput.value).toBe('2026-12-01')
  })
  it('warns when shortening a trip leaves a visit outside its dates', () => {
    setup([site])
    fireEvent.change(screen.getByLabelText('Desde'), { target: { value: '2026-12-03' } })
    expect(screen.getByText('Revisa las fechas de visita')).toBeTruthy()
    expect((screen.getByRole('button', { name: 'Guardar itinerario' }) as HTMLButtonElement).disabled).toBe(true)
    fireEvent.change(screen.getByLabelText('Fecha de visita a Tayrona'), { target: { value: '2026-12-04' } })
    expect(screen.queryByText('Revisa las fechas de visita')).toBeNull()
    expect((screen.getByRole('button', { name: 'Guardar itinerario' }) as HTMLButtonElement).disabled).toBe(false)
  })
  it('disables reservation action when all items are sites', () => {
    setup([site])
    expect((screen.getByRole('button', { name: 'Reservar pendientes' }) as HTMLButtonElement).disabled).toBe(true)
    expect(screen.queryByRole('button', { name: 'Reservar' })).toBeNull()
    expect(create).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Quitar' }))
    expect(screen.getByText('Todavía no has agregado nada')).toBeTruthy()
  })
})
