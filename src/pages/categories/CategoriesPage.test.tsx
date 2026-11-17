import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { setLanguage } from '@/i18n/language'
import { categoriesApi } from '@/services/categoriesApi'
import type { CategoryResponse, CategoryScope, PageResponse } from '@/types'
import CategoriesPage from './CategoriesPage'

vi.mock('@/services/categoriesApi', () => ({
  categoriesApi: { listPage: vi.fn(), create: vi.fn() },
}))

const CATEGORY: CategoryResponse = { id: 'c-1', name: 'Patrimonio', scope: 'SITE', parentId: null }
function page(content: CategoryResponse[], current = 0, totalPages = 1): PageResponse<CategoryResponse> {
  return { content, page: current, size: 20, total: totalPages > 1 ? 25 : content.length, totalPages }
}
function renderPage() {
  return render(<MemoryRouter><CategoriesPage /></MemoryRouter>)
}
function form() {
  return within(screen.getByRole('form', { name: 'Nueva categoría' }))
}
async function selectScope(user: ReturnType<typeof userEvent.setup>, label: string, option: string) {
  await user.click(screen.getByRole('combobox', { name: label }))
  await user.click(screen.getByRole('option', { name: option }))
}

describe('CategoriesPage', () => {
  beforeEach(() => {
    setLanguage('es')
    vi.resetAllMocks()
    vi.mocked(categoriesApi.listPage).mockResolvedValue(page([CATEGORY]))
    vi.mocked(categoriesApi.create).mockImplementation(async input => ({ ...input, id: 'created' }))
  })

  it('carga categorías y ofrece por defecto el tipo sitio turístico', async () => {
    renderPage()
    expect(screen.getByRole('heading', { level: 1, name: 'Categorías' })).toBeTruthy()
    expect(await screen.findByText('Patrimonio')).toBeTruthy()
    expect(categoriesApi.listPage).toHaveBeenCalledWith({ page: 0, size: 20 })
    expect(form().getByRole('combobox', { name: 'Tipo de categoría' }).textContent).toContain('Sitio turístico')
    expect(form().getByLabelText('Nombre de la categoría').hasAttribute('required')).toBe(true)
  })

  it.each<[CategoryScope, string]>([
    ['GENERAL', 'General'], ['SITE', 'Sitio turístico'], ['EVENT', 'Evento'], ['ACTIVITY', 'Actividad'],
  ])('registra %s, recorta el nombre y muestra la categoría creada', async (scope, label) => {
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('Patrimonio')
    await user.type(form().getByLabelText('Nombre de la categoría'), '  Naturaleza  ')
    await selectScope(user, 'Tipo de categoría', label)
    vi.mocked(categoriesApi.listPage).mockResolvedValue(page([{ ...CATEGORY, id: 'created', name: 'Naturaleza', scope }]))
    await user.click(form().getByRole('button', { name: 'Crear categoría' }))
    await waitFor(() => expect(categoriesApi.create).toHaveBeenCalledExactlyOnceWith({ name: 'Naturaleza', scope, parentId: null }))
    expect(await screen.findByText('Categoría registrada.')).toBeTruthy()
    expect(await screen.findByText('Naturaleza')).toBeTruthy()
    expect((form().getByLabelText('Nombre de la categoría') as HTMLInputElement).value).toBe('')
    expect(categoriesApi.listPage).toHaveBeenLastCalledWith({ scope, page: 0, size: 20 })
  })

  it('conserva los campos cuando falla el registro y permite reintentar', async () => {
    vi.mocked(categoriesApi.create).mockRejectedValueOnce(new TypeError('Failed to fetch'))
    const user = userEvent.setup()
    renderPage()
    await user.type(form().getByLabelText('Nombre de la categoría'), '  Música  ')
    await selectScope(user, 'Tipo de categoría', 'Evento')
    await user.click(form().getByRole('button', { name: 'Crear categoría' }))
    expect(await form().findByRole('alert')).toBeTruthy()
    expect((form().getByLabelText('Nombre de la categoría') as HTMLInputElement).value).toBe('  Música  ')
    expect(form().getByRole('combobox', { name: 'Tipo de categoría' }).textContent).toContain('Evento')
    await user.click(form().getByRole('button', { name: 'Crear categoría' }))
    await waitFor(() => expect(categoriesApi.create).toHaveBeenCalledTimes(2))
    expect(vi.mocked(categoriesApi.create).mock.calls[1]).toEqual(vi.mocked(categoriesApi.create).mock.calls[0])
  })

  it('rechaza nombres con solo espacios sin llamar al servicio', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.type(form().getByLabelText('Nombre de la categoría'), '   ')
    await user.click(form().getByRole('button', { name: 'Crear categoría' }))
    expect(await form().findByText('Escribe el nombre de la categoría.')).toBeTruthy()
    expect(categoriesApi.create).not.toHaveBeenCalled()
  })

  it('evita otra petición al reenviar mientras se guarda', async () => {
    let resolveCreate!: (category: CategoryResponse) => void
    vi.mocked(categoriesApi.create).mockReturnValueOnce(new Promise(resolve => { resolveCreate = resolve }))
    const user = userEvent.setup()
    renderPage()
    await user.type(form().getByLabelText('Nombre de la categoría'), 'Museos')
    await user.click(form().getByRole('button', { name: 'Crear categoría' }))
    const pending = form().getByRole('button', { name: 'Guardando…' }) as HTMLButtonElement
    expect(pending.disabled).toBe(true)
    fireEvent.submit(screen.getByRole('form', { name: 'Nueva categoría' }))
    expect(categoriesApi.create).toHaveBeenCalledTimes(1)
    resolveCreate({ ...CATEGORY, name: 'Museos' })
    expect(await screen.findByText('Categoría registrada.')).toBeTruthy()
  })

  it('pagina en servidor y reinicia la página al cambiar el filtro de tipo', async () => {
    vi.mocked(categoriesApi.listPage).mockResolvedValue(page([CATEGORY], 0, 2))
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('Patrimonio')
    await user.click(screen.getByRole('button', { name: 'Página siguiente' }))
    await waitFor(() => expect(categoriesApi.listPage).toHaveBeenLastCalledWith({ page: 1, size: 20 }))
    await selectScope(user, 'Filtrar por tipo', 'Actividad')
    await waitFor(() => expect(categoriesApi.listPage).toHaveBeenLastCalledWith({ scope: 'ACTIVITY', page: 0, size: 20 }))
    await selectScope(user, 'Filtrar por tipo', 'Todos los tipos')
    await waitFor(() => expect(categoriesApi.listPage).toHaveBeenLastCalledWith({ page: 0, size: 20 }))
  })

  it('permite recuperar un fallo de listado mediante Reintentar', async () => {
    vi.mocked(categoriesApi.listPage).mockRejectedValueOnce(new TypeError('Failed to fetch'))
    const user = userEvent.setup()
    renderPage()
    await user.click(await screen.findByRole('button', { name: 'Reintentar' }))
    expect(await screen.findByText('Patrimonio')).toBeTruthy()
    expect(categoriesApi.listPage).toHaveBeenCalledTimes(2)
    expect(categoriesApi.listPage).toHaveBeenLastCalledWith({ page: 0, size: 20 })
  })
})
