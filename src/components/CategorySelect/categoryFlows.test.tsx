import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { activitiesApi } from '@/services/activitiesApi'
import { categoriesApi } from '@/services/categoriesApi'
import { eventsApi } from '@/services/eventsApi'
import { sitesApi } from '@/services/sitesApi'
import { zonesApi } from '@/services/zonesApi'
import ActivityFormPage from '@/pages/guide/ActivityFormPage'
import EventFormPage from '@/pages/events/EventFormPage'
import EventListPage from '@/pages/events/EventListPage'
import ExplorePage from '@/pages/catalog/ExplorePage'

vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: { id: 'g-1' }, isAuthenticated: true }) }))
const emptyPage = { content: [], page: 0, size: 100, total: 0, totalPages: 0 }
const activity = {
  id: 'a-1', siteId: 's-1', guideId: 'g-1', name: 'Experiencia', category: 'Sol', status: 'DRAFT' as const,
  price: 10, maxCapacity: 5, durationMinutes: 60, startsAt: '2026-12-01T08:00:00Z', endsAt: '2026-12-01T12:00:00Z', description: null,
}

beforeEach(() => {
  vi.spyOn(categoriesApi, 'listPage').mockImplementation(async ({ scope }) => ({
    ...emptyPage, totalPages: 1, total: 1,
    content: [{ id: `${scope}-1`, name: scope === 'GENERAL' ? 'Fe' : 'Específica', scope: scope!, parentId: null }],
  }))
  vi.spyOn(zonesApi, 'list').mockResolvedValue([])
  vi.spyOn(sitesApi, 'list').mockResolvedValue({ ...emptyPage, content: [{ id: 's-1', zoneId: 'z-1', name: 'Lugar', latitude: 11, longitude: -74, photoUrls: [], categoryId: null, maxCapacity: 10, status: 'PUBLISHED' }] })
})
afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

async function choose(label: string, option: string) {
  const user = userEvent.setup()
  const trigger = await screen.findByRole('combobox', { name: label })
  await waitFor(() => expect(trigger.hasAttribute('disabled')).toBe(false))
  await user.click(trigger)
  await user.click(screen.getByRole('option', { name: option }))
}

describe('categorías en filtros y creación', () => {
  it.each([
    ['ACTIVITY', ExplorePage, activitiesApi],
    ['EVENT', EventListPage, eventsApi],
  ] as const)('%s filtra por una categoría general corta sin debounce de texto y permite limpiar', async (scope, Page, api) => {
    const request = vi.spyOn(api, 'list').mockResolvedValue(emptyPage)
    render(<MemoryRouter><Page /></MemoryRouter>)
    fireEvent.click(screen.getByRole('button', { name: 'Filtros' }))
    await choose('Categoría', 'Fe')
    await waitFor(() => expect(request).toHaveBeenLastCalledWith(expect.objectContaining({ category: 'Fe' })))
    expect(categoriesApi.listPage).toHaveBeenCalledWith({ scope, page: 0, size: 100 })
    expect(screen.queryByRole('searchbox', { name: 'Categoría' })).toBeNull()
    await choose('Categoría', 'Todas las categorías')
    await waitFor(() => expect(request).toHaveBeenLastCalledWith(expect.objectContaining({ category: undefined })))
  })

  it.each([
    ['ACTIVITY', ActivityFormPage],
    ['EVENT', EventFormPage],
  ] as const)('%s exige una categoría y envía su nombre y la URL de portada al crear', async (scope, Page) => {
    const createActivity = vi.spyOn(activitiesApi, 'create').mockResolvedValue(activity)
    const createEvent = vi.spyOn(eventsApi, 'create').mockResolvedValue({ ...activity, siteName: 'Lugar', expectedAttendance: 0 })
    vi.stubEnv('VITE_CLOUDINARY_CLOUD_NAME', 'demo')
    vi.stubEnv('VITE_CLOUDINARY_UPLOAD_PRESET', 'unsigned')
    const { container } = render(<MemoryRouter><Page /></MemoryRouter>)
    await choose(scope === 'ACTIVITY' ? 'Atractivo asociado' : 'Lugar / atractivo', 'Lugar')
    fireEvent.submit(container.querySelector('form')!)
    expect(await screen.findByText('Selecciona una categoría.')).toBeTruthy()
    expect(createActivity).not.toHaveBeenCalled()
    expect(createEvent).not.toHaveBeenCalled()
    await choose('Categoría', 'Específica')
    fireEvent.change(screen.getByLabelText(scope === 'ACTIVITY' ? 'Nombre de la actividad' : 'Nombre del evento'), { target: { value: 'Experiencia' } })
    fireEvent.change(screen.getByLabelText(scope === 'ACTIVITY' ? 'Fecha' : 'Fecha del evento'), { target: { value: '2026-12-01' } })
    const request = scope === 'ACTIVITY' ? createActivity : createEvent
    const portraitUrl = 'https://res.cloudinary.com/demo/image/upload/portada.jpg'
    let finishUpload!: (response: Response) => void
    vi.stubGlobal('fetch', vi.fn(() => new Promise<Response>((resolve) => {
      finishUpload = resolve
    })))

    await userEvent.setup().upload(screen.getByLabelText('Subir foto de portada'),
      new File(['imagen'], 'portada.jpg', { type: 'image/jpeg' }))
    fireEvent.submit(container.querySelector('form')!)
    expect(request).not.toHaveBeenCalled()

    finishUpload(new Response(JSON.stringify({ secure_url: portraitUrl, public_id: 'portada', width: 1200, height: 800 })))
    expect((await screen.findByAltText('Foto 1 de 1')).getAttribute('src')).toBe(portraitUrl)
    fireEvent.submit(container.querySelector('form')!)
    await waitFor(() => expect(request).toHaveBeenCalledWith(expect.objectContaining({
      category: 'Específica',
      portraitUrl,
    })))
    expect(categoriesApi.listPage).toHaveBeenCalledWith({ scope, page: 0, size: 100 })
  })
  it.each([
    ['ACTIVITY', ActivityFormPage],
    ['EVENT', EventFormPage],
  ] as const)('%s no envía categorías que ms-03 rechaza por superar 50 caracteres', async (scope, Page) => {
    const longName = 'Categoría de nombre demasiado extenso para actividades y eventos'
    vi.mocked(categoriesApi.listPage).mockResolvedValue({ ...emptyPage, totalPages: 1, content: [{ id: 'long', name: longName, scope, parentId: null }] })
    const createActivity = vi.spyOn(activitiesApi, 'create')
    const createEvent = vi.spyOn(eventsApi, 'create')
    const { container } = render(<MemoryRouter><Page /></MemoryRouter>)
    await choose(scope === 'ACTIVITY' ? 'Atractivo asociado' : 'Lugar / atractivo', 'Lugar')
    await choose('Categoría', longName)
    fireEvent.change(screen.getByLabelText(scope === 'ACTIVITY' ? 'Fecha' : 'Fecha del evento'), { target: { value: '2026-12-01' } })
    fireEvent.submit(container.querySelector('form')!)
    expect(await screen.findByText('La categoría seleccionada supera el máximo de 50 caracteres permitido. Selecciona otra categoría.')).toBeTruthy()
    expect(createActivity).not.toHaveBeenCalled()
    expect(createEvent).not.toHaveBeenCalled()
  })

})
