import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { DataTable } from './DataTable'

interface Row {
  id: string
  name: string
}

const COLUMNS = [
  { header: 'Nombre', render: (row: Row) => row.name },
]

function renderTable(rows: Row[], label?: string) {
  return render(
    <DataTable
      columns={COLUMNS}
      rows={rows}
      rowKey={(row) => row.id}
      {...(label === undefined ? {} : { label })}
    />,
  )
}

/** jsdom no calcula layout: el desborde se simula sobre el prototipo. */
function withOverflow(scroll: number, client: number, run: () => void) {
  Object.defineProperty(HTMLElement.prototype, 'scrollWidth', {
    configurable: true,
    get: () => scroll,
  })
  Object.defineProperty(HTMLElement.prototype, 'clientWidth', {
    configurable: true,
    get: () => client,
  })

  try {
    run()
  } finally {
    delete (HTMLElement.prototype as { scrollWidth?: unknown }).scrollWidth
    delete (HTMLElement.prototype as { clientWidth?: unknown }).clientWidth
  }
}

describe('DataTable', () => {
  it('expone la tabla como region con nombre accesible y cabeceras de columna', () => {
    renderTable([{ id: '1', name: 'Uno' }], 'Usuarios')

    const region = screen.getByRole('region', { name: 'Usuarios' })
    expect(region.textContent).toContain('Uno')
    // Sin desborde no hay nada que desplazar: no es una parada de Tab.
    expect(region.getAttribute('tabindex')).toBe('-1')
    expect(
      screen.getByRole('columnheader', { name: 'Nombre' }).getAttribute('scope'),
    ).toBe('col')
  })

  it('usa un nombre accesible por defecto', () => {
    renderTable([])

    expect(screen.getByRole('region', { name: 'Tabla de datos' })).toBeTruthy()
  })

  it('muestra el estado vacio', () => {
    renderTable([])

    expect(screen.getByText('Sin resultados.')).toBeTruthy()
  })

  it('no avisa de desplazamiento cuando la tabla no desborda', () => {
    renderTable([{ id: '1', name: 'Uno' }])

    expect(screen.queryByText(/Desliza la tabla/)).toBeNull()
  })

  it('cuando desborda, avisa y la region entra en el orden de Tab', () => {
    withOverflow(704, 341, () => {
      renderTable([{ id: '1', name: 'Uno' }], 'Usuarios')

      const region = screen.getByRole('region', { name: 'Usuarios' })
      expect(region.getAttribute('tabindex')).toBe('0')
      expect(region.getAttribute('aria-describedby')).toBeTruthy()
      expect(screen.getByText(/Desliza la tabla/)).toBeTruthy()
    })
  })
})
