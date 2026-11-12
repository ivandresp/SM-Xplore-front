import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import RegistrationsQueuePage from './RegistrationsQueuePage'

const GUIDE = {
  id: 'reg-1',
  role: 'GUIDE',
  fullName: 'Ana Guía',
  email: 'ana@correo.com',
  license: 'LIC-1',
  nit: null,
  signedUpAt: '2026-11-01T10:00:00Z',
  registrationStatus: 'PENDIENTE',
}

const PROVIDER = {
  id: 'reg-2',
  role: 'SERVICE_PROVIDER',
  fullName: 'Kayaks del Mar',
  email: 'kayak@correo.com',
  license: null,
  nit: '900123456-7',
  signedUpAt: '2026-11-02T10:00:00Z',
  registrationStatus: 'PENDIENTE',
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function pageOf(content: unknown[], total = content.length, totalPages = 1) {
  return { content, page: 0, size: 10, total, totalPages }
}

function renderQueue() {
  return render(
    <MemoryRouter initialEntries={['/app/solicitudes']}>
      <Routes>
        <Route path="/app/solicitudes" element={<RegistrationsQueuePage />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('RegistrationsQueuePage', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('lista las guías pendientes con nombre, correo, licencia y fecha', async () => {
    const fetchStub = vi.fn(async (_url: string) => jsonResponse(pageOf([GUIDE])))
    vi.stubGlobal('fetch', fetchStub)

    renderQueue()

    expect(await screen.findByText('Ana Guía')).toBeTruthy()
    expect(screen.getByText('ana@correo.com')).toBeTruthy()
    expect(screen.getByText('LIC-1')).toBeTruthy()
    expect(screen.getByText(/nov.*2026/i)).toBeTruthy()

    const url = String(fetchStub.mock.calls[0][0])
    expect(url).toContain('role=GUIDE')
    expect(url).toContain('status=PENDIENTE')
  })

  it('cambia a la pestaña de prestadoras y pide su cola con el NIT', async () => {
    const fetchStub = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      return jsonResponse(
        pageOf(url.includes('role=SERVICE_PROVIDER') ? [PROVIDER] : [GUIDE]),
      )
    })
    vi.stubGlobal('fetch', fetchStub)

    const user = userEvent.setup()
    renderQueue()

    await screen.findByText('Ana Guía')
    await user.click(screen.getByRole('button', { name: 'Prestadoras' }))

    expect(await screen.findByText('Kayaks del Mar')).toBeTruthy()
    expect(screen.getByText('900123456-7')).toBeTruthy()
    expect(String(fetchStub.mock.calls.at(-1)?.[0])).toContain(
      'role=SERVICE_PROVIDER',
    )
  })

  it('aprueba con un clic, avisa y refresca la cola', async () => {
    let queueReads = 0
    const fetchMock = vi.fn(
      async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input)
        if (url.endsWith('/review')) {
          return new Response(null, { status: 204 })
        }
        queueReads += 1
        void init
        return jsonResponse(pageOf([GUIDE]))
      },
    )
    vi.stubGlobal('fetch', fetchMock)

    const user = userEvent.setup()
    renderQueue()

    await screen.findByText('Ana Guía')
    await user.click(screen.getByRole('button', { name: 'Aprobar' }))

    expect(await screen.findByText(/aprobada/i)).toBeTruthy()

    const reviewCall = fetchMock.mock.calls.find(([url]) =>
      String(url).endsWith('/registrations/reg-1/review'),
    )
    expect(JSON.parse(String(reviewCall?.[1]?.body))).toEqual({
      decision: 'APROBADO',
    })
    await waitFor(() => {
      expect(queueReads).toBeGreaterThanOrEqual(2)
    })
  })

  it('exige el motivo antes de rechazar y lo manda en la petición', async () => {
    const fetchMock = vi.fn(
      async (input: RequestInfo | URL, _init?: RequestInit) => {
        const url = String(input)
        if (url.endsWith('/review')) {
          return new Response(null, { status: 204 })
        }
        return jsonResponse(pageOf([GUIDE]))
      },
    )
    vi.stubGlobal('fetch', fetchMock)

    const user = userEvent.setup()
    renderQueue()

    await screen.findByText('Ana Guía')
    await user.click(screen.getByRole('button', { name: 'Rechazar' }))

    const confirm = screen.getByRole('button', { name: 'Confirmar rechazo' })
    expect((confirm as HTMLButtonElement).disabled).toBe(true)
    expect(
      fetchMock.mock.calls.some(([url]) => String(url).endsWith('/review')),
    ).toBe(false)

    await user.type(
      screen.getByLabelText('Motivo del rechazo'),
      'Licencia vencida',
    )
    await user.click(confirm)

    expect(await screen.findByText(/rechazada\. Se avisó/i)).toBeTruthy()

    const reviewCall = fetchMock.mock.calls.find(([url]) =>
      String(url).endsWith('/registrations/reg-1/review'),
    )
    expect(JSON.parse(String(reviewCall?.[1]?.body))).toEqual({
      decision: 'RECHAZADO',
      reason: 'Licencia vencida',
    })
  })

  it('muestra el 403 del backend sin romper la pantalla', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        jsonResponse(
          {
            status: 403,
            code: 'ACCESS_DENIED',
            detail: 'No tienes permisos para realizar esta operación',
          },
          403,
        ),
      ),
    )

    renderQueue()

    expect(await screen.findByText(/no tiene permiso/i)).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeTruthy()
  })

  it('muestra el vacío cuando no hay solicitudes en ese estado', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => jsonResponse(pageOf([], 0, 0))),
    )

    renderQueue()

    expect(
      await screen.findByText('No hay guías pendientes de revisión.'),
    ).toBeTruthy()
  })

  it('pagina en servidor cuando hay más solicitudes que una página', async () => {
    const fetchStub = vi.fn(async (_url: string) =>
      jsonResponse(pageOf([GUIDE], 25, 3)),
    )
    vi.stubGlobal('fetch', fetchStub)

    const user = userEvent.setup()
    renderQueue()

    await screen.findByText('Ana Guía')
    await user.click(screen.getByRole('button', { name: 'Página siguiente' }))

    await waitFor(() => {
      expect(String(fetchStub.mock.calls.at(-1)?.[0])).toContain('page=1')
    })
  })
})
