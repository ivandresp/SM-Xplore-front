import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { useReportsPath } from './useReportsPath'

function ReportsLink() {
  return <a href={useReportsPath()}>Reportes de prueba</a>
}

describe('useReportsPath', () => {
  it.each([
    ['/app/reportes', '/app/reportes'],
    ['/app/reportes/nuevo', '/app/reportes'],
    ['/app/reportes/r-1?tab=photos#foto', '/app/reportes'],
    ['/app/categorias?returnTo=/reportes', '/app/reportes'],
    ['/reportes', '/reportes'],
    ['/reportes/nuevo', '/reportes'],
    ['/reportes/r-1?returnTo=/app/reportes#foto', '/reportes'],
    ['/explorar', '/reportes'],
    ['/application/reportes', '/reportes'],
  ])('para %s devuelve %s sin requerir sesión', (path, expected) => {
    render(<MemoryRouter initialEntries={[path]}><ReportsLink /></MemoryRouter>)
    expect(screen.getByRole('link', { name: 'Reportes de prueba' }).getAttribute('href')).toBe(expected)
  })
})
