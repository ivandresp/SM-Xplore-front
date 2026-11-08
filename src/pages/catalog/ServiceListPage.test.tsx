import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import ServiceListPage from './ServiceListPage'

const SERVICE = {
  serviceId: 'sv-1',
  providerId: 'p-1',
  providerName: 'Kayak Santa Marta',
  siteId: 's-1',
  siteName: 'Playa El Rodadero',
  zoneId: 'z-1',
  zoneName: 'Rodadero',
  categoryId: 'c-1',
  categoryName: 'Deportes acuáticos',
  name: 'Alquiler de kayak',
  description: 'Kayak con chaleco.',
  type: 'LODGING',
  latitude: 11.2,
  longitude: -74.2,
  price: 60000,
  status: 'PUBLISHED',
  maxCapacity: 8,
  photosUrls: [],
  cancellationPolicy: '48 horas',
  createdAt: '2026-11-07T18:00:00Z',
  updatedAt: '2026-11-07T18:00:00Z',
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function page(content: unknown[]) {
  return {
    content,
    page: 0,
    size: 12,
    total: content.length,
    totalPages: 1,
  }
}

function renderServices(entry = '/servicios') {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <Routes>
        <Route path="/servicios" element={<ServiceListPage />} />
        <Route path="/servicios/:serviceId" element={<p>Detalle</p>} />
      </Routes>
    </MemoryRouter>,
  )
}

function servicesFetch() {
  return vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input)
    if (url.includes('/services?')) {
      return jsonResponse(page([SERVICE]))
    }
    return jsonResponse(page([]))
  })
}

describe('ServiceListPage', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('lee el precio máximo de la URL y lo manda al servidor', async () => {
    const fetchStub = servicesFetch()
    vi.stubGlobal('fetch', fetchStub)

    renderServices('/servicios?precioMax=100000')

    expect(await screen.findByText('Alquiler de kayak')).toBeTruthy()
    expect(screen.getByText('1 resultado')).toBeTruthy()
    expect(
      screen.getByRole('button', { name: /Quitar filtro Precio/ }),
    ).toBeTruthy()

    const servicesCall = fetchStub.mock.calls
      .map(([input]) => String(input))
      .find((url) => url.includes('/services?'))
    expect(servicesCall).toContain('priceMax=100000')
    expect(servicesCall).toContain('status=PUBLISHED')
  })

  it('quita el parámetro al limpiar los filtros', async () => {
    const fetchStub = servicesFetch()
    vi.stubGlobal('fetch', fetchStub)

    const user = userEvent.setup()
    renderServices('/servicios?precioMax=100000')

    await screen.findByText('Alquiler de kayak')
    await user.click(screen.getByRole('button', { name: /Quitar filtro Precio/ }))

    await waitFor(() => {
      const urls = fetchStub.mock.calls.map(([input]) => String(input))
      expect(urls.some((url) => url.includes('/services?') && !url.includes('priceMax'))).toBe(true)
    })
  })
})
