import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { categoriesApi } from '@/services/categoriesApi'
import { servicesApi } from '@/services/servicesApi'
import { sitesApi } from '@/services/sitesApi'
import { zonesApi } from '@/services/zonesApi'
import type { AuthUser, ProviderProfile, ServiceResponse } from '@/types'
import ServiceFormPage from './ServiceFormPage'

const session = vi.hoisted(() => ({ user: null as AuthUser | null }))
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: session.user }) }))
vi.mock('@/components/MapPreview', async () => {
  const { useEffect } = await import('react')
  return { MapPreview: ({ onLoadStateChange }: { onLoadStateChange: (state: 'ready') => void }) => {
    useEffect(() => onLoadStateChange('ready'), [onLoadStateChange])
    return <span>Mapa OpenStreetMap de prueba</span>
  } }
})

const PROFILE: ProviderProfile = { nit: '900123456', businessType: 'Transporte', registrationStatus: 'APROBADO', websiteUrl: null, latitude: 11.24, longitude: -74.2, startOperationDate: null }
const SERVICE: ServiceResponse = { id: 'sv-1', providerId: 'p-1', providerName: 'Empresa', siteId: 's-1', siteName: 'Lugar de prueba', zoneId: 'z-1', zoneName: 'Zona de prueba', categoryId: 'c-1', categoryName: 'Categoría de prueba', name: 'Servicio de prueba', description: '', type: 'TRANSPORT', latitude: 11.24, longitude: -74.2, price: 50, maxCapacity: 10, status: 'PUBLISHED', photosUrls: [], cancellationPolicy: '', createdAt: '', updatedAt: '' }

beforeEach(() => {
  session.user = { id: 'p-1', fullName: 'Empresa', email: 'empresa@example.com', phone: '', role: 'SERVICE_PROVIDER', status: 'ACTIVO', profile: { ...PROFILE }, signedUpAt: '', authVersion: 1 }
  vi.spyOn(categoriesApi, 'list').mockResolvedValue([{ id: 'c-1', name: 'Categoría de prueba', scope: 'SERVICE', parentId: null }, { id: 'general', name: 'Categoría general', scope: 'GENERAL', parentId: null }])
  vi.spyOn(zonesApi, 'list').mockResolvedValue([{ id: 'z-1', name: 'Zona de prueba' }])
  vi.spyOn(sitesApi, 'list').mockResolvedValue({ content: [{ id: 's-1', name: 'Lugar de prueba', zoneId: 'z-1', latitude: 11, longitude: -74, photoUrls: [], categoryId: 'c-1', status: 'PUBLISHED', maxCapacity: 10 }], page: 0, size: 100, total: 1, totalPages: 1 })
  vi.spyOn(servicesApi, 'create').mockResolvedValue(SERVICE)
})
afterEach(() => vi.restoreAllMocks())

async function openForm() {
  const view = render(<MemoryRouter><ServiceFormPage /></MemoryRouter>)
  await screen.findByRole('heading', { name: 'Registrar servicio' })
  const user = userEvent.setup()
  for (const [label, name] of [['Categoría', 'Categoría de prueba'], ['Zona', 'Zona de prueba'], ['Atractivo mas cercano', 'Lugar de prueba']]) {
    await user.click(screen.getByRole('combobox', { name: label }))
    if (label === 'Categoría') {
      expect(categoriesApi.list).toHaveBeenCalledWith('SERVICE')
      expect(screen.queryByRole('option', { name: 'Categoría general' })).toBeNull()
    }
    await user.click(screen.getByRole('option', { name }))
  }
  fireEvent.change(screen.getByLabelText('Nombre del servicio'), { target: { value: 'Servicio de prueba' } })
  fireEvent.change(screen.getByLabelText('Precio por persona (COP)'), { target: { value: '50' } })
  fireEvent.change(screen.getByLabelText('Capacidad máxima'), { target: { value: '10' } })
  return { ...view, user, submit: () => fireEvent.submit(view.container.querySelector('form')!) }
}

describe('ubicación al registrar servicio', () => {
  it.each([[11.24, -74.2], [0, 0]])('usa ubicación de la prestadora %s,%s sin mostrar mapa', async (latitude, longitude) => {
    session.user = { ...session.user!, role: 'SERVICE_PROVIDER', profile: { ...PROFILE, latitude, longitude } }
    const { submit } = await openForm()
    expect((screen.getByRole('radio', { name: 'Usar la misma ubicación de la prestadora' }) as HTMLInputElement).checked).toBe(true)
    expect(screen.queryByLabelText('Latitud')).toBeNull()
    expect(screen.queryByLabelText('Longitud')).toBeNull()
    expect(screen.queryByRole('button', { name: 'Elegir punto en el mapa' })).toBeNull()
    submit()
    await waitFor(() => expect(servicesApi.create).toHaveBeenCalledWith(expect.objectContaining({ latitude, longitude })))
  })

  it('modo diferente exige punto, conserva selección al alternar y envía el punto elegido', async () => {
    const { user, submit } = await openForm()
    const different = screen.getByRole('radio', { name: 'Escoger una ubicación diferente' })
    await user.click(different)
    submit()
    expect(servicesApi.create).not.toHaveBeenCalled()
    const picker = screen.getByRole('button', { name: 'Elegir punto en el mapa' })
    expect(await screen.findByText('Selecciona la ubicación del servicio en el mapa.')).toBeTruthy()
    fireEvent.click(picker, { clientX: 192, clientY: 128, detail: 1 })
    const selected = screen.getByText(/Punto seleccionado:/).textContent
    await user.click(screen.getByRole('radio', { name: 'Usar la misma ubicación de la prestadora' }))
    expect(screen.queryByRole('button', { name: 'Elegir punto en el mapa' })).toBeNull()
    await user.click(different)
    expect(await screen.findByText(/Punto seleccionado:/)).toHaveProperty('textContent', selected)
    submit()
    await waitFor(() => expect(servicesApi.create).toHaveBeenCalledTimes(1))
    const payload = vi.mocked(servicesApi.create).mock.calls[0][0]
    expect(payload.latitude).toBeCloseTo(11.24, 4)
    expect(payload.longitude).toBeGreaterThan(-74.2)
  })

  it.each([null, { ...PROFILE, latitude: null }, { ...PROFILE, longitude: 190 }])('sin coordenadas de perfil válidas obliga a elegir punto y permite borrarlo (%j)', async (profile) => {
    session.user = { ...session.user!, role: 'SERVICE_PROVIDER', profile }
    const { user, submit } = await openForm()
    expect(screen.getByRole('radio', { name: 'Usar la misma ubicación de la prestadora' }).hasAttribute('disabled')).toBe(true)
    const picker = screen.getByRole('button', { name: 'Elegir punto en el mapa' })
    submit()
    expect(servicesApi.create).not.toHaveBeenCalled()
    picker.focus()
    await user.keyboard('{Enter}')
    await user.click(screen.getByRole('button', { name: 'Quitar punto seleccionado' }))
    submit()
    expect(servicesApi.create).not.toHaveBeenCalled()
    expect(screen.getByText('Selecciona la ubicación del servicio en el mapa.')).toBeTruthy()
  })
})
