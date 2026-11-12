import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import RegistrationsQueuePage from './RegistrationsQueuePage'

/**
 * jsdom no implementa scrollIntoView; se stubea y se restaura en afterEach
 * para que un fallo no contamine el resto de la suite.
 */
const scrollSpy = vi.fn()
let hadScrollIntoView = false
let originalScrollIntoView: typeof Element.prototype.scrollIntoView

beforeEach(() => {
  hadScrollIntoView = 'scrollIntoView' in Element.prototype
  originalScrollIntoView = Element.prototype.scrollIntoView
  Element.prototype.scrollIntoView = scrollSpy
})

afterEach(() => {
  if (hadScrollIntoView) {
    Element.prototype.scrollIntoView = originalScrollIntoView
  } else {
    Reflect.deleteProperty(Element.prototype, 'scrollIntoView')
  }
  scrollSpy.mockClear()
  vi.unstubAllGlobals()
})

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

    const approved = await screen.findByText(/aprobada\. Puede llegar un aviso/i)
    expect(approved.textContent).not.toMatch(/Se avisó|escribimos/)

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

    const rejected = await screen.findByText(
      /rechazada con motivo\. Puede llegar un aviso/i,
    )
    expect(rejected.textContent).not.toMatch(/Se avisó|escribimos/)

    const reviewCall = fetchMock.mock.calls.find(([url]) =>
      String(url).endsWith('/registrations/reg-1/review'),
    )
    expect(JSON.parse(String(reviewCall?.[1]?.body))).toEqual({
      decision: 'RECHAZADO',
      reason: 'Licencia vencida',
    })
  })

  it('abre el motivo con foco, aria-controls y scroll, y devuelve el foco al cancelar', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url.endsWith('/review')) {
        return new Response(null, { status: 204 })
      }
      return jsonResponse(pageOf([GUIDE]))
    })
    vi.stubGlobal('fetch', fetchMock)

    const user = userEvent.setup()
    renderQueue()

    await screen.findByText('Ana Guía')
    const trigger = screen.getByRole('button', { name: 'Rechazar' })
    trigger.focus()
    await user.keyboard('{Enter}')

    const textarea = screen.getByLabelText('Motivo del rechazo')
    expect(document.activeElement).toBe(textarea)
    expect(trigger.getAttribute('aria-controls')).toBe('motivo-rechazo')
    expect(trigger.getAttribute('aria-expanded')).toBe('true')
    expect(scrollSpy).toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: 'Cancelar' }))

    expect(screen.queryByLabelText('Motivo del rechazo')).toBeNull()
    expect(document.activeElement).toBe(trigger)
  })

  it('deja el panel del motivo pegado a la tabla y antes del paginador', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url.endsWith('/review')) {
        return new Response(null, { status: 204 })
      }
      return jsonResponse(pageOf([GUIDE], 25, 3))
    })
    vi.stubGlobal('fetch', fetchMock)

    const user = userEvent.setup()
    renderQueue()

    await screen.findByText('Ana Guía')
    await user.click(screen.getByRole('button', { name: 'Rechazar' }))

    const table = document.querySelector('table')
    const title = screen.getByRole('heading', {
      name: /Rechazar la solicitud de Ana Guía/,
    })
    const panel = title.closest('article')
    const pagination = screen.getByRole('navigation', { name: 'Paginación' })

    expect(table).not.toBeNull()
    expect(panel).not.toBeNull()
    expect(
      (table as Node).compareDocumentPosition(panel as Node) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
    expect(
      (panel as Node).compareDocumentPosition(pagination) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
  })

  it('tras un 409 recarga la lista sin servirla desde la caché de 30 s', async () => {
    let queueReads = 0
    const fetchMock = vi.fn(
      async (input: RequestInfo | URL, _init?: RequestInit) => {
        const url = String(input)
        if (url.endsWith('/review')) {
          return jsonResponse(
            {
              status: 409,
              code: 'INVALID_STATUS_TRANSITION',
              detail: 'Ya fue revisada',
            },
            409,
          )
        }
        queueReads += 1
        return jsonResponse(pageOf([GUIDE]))
      },
    )
    vi.stubGlobal('fetch', fetchMock)

    const user = userEvent.setup()
    renderQueue()

    await screen.findByText('Ana Guía')
    await user.click(screen.getByRole('button', { name: 'Aprobar' }))

    expect(
      await screen.findByText(/no es válida con el estado actual/i),
    ).toBeTruthy()

    await user.click(
      screen.getByRole('button', { name: 'Vuelve a cargar la lista' }),
    )

    await waitFor(() => {
      const urls = fetchMock.mock.calls.map(([url]) => String(url))
      expect(urls.at(-1)).toContain('_=')
    })
    expect(queueReads).toBeGreaterThanOrEqual(2)
    expect(
      screen.queryByText(/no es válida con el estado actual/i),
    ).toBeNull()
  })

  it('al rechazar una prestadora avisa de que el perfil no se publica y la cuenta sigue activa', async () => {
    const fetchMock = vi.fn(
      async (input: RequestInfo | URL, _init?: RequestInit) => {
        const url = String(input)
        if (url.endsWith('/review')) {
          return new Response(null, { status: 204 })
        }
        return jsonResponse(pageOf([PROVIDER]))
      },
    )
    vi.stubGlobal('fetch', fetchMock)

    const user = userEvent.setup()
    renderQueue()

    await user.click(screen.getByRole('button', { name: 'Prestadoras' }))
    await screen.findByText('Kayaks del Mar')
    await user.click(screen.getByRole('button', { name: 'Rechazar' }))

    expect(
      screen.getByText(/sigue activa y podrá iniciar sesión/i),
    ).toBeTruthy()

    await user.type(
      screen.getByLabelText('Motivo del rechazo'),
      'NIT no coincide',
    )
    await user.click(screen.getByRole('button', { name: 'Confirmar rechazo' }))

    const feedback = await screen.findByText(
      /no se publica en el catálogo/i,
    )
    expect(feedback.textContent).toMatch(/sigue activa/i)
    expect(feedback.textContent).not.toMatch(/no podrá iniciar sesión/i)
  })

  it('la recarga manual también invalida la caché canónica', async () => {
    const fetchMock = vi.fn(
      async (input: RequestInfo | URL, _init?: RequestInit) => {
        const url = String(input)
        if (url.endsWith('/review')) {
          return jsonResponse(
            { status: 409, code: 'INVALID_STATUS_TRANSITION', detail: 'x' },
            409,
          )
        }
        return jsonResponse(pageOf([GUIDE], 25, 3))
      },
    )
    vi.stubGlobal('fetch', fetchMock)

    const user = userEvent.setup()
    renderQueue()

    await screen.findByText('Ana Guía')
    await user.click(screen.getByRole('button', { name: 'Aprobar' }))
    await screen.findByText(/no es válida con el estado actual/i)

    await user.click(
      screen.getByRole('button', { name: 'Vuelve a cargar la lista' }),
    )
    await waitFor(() => {
      expect(String(fetchMock.mock.calls.at(-1)?.[0])).toContain('_=')
    })

    await user.click(screen.getByRole('button', { name: 'Página siguiente' }))
    await waitFor(() => {
      expect(String(fetchMock.mock.calls.at(-1)?.[0])).toContain('page=1')
    })

    await user.click(screen.getByRole('button', { name: 'Página anterior' }))
    await waitFor(() => {
      // Si la clave canónica siguiera cacheada, no habría petición nueva.
      expect(String(fetchMock.mock.calls.at(-1)?.[0])).toContain('page=0')
    })
  })

  it('se recoloca si la página pedida ya no existe (la vació otra gestora)', async () => {
    const rows = (from: number) =>
      Array.from({ length: 10 }, (_, index) => ({
        ...GUIDE,
        id: `reg-${from + index}`,
        fullName: `Guía ${from + index}`,
        email: `guia${from + index}@correo.com`,
      }))

    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url.endsWith('/review')) {
        return new Response(null, { status: 204 })
      }
      const page = Number(
        new URL(url, 'http://localhost').searchParams.get('page'),
      )
      if (page >= 2) {
        // Otra gestora vació la cola: el total bajó a una sola página.
        return jsonResponse({
          content: [],
          page: 2,
          size: 10,
          total: 10,
          totalPages: 1,
        })
      }
      return jsonResponse({
        content: rows(page * 10 + 1),
        page,
        size: 10,
        total: 30,
        totalPages: 3,
      })
    })
    vi.stubGlobal('fetch', fetchMock)

    const user = userEvent.setup()
    renderQueue()

    await screen.findByText('Guía 1')
    await user.click(screen.getByRole('button', { name: 'Página siguiente' }))
    await screen.findByText('Guía 11')
    await user.click(screen.getByRole('button', { name: 'Página siguiente' }))

    // El backend ya no tiene página 2: la pantalla vuelve a la última válida.
    expect(await screen.findByText('Guía 1')).toBeTruthy()
    expect(screen.queryByText('No hay guías pendientes de revisión.')).toBeNull()
    const requested = fetchMock.mock.calls.map(([url]) => String(url))
    expect(requested.some((url) => url.includes('page=0'))).toBe(true)
    expect(requested.some((url) => url.includes('page=2'))).toBe(true)
  })

  it('si decide la única fila de la última página vuelve a la anterior sin quedar vacía', async () => {
    const guides = Array.from({ length: 10 }, (_, index) => ({
      ...GUIDE,
      id: `reg-${index}`,
      fullName: `Guía ${index + 1}`,
      email: `guia${index + 1}@correo.com`,
    }))
    const lastGuide = {
      ...GUIDE,
      id: 'reg-11',
      fullName: 'Guía Última',
      email: 'ultima@correo.com',
    }

    const fetchMock = vi.fn(
      async (input: RequestInfo | URL, _init?: RequestInit) => {
        const url = String(input)
        if (url.endsWith('/review')) {
          return new Response(null, { status: 204 })
        }
        const page = new URL(url, 'http://localhost').searchParams.get('page')
        return jsonResponse(
          pageOf(page === '1' ? [lastGuide] : guides, 11, 2),
        )
      },
    )
    vi.stubGlobal('fetch', fetchMock)

    const user = userEvent.setup()
    renderQueue()

    await screen.findByText('Guía 1')
    await user.click(screen.getByRole('button', { name: 'Página siguiente' }))
    await screen.findByText('Guía Última')

    await user.click(screen.getByRole('button', { name: 'Aprobar' }))

    await screen.findByText(/aprobada\. Puede llegar un aviso/i)
    await waitFor(() => {
      const urls = fetchMock.mock.calls.map(([url]) => String(url))
      expect(urls.at(-1)).toContain('page=0')
    })
    expect(await screen.findByText('Guía 1')).toBeTruthy()
    expect(screen.queryByText('No hay guías pendientes de revisión.')).toBeNull()
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
    expect(
      screen.getByRole('button', { name: 'Vuelve a cargar la lista' }),
    ).toBeTruthy()
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
