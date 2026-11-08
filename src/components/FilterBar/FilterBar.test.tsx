import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { FilterBar } from './FilterBar'

const FILTERS = [
  { key: 'zona', label: 'Zona', value: 'Centro' },
  { key: 'precioMax', label: 'Precio', value: 'Hasta $50.000' },
]

describe('FilterBar', () => {
  it('anuncia el contador y los chips activos', () => {
    render(
      <FilterBar
        activeFilters={FILTERS}
        onRemoveFilter={vi.fn()}
        onClearFilters={vi.fn()}
        resultSummary="12 resultados"
      >
        <label>Control</label>
      </FilterBar>,
    )

    expect(screen.getByText('12 resultados')).toBeTruthy()
    expect(
      screen.getByRole('list', { name: 'Filtros activos' }),
    ).toBeTruthy()
    expect(
      screen.getByRole('button', { name: 'Quitar filtro Zona: Centro' }),
    ).toBeTruthy()
  })

  it('quita un filtro y limpia todos', async () => {
    const onRemoveFilter = vi.fn()
    const onClearFilters = vi.fn()
    const user = userEvent.setup()

    render(
      <FilterBar
        activeFilters={FILTERS}
        onRemoveFilter={onRemoveFilter}
        onClearFilters={onClearFilters}
        resultSummary="2 resultados"
      >
        <label>Control</label>
      </FilterBar>,
    )

    await user.click(
      screen.getByRole('button', { name: 'Quitar filtro Zona: Centro' }),
    )
    expect(onRemoveFilter).toHaveBeenCalledWith('zona')

    await user.click(screen.getByRole('button', { name: 'Limpiar filtros' }))
    expect(onClearFilters).toHaveBeenCalledTimes(1)
  })

  it('colapsa los controles en móvil con aria-expanded', async () => {
    const user = userEvent.setup()

    render(
      <FilterBar
        activeFilters={[]}
        onRemoveFilter={vi.fn()}
        onClearFilters={vi.fn()}
        resultSummary="0 resultados"
      >
        <label>Control</label>
      </FilterBar>,
    )

    const toggle = screen.getByRole('button', { name: 'Mostrar filtros' })
    expect(toggle.getAttribute('aria-expanded')).toBe('false')

    await user.click(toggle)

    expect(
      screen.getByRole('button', { name: 'Ocultar filtros' }).getAttribute(
        'aria-expanded',
      ),
    ).toBe('true')
  })
})
