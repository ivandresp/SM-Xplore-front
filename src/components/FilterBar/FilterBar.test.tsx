import { fireEvent, render as renderView, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { FilterBar } from './FilterBar'

function render(...args: Parameters<typeof renderView>) {
  const view = renderView(...args)
  fireEvent.click(screen.getByRole('button', { name: 'Filtros' }))
  return view
}

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

  it('resume los filtros activos en el encabezado', () => {
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

    expect(screen.getByText('2 filtros activos')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Filtros' })).toBeTruthy()
  })

  it('usa singular con un solo filtro activo', () => {
    render(
      <FilterBar
        activeFilters={[FILTERS[0]]}
        onRemoveFilter={vi.fn()}
        onClearFilters={vi.fn()}
        resultSummary="1 resultado"
      >
        <label>Control</label>
      </FilterBar>,
    )

    expect(screen.getByText('1 filtro activo')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Filtros' })).toBeTruthy()
  })

  it('no inventa resumen cuando no hay filtros', () => {
    render(
      <FilterBar
        activeFilters={[]}
        onRemoveFilter={vi.fn()}
        onClearFilters={vi.fn()}
        resultSummary="12 resultados"
      >
        <label>Control</label>
      </FilterBar>,
    )

    expect(screen.queryByText(/filtro activo/)).toBeNull()
  })

  it('reserva la fila de chips aunque no haya filtros', () => {
    render(
      <FilterBar
        activeFilters={[]}
        onRemoveFilter={vi.fn()}
        onClearFilters={vi.fn()}
        resultSummary="12 resultados"
      >
        <label>Control</label>
      </FilterBar>,
    )

    // La fila existe vacía: el primer chip aparece sin empujar la tabla.
    expect(screen.getByRole('list').textContent).toBe('')
  })

  it('oculta toda la tarjeta y alterna con el mismo botón conservando valores', async () => {
    const user = userEvent.setup()
    renderView(
      <FilterBar activeFilters={FILTERS} onRemoveFilter={vi.fn()} onClearFilters={vi.fn()} resultSummary="12 resultados">
        <input aria-label="Buscar" defaultValue="playa" />
      </FilterBar>,
    )
    const toggle = screen.getByRole('button', { name: 'Filtros' })
    const panel = document.getElementById(toggle.getAttribute('aria-controls')!)!
    expect(toggle.getAttribute('aria-expanded')).toBe('false')
    expect(toggle.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true')
    expect(panel.hidden).toBe(true)
    expect(screen.queryByRole('textbox', { name: 'Buscar' })).toBeNull()
    expect(screen.queryByRole('status')).toBeNull()
    expect(screen.queryByRole('button', { name: 'Limpiar filtros' })).toBeNull()
    await user.click(toggle)
    expect(toggle.getAttribute('aria-expanded')).toBe('true')
    expect(panel.hidden).toBe(false)
    const input = screen.getByRole('textbox', { name: 'Buscar' }) as HTMLInputElement
    await user.clear(input)
    await user.type(input, 'taganga')
    await user.click(toggle)
    expect(panel.hidden).toBe(true)
    expect(screen.queryByRole('textbox')).toBeNull()
    expect(document.activeElement).toBe(toggle)
    await user.keyboard('{Enter}')
    expect(toggle.getAttribute('aria-expanded')).toBe('true')
    expect((screen.getByRole('textbox') as HTMLInputElement).value).toBe('taganga')
    expect(screen.getByRole('button', { name: 'Filtros' })).toBe(toggle)
  })
})
