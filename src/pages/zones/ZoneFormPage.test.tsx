import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { setLanguage } from '@/i18n/language'
import { categoriesApi } from '@/services/categoriesApi'
import { sitesApi } from '@/services/sitesApi'
import { zonesApi } from '@/services/zonesApi'
import type { CategoryResponse, PageResponse, Site } from '@/types'
import ZoneFormPage from './ZoneFormPage'

vi.mock('@/services/zonesApi', () => ({ zonesApi: { getById: vi.fn() } }))
vi.mock('@/services/sitesApi', () => ({
  sitesApi: { list: vi.fn(), create: vi.fn(), update: vi.fn(), changeStatus: vi.fn() },
}))

interface TestPoint {
  latitude: number
  longitude: number
}

/* La geometría y los tiles se prueban en LocationPicker: aquí se fija su
   frontera controlada para verificar qué números recibe sitesApi. */
vi.mock('@/components/LocationPicker', () => ({
  LocationPicker: ({ value, onChange }: {
    value: TestPoint | null
    onChange: (point: TestPoint | null) => void
  }) => (
    <fieldset>
      <legend>Ubicación de prueba</legend>
      <output data-testid="selected-location">
        {value === null ? 'sin selección' : `${value.latitude},${value.longitude}`}
      </output>
      <button type="button" onClick={() => onChange({ latitude: 11.25, longitude: -74.2 })}>
        Elegir punto de prueba
      </button>
      <button type="button" onClick={() => onChange({ latitude: 0, longitude: 0 })}>
        Elegir origen
      </button>
      <button type="button" onClick={() => onChange(null)}>Borrar punto de prueba</button>
    </fieldset>
  ),
}))

vi.mock('@/components/ImageUploader', () => ({
  ImageUploader: ({ value, onChange }: { value: string[]; onChange: (urls: string[]) => void }) => (
    <button type="button" onClick={() => onChange([...value, 'https://example.com/nueva.jpg'])}>
      Añadir foto de prueba
    </button>
  ),
}))

const CATEGORY: CategoryResponse = {
  id: 'c-1', name: 'Patrimonio', scope: 'SITE', parentId: null,
}
const SITE: Site = {
  id: 's-1', zoneId: 'z-1', name: 'Catedral', categoryId: 'c-1',
  latitude: 11.24, longitude: -74.19, maxCapacity: 25,
  photoUrls: ['https://example.com/existente.jpg'], status: 'PUBLISHED',
}

function page(content: Site[]): PageResponse<Site> {
  return { content, page: 0, size: 100, total: content.length, totalPages: content.length === 0 ? 0 : 1 }
}

function renderZone() {
  return render(
    <MemoryRouter initialEntries={['/app/zonas/z-1']}>
      <Routes>
        <Route path="/app/zonas/:zoneId" element={<ZoneFormPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

async function addForm() {
  const submit = await screen.findByRole('button', { name: '+ Añadir sitio' })
  return within(submit.closest('form') as HTMLFormElement)
}

async function completeSiteDraft(user: ReturnType<typeof userEvent.setup>, category = 'Patrimonio') {
  const form = await addForm()
  await user.type(form.getByLabelText('Nombre del sitio o atractivo'), '  Museo del Oro  ')
  await user.click(form.getByRole('combobox', { name: /Categoría/ }))
  await user.click(form.getByRole('option', { name: category }))
  const capacity = form.getByLabelText('Capacidad máxima')
  await user.clear(capacity)
  await user.type(capacity, '40')
  return form
}

describe('ZoneFormPage: ubicación controlada del sitio', () => {
  beforeEach(() => {
    setLanguage('es')
    vi.clearAllMocks()
    vi.mocked(zonesApi.getById).mockResolvedValue({ id: 'z-1', name: 'Centro' })
    vi.spyOn(categoriesApi, 'listPage').mockImplementation(async ({ scope }) => {
      const content = scope === 'GENERAL'
        ? [{ ...CATEGORY, id: 'c-general', name: 'Naturaleza', scope }]
        : [CATEGORY]
      return { content, page: 0, size: 100, total: content.length, totalPages: 1 }
    })
    vi.mocked(sitesApi.list).mockResolvedValue(page([]))
    vi.mocked(sitesApi.create).mockImplementation(async (input) => ({
      ...SITE, ...input, id: 's-new', photoUrls: input.photoUrls ?? [],
    }))
    vi.mocked(sitesApi.update).mockImplementation(async (id, input) => ({
      ...SITE, ...input, id, photoUrls: input.photoUrls ?? [],
    }))
  })

  afterEach(() => {
    vi.restoreAllMocks()
    setLanguage('es')
  })

  it('no usa el centro de la vista como selección y bloquea el alta sin punto', async () => {
    vi.mocked(sitesApi.list).mockResolvedValue(page([SITE]))
    const user = userEvent.setup()
    renderZone()
    const form = await completeSiteDraft(user)
    expect(form.getByTestId('selected-location').textContent).toBe('sin selección')
    await user.click(form.getByRole('button', { name: '+ Añadir sitio' }))
    expect(await form.findByRole('alert')).toHaveProperty(
      'textContent', 'Selecciona la ubicación del sitio en el mapa.',
    )
    expect(sitesApi.create).not.toHaveBeenCalled()
    expect(sitesApi.update).not.toHaveBeenCalled()
    await user.click(form.getByRole('button', { name: 'Elegir punto de prueba' }))
    expect(form.queryByRole('alert')).toBeNull()
    expect(sitesApi.create).not.toHaveBeenCalled()
  })

  it('envía el punto numérico y conserva el resto del alta; limpia el punto solo tras éxito', async () => {
    const user = userEvent.setup()
    renderZone()
    const form = await completeSiteDraft(user, 'Naturaleza')
    await user.click(form.getByRole('button', { name: 'Elegir punto de prueba' }))
    await user.click(form.getByRole('button', { name: 'Añadir foto de prueba' }))
    await user.click(form.getByRole('button', { name: '+ Añadir sitio' }))
    await waitFor(() => expect(sitesApi.create).toHaveBeenCalledExactlyOnceWith({
      zoneId: 'z-1', name: 'Museo del Oro', categoryId: 'c-general',
      latitude: 11.25, longitude: -74.2, maxCapacity: 40,
      photoUrls: ['https://example.com/nueva.jpg'],
    }))
    expect((form.getByLabelText('Nombre del sitio o atractivo') as HTMLInputElement).value).toBe('')
    expect(form.getByTestId('selected-location').textContent).toBe('sin selección')
  })

  it('acepta 0,0 como selección explícita válida', async () => {
    const user = userEvent.setup()
    renderZone()
    const form = await completeSiteDraft(user)
    await user.click(form.getByRole('button', { name: 'Elegir origen' }))
    await user.click(form.getByRole('button', { name: '+ Añadir sitio' }))
    await waitFor(() => expect(sitesApi.create).toHaveBeenCalledWith(expect.objectContaining({
      latitude: 0, longitude: 0,
    })))
  })

  it('conserva el borrador y el punto tras fallo y reintenta los mismos datos', async () => {
    vi.mocked(sitesApi.create).mockRejectedValueOnce(new TypeError('Failed to fetch'))
    const user = userEvent.setup()
    renderZone()
    const form = await completeSiteDraft(user)
    await user.click(form.getByRole('button', { name: 'Elegir punto de prueba' }))
    await user.click(form.getByRole('button', { name: 'Añadir foto de prueba' }))
    await user.click(form.getByRole('button', { name: '+ Añadir sitio' }))
    expect(await form.findByRole('alert')).toBeTruthy()
    expect((form.getByLabelText('Nombre del sitio o atractivo') as HTMLInputElement).value).toBe('  Museo del Oro  ')
    expect(form.getByTestId('selected-location').textContent).toBe('11.25,-74.2')
    await user.click(form.getByRole('button', { name: '+ Añadir sitio' }))
    await waitFor(() => expect(sitesApi.create).toHaveBeenCalledTimes(2))
    expect(vi.mocked(sitesApi.create).mock.calls[1][0]).toEqual(vi.mocked(sitesApi.create).mock.calls[0][0])
  })

  it('carga el punto existente, bloquea su borrado y actualiza solo con un punto elegido', async () => {
    vi.mocked(sitesApi.list).mockResolvedValue(page([SITE]))
    const user = userEvent.setup()
    renderZone()
    await user.click(await screen.findByRole('button', { name: 'Editar' }))
    const save = screen.getByRole('button', { name: 'Guardar sitio' })
    const editor = within(save.parentElement?.parentElement as HTMLElement)
    expect(editor.getByTestId('selected-location').textContent).toBe('11.24,-74.19')
    await user.click(editor.getByRole('button', { name: 'Borrar punto de prueba' }))
    await user.click(save)
    expect(await editor.findByRole('alert')).toHaveProperty(
      'textContent', 'Selecciona la ubicación del sitio en el mapa.',
    )
    expect(sitesApi.update).not.toHaveBeenCalled()
    await user.click(editor.getByRole('button', { name: 'Elegir punto de prueba' }))
    const siteName = editor.getByLabelText('Nombre del sitio')
    await user.clear(siteName)
    await user.type(siteName, '  Catedral renovada  ')
    await user.click(save)
    await waitFor(() => expect(sitesApi.update).toHaveBeenCalledExactlyOnceWith('s-1', {
      name: 'Catedral renovada', categoryId: 'c-1', zoneId: 'z-1',
      latitude: 11.25, longitude: -74.2, maxCapacity: 25,
      photoUrls: ['https://example.com/existente.jpg'],
    }))
  })

  it('conserva los cambios y el punto de edición cuando falla el guardado', async () => {
    vi.mocked(sitesApi.list).mockResolvedValue(page([SITE]))
    vi.mocked(sitesApi.update).mockRejectedValueOnce(new TypeError('Failed to fetch'))
    const user = userEvent.setup()
    renderZone()
    await user.click(await screen.findByRole('button', { name: 'Editar' }))
    const save = screen.getByRole('button', { name: 'Guardar sitio' })
    const editor = within(save.parentElement?.parentElement as HTMLElement)
    const siteName = editor.getByLabelText('Nombre del sitio')
    await user.clear(siteName)
    await user.type(siteName, 'Catedral renovada')
    await user.click(editor.getByRole('button', { name: 'Elegir origen' }))
    await user.click(save)
    expect(await editor.findByRole('alert')).toBeTruthy()
    expect((editor.getByLabelText('Nombre del sitio') as HTMLInputElement).value).toBe('Catedral renovada')
    expect(editor.getByTestId('selected-location').textContent).toBe('0,0')
    await user.click(save)
    await waitFor(() => expect(sitesApi.update).toHaveBeenCalledTimes(2))
    expect(vi.mocked(sitesApi.update).mock.calls[1]).toEqual(vi.mocked(sitesApi.update).mock.calls[0])
  })

})
