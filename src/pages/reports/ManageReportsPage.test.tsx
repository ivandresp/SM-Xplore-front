import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import ManageReportsPage from './ManageReportsPage'

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function reportsFetch() {
  return vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input)
    if (url.includes('/security-reports/counts')) {
      return jsonResponse({ ONGOING: 150, REPORTED: 3, SOLVED: 2 })
    }
    // El listado tiene más de una página: aun así la leyenda no lleva «+».
    return jsonResponse({ content: [], nextCursor: null, hasNext: true })
  })
}

describe('ManageReportsPage', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('muestra los totales del servidor sin signos de truncado', async () => {
    vi.stubGlobal('fetch', reportsFetch())

    render(
      <MemoryRouter>
        <ManageReportsPage />
      </MemoryRouter>,
    )

    expect(await screen.findByText(/En curso \(150\)/)).toBeTruthy()
    expect(screen.getByText(/Reportados \(3\)/)).toBeTruthy()
    expect(screen.getByText(/Resueltos \(2\)/)).toBeTruthy()
    expect(screen.queryByText(/150\+/)).toBeNull()
  })
})
