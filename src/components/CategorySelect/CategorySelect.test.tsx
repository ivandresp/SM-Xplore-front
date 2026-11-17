import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { categoriesApi } from '@/services/categoriesApi'
import type { CategoryResponse } from '@/types'
import { CategorySelect } from './CategorySelect'

const category = (name: string, scope: CategoryResponse['scope']): CategoryResponse => ({ id: name, name, scope, parentId: null })
function page(content: CategoryResponse[], totalPages = 1) {
  return { content, page: 0, size: 100, total: content.length, totalPages }
}
afterEach(() => vi.restoreAllMocks())

describe('CategorySelect', () => {
  it.each(['ACTIVITY', 'EVENT'] as const)('agrupa General y %s; pagina sin truncar y envía nombre', async (scope) => {
    const request = vi.spyOn(categoriesApi, 'listPage').mockImplementation(async (query) => {
      if (query.scope === 'GENERAL') return query.page === 0
        ? page([category('Naturaleza', 'GENERAL')], 2)
        : page([category('Cultura', 'GENERAL')], 2)
      return page([category('Específica', scope)])
    })
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<CategorySelect scope={scope} value="" onChange={onChange} />)
    const trigger = screen.getByRole('combobox', { name: 'Categoría' })
    await waitFor(() => expect(trigger.hasAttribute('disabled')).toBe(false))
    await user.click(trigger)
    expect(within(screen.getByRole('group', { name: 'General' })).getByRole('option', { name: 'Cultura' })).toBeTruthy()
    expect(screen.getByRole('group', { name: scope === 'ACTIVITY' ? 'Actividad' : 'Evento' })).toBeTruthy()
    await user.click(screen.getByRole('option', { name: 'Específica' }))
    expect(onChange).toHaveBeenCalledWith('Específica')
    expect(request).toHaveBeenCalledWith({ scope: 'GENERAL', page: 1, size: 100 })
    expect(request.mock.calls.every(([query]) => query.scope === 'GENERAL' || query.scope === scope)).toBe(true)
  })

  it('permite reintentar sin ofrecer categorías incompletas', async () => {
    const request = vi.spyOn(categoriesApi, 'listPage').mockRejectedValue(new Error('offline'))
    const user = userEvent.setup()
    render(<CategorySelect scope="EVENT" value="" onChange={vi.fn()} required />)
    expect(await screen.findByText('No se pudieron cargar las categorías.')).toBeTruthy()
    expect(screen.getByRole('combobox').hasAttribute('disabled')).toBe(true)
    request.mockResolvedValue(page([category('Cultura', 'GENERAL')]))
    await user.click(screen.getByRole('button', { name: 'Reintentar' }))
    await waitFor(() => expect(screen.getByRole('combobox').hasAttribute('disabled')).toBe(false))
  })

  it('explica cuando no hay categorías disponibles', async () => {
    vi.spyOn(categoriesApi, 'listPage').mockResolvedValue(page([]))
    render(<CategorySelect scope="ACTIVITY" value="" onChange={vi.fn()} required />)
    expect(await screen.findByText('No hay categorías disponibles.')).toBeTruthy()
    expect(screen.getByRole('combobox').hasAttribute('disabled')).toBe(true)
  })
})
