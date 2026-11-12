import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider } from '@/context/AuthProvider'
import EventListPage from './EventListPage'

const CREATED = '2026-01-01T00:00:00Z'

const ZONE = {
  zoneId: 'z-1',
  managerId: null,
  name: 'Rodadero',
  type: 'URBANA',
  description: null,
  status: 'ACTIVE',
  createdAt: CREATED,
  updatedAt: CREATED,
}

const SITE = {
  siteId: 's-1',
  managerId: null,
  name: 'Playa El Rodadero',
  description: 'Arena blanca.',
  categoryId: 'c-1',
  categoryName: 'Playa',
  zoneId: 'z-1',
  zoneName: 'Rodadero',
  zoneStatus: 'ACTIVE',
  latitude: 11.2,
  longitude: -74.2,
  photosUrls: [],
  status: 'PUBLISHED',
  maxCapacity: 100,
  availability: null,
  createdAt: CREATED,
  updatedAt: CREATED,
}

const EVENT = {
  id: 'e-1',
  siteId: 's-1',
  siteName: 'Playa El Rodadero',
  name: 'Concierto en la playa',
  category: 'Música',
  status: 'PUBLISHED',
  price: 50000,
  maxCapacity: 100,
  startsAt: '2026-12-01T18:00:00Z',
  endsAt: '2026-12-01T21:00:00Z',
  description: 'Música frente al mar.',
  expectedAttendance: 80,
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function page(content: unknown[]) {
  return { content, page: 0, size: 10, total: content.length, totalPages: 1 }
}

function renderEvents() {
  return render(
    <MemoryRouter initialEntries={['/eventos']}>
      <AuthProvider>
        <Routes>
          <Route path="/eventos" element={<EventListPage />} />
          <Route path="/eventos/:eventId" element={<p>Detalle</p>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  )
}

describe('EventListPage', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('la primera carga rapida no pinta esqueleto', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input)
        if (url.includes('/events?')) return jsonResponse(page([EVENT]))
        if (url.includes('/zones?')) return jsonResponse(page([ZONE]))
        if (url.includes('/sites?')) return jsonResponse(page([SITE]))
        return jsonResponse(page([]))
      }),
    )

    renderEvents()

    expect(await screen.findByText('Concierto en la playa')).toBeTruthy()
    expect(document.querySelector('[data-skeleton]')).toBeNull()
    expect(document.querySelector('section[aria-busy="true"]')).toBeNull()
  })

  it('al recargar mantiene la lista anterior sin esqueleto y marca aria-busy', async () => {
    let release: ((response: Response) => void) | null = null
    vi.stubGlobal(
      'fetch',
      vi.fn((input: RequestInfo | URL) => {
        const url = String(input)
        if (url.includes('/events?')) {
          if (url.includes('sort=priceAsc')) {
            return new Promise<Response>((resolve) => {
              release = resolve
            })
          }
          return Promise.resolve(jsonResponse(page([EVENT])))
        }
        if (url.includes('/zones?')) {
          return Promise.resolve(jsonResponse(page([ZONE])))
        }
        if (url.includes('/sites?')) {
          return Promise.resolve(jsonResponse(page([SITE])))
        }
        return Promise.resolve(jsonResponse(page([])))
      }),
    )

    const user = userEvent.setup()
    renderEvents()
    expect(await screen.findByText('Concierto en la playa')).toBeTruthy()

    await user.click(
      screen.getByRole('combobox', { name: 'Ordenar resultados' }),
    )
    await user.click(
      screen.getByRole('option', { name: /Precio: menor a mayor/ }),
    )
    await waitFor(() => {
      expect(release).not.toBeNull()
    })

    expect(screen.getByText('Concierto en la playa')).toBeTruthy()
    expect(document.querySelector('[data-skeleton]')).toBeNull()
    expect(
      document.querySelector('section[aria-busy="true"]'),
    ).not.toBeNull()

    await act(async () => {
      release?.(jsonResponse(page([])))
    })
    expect(
      await screen.findByText('Todavía no hay eventos publicados'),
    ).toBeTruthy()
    expect(screen.queryByText('Concierto en la playa')).toBeNull()
  })
})
