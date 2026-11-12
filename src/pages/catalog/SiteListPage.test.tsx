import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import SiteListPage from './SiteListPage'

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

const CATEGORY = {
  categoryId: 'c-1',
  name: 'Playa',
  scope: 'SITE',
  parentId: null,
  updatedAt: CREATED,
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function page(content: unknown[]) {
  return { content, page: 0, size: 12, total: content.length, totalPages: 1 }
}

function renderSites() {
  return render(
    <MemoryRouter initialEntries={['/atractivos']}>
      <Routes>
        <Route path="/atractivos" element={<SiteListPage />} />
        <Route path="/atractivos/:siteId" element={<p>Detalle</p>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('SiteListPage', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('la primera carga rapida no pinta esqueleto', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input)
        if (url.includes('/sites?')) return jsonResponse(page([SITE]))
        if (url.includes('/zones?')) return jsonResponse(page([ZONE]))
        if (url.includes('/categories?')) return jsonResponse(page([CATEGORY]))
        return jsonResponse(page([]))
      }),
    )

    renderSites()

    expect(await screen.findByText('Playa El Rodadero')).toBeTruthy()
    expect(document.querySelector('[data-skeleton]')).toBeNull()
    expect(document.querySelector('section[aria-busy="true"]')).toBeNull()
  })

  it('al recargar mantiene la lista anterior sin esqueleto y marca aria-busy', async () => {
    let release: ((response: Response) => void) | null = null
    vi.stubGlobal(
      'fetch',
      vi.fn((input: RequestInfo | URL) => {
        const url = String(input)
        if (url.includes('/sites?')) {
          if (url.includes('zoneId=z-1')) {
            return new Promise<Response>((resolve) => {
              release = resolve
            })
          }
          return Promise.resolve(jsonResponse(page([SITE])))
        }
        if (url.includes('/zones?')) {
          return Promise.resolve(jsonResponse(page([ZONE])))
        }
        if (url.includes('/categories?')) {
          return Promise.resolve(jsonResponse(page([CATEGORY])))
        }
        return Promise.resolve(jsonResponse(page([])))
      }),
    )

    const user = userEvent.setup()
    renderSites()
    expect(await screen.findByText('Playa El Rodadero')).toBeTruthy()

    const zoneSelect = screen.getByRole('combobox', { name: 'Zona' })
    await waitFor(() => {
      expect((zoneSelect as HTMLButtonElement).disabled).toBe(false)
    })

    await user.click(zoneSelect)
    await user.click(screen.getByRole('option', { name: 'Rodadero' }))
    await waitFor(() => {
      expect(release).not.toBeNull()
    })

    expect(screen.getByText('Playa El Rodadero')).toBeTruthy()
    expect(document.querySelector('[data-skeleton]')).toBeNull()
    expect(
      document.querySelector('section[aria-busy="true"]'),
    ).not.toBeNull()

    await act(async () => {
      release?.(jsonResponse(page([])))
    })
    expect(
      await screen.findByText('No encontramos atractivos con esos filtros'),
    ).toBeTruthy()
    expect(screen.queryByText('Playa El Rodadero')).toBeNull()
  })
})
