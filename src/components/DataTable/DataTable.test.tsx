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

describe('DataTable', () => {
  it('expone la tabla como region enfocable con nombre accesible', () => {
    renderTable([{ id: '1', name: 'Uno' }], 'Usuarios')

    const region = screen.getByRole('region', { name: 'Usuarios' })
    expect(region.getAttribute('tabindex')).toBe('0')
    expect(region.textContent).toContain('Uno')
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
})
